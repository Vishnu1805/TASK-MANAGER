// app/(tabs)/Add.tsx
import { useAuth } from '@/hooks/useAuth';
import { User, useTasks } from '@/hooks/useTasks';
import { useFocusEffect } from '@react-navigation/native';
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
import DateTimePickerModal from 'react-native-modal-datetime-picker';

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

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          await fetchUsers();
          console.log('Fetched users:', users.map(u => ({ id: u._id, name: u.name })));
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
    console.log('Filtered users:', newFilteredUsers.map(u => u._id), 'assignees:', assignees);
  }, [search, users, assignees]);

  const toggleAssignee = (id: string) => {
    if (!id) return;
    setAssignees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setSearch('');
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
      console.log('Adding task - Input:', { title, assignees, userId: currentUser?._id });
      const response = await addTask(title, description, priority, dueDateStr, assignees); // Capture response
      console.log('Task created - Response:', response); // Log the created task
      router.back();
    } catch (e: any) {
      console.warn('Task creation failed:', e.message);
      Alert.alert('Error', e.message || 'Failed to create task.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TextInput
        placeholder="Task Title"
        style={styles.input}
        value={title}
        onChangeText={setTitle}
      />
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
          <DateTimePickerModal
            isVisible={showPicker}
            mode="date"
            onConfirm={date => {
              setShowPicker(false);
              setSelectedDate(date);
            }}
            onCancel={() => setShowPicker(false)}
          />
        </>
      )}
      <Text style={styles.label}>Assign to:</Text>
      <TextInput
        placeholder="Type name..."
        style={styles.input}
        value={search}
        onChangeText={setSearch}
      />
      {filteredUsers.length > 0 && (
        <FlatList
          data={filteredUsers}
          keyExtractor={u => u._id}
          style={styles.suggestions}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => toggleAssignee(item._id)}
            >
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
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
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