// app/(tabs)/Add.tsx
import { useAuth } from '@/hooks/useAuth';
import { User, useTasks } from '@/hooks/useTasks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AddTaskScreen() {
  const router = useRouter();
  const { users, fetchUsers, addTask } = useTasks();
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'medium' | 'low'>('medium');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<{ name: string; objectName: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          await fetchUsers();
        } catch (e) {
          console.warn('Fetch users failed:', e);
        }
      })();
    }, [fetchUsers])
  );

  useEffect(() => {
    const lower = search.toLowerCase();
    const newFilteredUsers = users.filter(
      u => (u.name ?? '').toLowerCase().includes(lower) && !assignees.includes(u._id)
    );
    setFilteredUsers(newFilteredUsers);
  }, [search, users, assignees]);

  const toggleAssignee = (id: string) => {
    if (!id) return;
    setAssignees(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    setSearch('');
  };

  // Robust DocumentPicker result parsing + upload
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
      // Normalize result to an array of file objects
      let files: any[] = [];
      // Newer Expo docpicker may return { canceled: false, output: [ ... ] } or { canceled: false, assets: [...] }
      // Some versions return a single file { type: 'success', name, uri, size, mimeType }
      if (!result) return;
      // handle legacy shapes
      if ((result as any).canceled === true) {
        return;
      }
      if (Array.isArray((result as any).output)) {
        files = (result as any).output;
      } else if (Array.isArray((result as any).assets)) {
        files = (result as any).assets;
      } else if ((result as any).uri && !(result as any).canceled) {
        // single-file response
        files = [result];
      } else if (Array.isArray(result)) {
        files = result;
      } else {
        // fallback: try to find assets/output fields
        const r = result as any;
        const maybe = r.output ?? r.assets ?? (r.files ? r.files : null);
        if (Array.isArray(maybe)) files = maybe;
      }

      if (!files.length) {
        console.warn('No files returned from DocumentPicker:', result);
        return;
      }

      setUploading(true);
      for (const file of files) {
        // normalize fields
        const name = file.name || file.filename || `file-${Date.now()}`;
        const type = file.mimeType || file.type || file.mime || 'application/octet-stream';
        const uri = file.uri || file.uriLocal || file.fileUri;
        if (!uri) {
          console.warn('Picked file missing uri:', file);
          continue;
        }

        console.log('Uploading file:', { uri, name, type });
        try {
          const { objectName } = await uploadFile(uri, name, type);
          if (objectName) {
            setAttachments(prev => [...prev, { name, objectName }]);
          }
        } catch (err) {
          console.warn('Upload failed for', name, err);
          Alert.alert('Upload failed', `Failed to upload ${name}: ${(err as any)?.message || err}`);
        }
      }
    } catch (e) {
      console.warn('File pick failed:', e);
      Alert.alert('Error', 'Failed to pick file');
    } finally {
      setUploading(false);
    }
  };

  // Remove an attachment
  const removeAttachment = (objectName: string) => {
    setAttachments(prev => prev.filter(att => att.objectName !== objectName));
  };

  // Upload file to MinIO using presigned URL
 const uploadFile = async (uri: string, name: string, type: string): Promise<{ objectName: string }> => {
  const token = await AsyncStorage.getItem('token'); // 👈 add this
  const serverUrl = 'http://192.168.1.3:3000/api/upload/sign?filename=' + encodeURIComponent(name);

  const signRes = await fetch(serverUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!signRes.ok) {
    const errText = await signRes.text();
    throw new Error(`Failed to get presigned URL: ${signRes.status} ${errText}`);
  }

  const { uploadUrl, objectName } = await signRes.json();

  if (Platform.OS === 'web' && uri.startsWith('data:')) {
    const base64Data = uri.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type });

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': type },
    });

    if (!uploadRes.ok) throw new Error('Upload failed');
  } else {
    const { default: FileSystem } = await import('expo-file-system');
    const uploadRes = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': type },
    });

    if (uploadRes.status !== 200) throw new Error('Upload failed');
  }

  return { objectName };
};

  const handleAdd = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required.');
      return;
    }
    if (!assignees.length) {
      Alert.alert('Error', 'At least one assignee is required.');
      return;
    }

    const dueDateStr = selectedDate ? selectedDate.toISOString() : null;

    try {
      console.log('Adding task - Input:', { title, description, priority, dueDateStr, assignees, attachments });
      const response = await addTask(title, description, priority, dueDateStr, assignees, attachments);
      console.log('Task created - Response:', response);
      router.replace('/Task');
    } catch (e: any) {
      console.warn('Task creation failed:', e.message || e);
      Alert.alert('Error', e.message || 'Failed to create task.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TextInput placeholder="Task Title" style={styles.input} value={title} onChangeText={setTitle} />
      <TextInput
        placeholder="Description"
        style={[styles.input, { height: 80 }]}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Priority:</Text>
      <View style={styles.row}>
        {(['urgent', 'medium', 'low'] as const).map(level => (
          <Pressable
            key={level}
            style={[styles.statusBtn, priority === level && styles.statusBtnSelected]}
            onPress={() => setPriority(level)}
          >
            <Text style={priority === level ? styles.statusTextSelected : styles.statusText}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Due Date:</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          style={styles.webInput as any}
          value={selectedDate.toISOString().slice(0, 10)}
          onChange={e => setSelectedDate(new Date((e.target as HTMLInputElement).value))}
          min={new Date().toISOString().slice(0, 10)}
        />
      ) : (
        <>
          <Pressable onPress={() => setShowPicker(true)}>
            <Text style={styles.input}>{selectedDate.toDateString()}</Text>
          </Pressable>
          {/* keep your native date picker implementation */}
        </>
      )}

      <Text style={styles.label}>Assign to:</Text>
      <TextInput placeholder="Type name..." style={styles.input} value={search} onChangeText={setSearch} />
      {filteredUsers.length > 0 && (
        <FlatList
          data={filteredUsers}
          keyExtractor={u => u._id}
          style={styles.suggestions}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggestionItem} onPress={() => toggleAssignee(item._id)}>
              <Text style={styles.suggestionText}>
                {item.name} {item._id === currentUser?._id ? '(you)' : ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
      {assignees.length > 0 && (
        <View style={styles.chipsContainer}>
          {assignees.map(id => {
            const user = users.find(u => u._id === id);
            return (
              <View key={id} style={styles.chip}>
                <Text style={styles.chipText}>
                  {user?.name || id} {id === currentUser?._id ? '(you)' : ''}
                </Text>
                <Pressable onPress={() => toggleAssignee(id)}>
                  <Text style={styles.remove}>×</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.label}>Attachments:</Text>
      <Pressable style={styles.uploadBtn} onPress={handlePickFile} disabled={uploading}>
        <Text style={styles.uploadText}>{uploading ? 'Uploading...' : '+ Upload File'}</Text>
      </Pressable>

      {attachments.length > 0 ? (
        <View style={styles.attachList}>
          {attachments.map((att, idx) => (
            <View key={idx} style={styles.attachItem}>
              <Text style={styles.attachText}>{att.name}</Text>
              <Pressable onPress={() => removeAttachment(att.objectName)}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noAttachments}>No files selected</Text>
      )}

      <Pressable style={styles.button} onPress={handleAdd}>
        <Text style={styles.buttonText}>Add Task</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  webInput: {
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  label: { marginTop: 12, marginBottom: 4, fontWeight: '600', fontSize: 14, color: '#333' },
  row: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  statusBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  statusBtnSelected: { backgroundColor: '#28a745', borderColor: '#28a745' },
  statusText: { fontWeight: '500', color: '#333' },
  statusTextSelected: { fontWeight: '500', color: '#fff' },
  suggestions: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  suggestionText: { fontSize: 14, color: '#333' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 14, color: '#333' },
  remove: { marginLeft: 6, fontSize: 16, color: '#dc3545' },
  uploadBtn: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadText: { color: '#fff', fontWeight: '600' },
  attachList: { marginTop: 6, marginBottom: 12 },
  attachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 4,
    marginBottom: 4,
  },
  attachText: { fontSize: 13, color: '#333', flex: 1 },
  noAttachments: { fontSize: 13, color: '#666', marginBottom: 12 },
  button: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
