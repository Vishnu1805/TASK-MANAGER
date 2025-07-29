import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { User, useTasks } from '../../hooks/useTasks';

export default function AddTaskScreen() {
  const router = useRouter();
  const { users, fetchUsers, addTask } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'medium' | 'low'>('medium');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // update suggestions as user types
  useEffect(() => {
    const lower = search.toLowerCase();
    setFilteredUsers(
      users.filter(u => u.name.toLowerCase().includes(lower) && !assignees.includes(u.id))
    );
  }, [search, users, assignees]);

  const toggleAssignee = (id: string) =>
    setAssignees(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleAdd = async () => {
    if (!title.trim()) {
      return Alert.alert('Error', 'Title is required.');
    }
    const dueDateStr = selectedDate.toISOString();
    await addTask(title, description, priority, dueDateStr, assignees);
    Alert.alert('Success', 'Task created!');
    router.replace('/(tabs)/Task'); // back to list
  };

  return (
    <View style={styles.container}>
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
            <Text>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Due Date:</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          style={styles.webInput}
          value={selectedDate.toISOString().split('T')[0]}
          onChange={e => setSelectedDate(new Date(e.target.value))}
          min={new Date().toISOString().split('T')[0]}
        />
      ) : (
        <Pressable onPress={() => setSelectedDate(new Date())}>
          <Text style={styles.input}>{selectedDate.toDateString()}</Text>
        </Pressable>
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
          keyExtractor={u => u.id}
          style={styles.suggestions}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => {
                toggleAssignee(item.id);
                setSearch('');
              }}
            >
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {assignees.length > 0 && (
        <View style={styles.chipsContainer}>
          {assignees.map(id => {
            const user = users.find(u => u.id === id);
            return (
              <View key={id} style={styles.chip}>
                <Text>{user?.name || 'Unknown'}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  webInput: {
    ...Platform.select({
      web: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        fontSize: 16,
        width: '100%',
      },
    }),
  },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statusBtn: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 6,
    alignItems: 'center',
  },
  statusBtnSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  suggestions: {
    maxHeight: 120,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  remove: { marginLeft: 4, color: '#b00020', fontWeight: 'bold' },
  button: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
