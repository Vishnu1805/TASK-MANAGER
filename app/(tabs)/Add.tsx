// Add.tsx
import { User, useTasks } from '@/hooks/useTasks';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'medium' | 'low'>('medium');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [loggedUserId, setLoggedUserId] = useState<string | null>(null);

  // re-read logged-in user every time this screen is focused
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        try {
          const userJson = await AsyncStorage.getItem('user');
          const user = userJson ? JSON.parse(userJson) : null;
          const id = user?._id ?? null;
          if (mounted) setLoggedUserId(id);
          // ensure we have up-to-date users list for suggestions
          await fetchUsers();
        } catch (e) {
          console.warn('Failed to read user or fetch users on focus', e);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [fetchUsers])
  );

  // Keep filtered list updated
  useEffect(() => {
    const lower = search.toLowerCase();
    const newFilteredUsers = users.filter(
      u =>
        (u.name ?? '').toLowerCase().includes(lower) &&
        !assignees.includes(u._id)
    );
    setFilteredUsers(newFilteredUsers);
  }, [search, users, assignees]);

  const toggleAssignee = (id: string) => {
    if (!id) return;
    setAssignees(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    setSearch('');
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      return Alert.alert('Error', 'Title is required.');
    }
    if (!assignees.length) {
      return Alert.alert('Error', 'At least one assignee is required.');
    }
    const dueDateStr = selectedDate ? selectedDate.toISOString() : null;

    try {
      console.log('Submitting addTask with assignees:', assignees);
      await addTask(title, description, priority, dueDateStr as string, assignees);
      // navigate back to Task screen. Task screen will refetch on focus.
      router.back();
    } catch (error: any) {
      console.error('Task creation failed:', error);
      const msg = error?.message || 'Failed to create task.';
      Alert.alert('Error', msg);
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
            <Text>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
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
      <TextInput placeholder="Type name..." style={styles.input} value={search} onChangeText={setSearch} />

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
              <Text>
                {item.name} {item._id === loggedUserId ? '(you)' : ''}
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
                <Text>
                  {user?.name || id} {id === loggedUserId ? '(you)' : ''}
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
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 12 },
  webInput: { padding: 8, marginBottom: 12, fontSize: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  label: { marginTop: 12, marginBottom: 4, fontWeight: '600' },
  row: { flexDirection: 'row', marginBottom: 12 },
  statusBtn: { flex: 1, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: 8 },
  statusBtnSelected: { backgroundColor: '#ddd' },
  suggestions: { maxHeight: 120, borderWidth: 1, borderColor: '#ccc', marginBottom: 12 },
  suggestionItem: { padding: 8 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eee', borderRadius: 16, paddingVertical: 4, paddingHorizontal: 8, marginRight: 8, marginBottom: 8 },
  remove: { marginLeft: 4, fontSize: 16 },
  button: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
