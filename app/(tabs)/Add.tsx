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
import { useTasks } from '../../hooks/useTasks';

export default function AddTaskScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'medium' | 'low'>('medium');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [assignees, setAssignees] = useState<string[]>([]);
  const { addTask, users, fetchUsers } = useTasks();
  const router = useRouter();

  useEffect(() => {
    fetchUsers(''); // Fetch users when the component mounts
  }, [fetchUsers]);

  const toggleAssignee = (id: string) => {
    setAssignees(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const onDateChange = (event: React.ChangeEvent<HTMLInputElement> | any) => {
    const date = event.target ? new Date(event.target.value) : new Date(event.nativeEvent.timestamp);
    setSelectedDate(date);
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required.');
      return;
    }
    const dueDateStr = selectedDate?.toISOString().split('T')[0] || '';
    await addTask(title, description, priority, dueDateStr, assignees);
    Alert.alert('Success', 'Task assigned!');
    router.replace('/(tabs)/Task');
  };

  const renderUser = ({ item }: { item: { id: string; name: string } }) => {
    const selected = assignees.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.userItem, selected && styles.userItemSelected]}
        onPress={() => toggleAssignee(item.id)}
      >
        <Text style={styles.userName}>{item.name}</Text>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Title & Description */}
      <TextInput
        style={styles.input}
        placeholder="Task Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
      />

      {/* Priority */}
      <Text style={styles.label}>Priority:</Text>
      <View style={styles.statusContainer}>
        {(['urgent', 'medium', 'low'] as const).map(level => (
          <Pressable
            key={level}
            style={[
              styles.statusBtn,
              priority === level && styles.statusBtnSelected,
            ]}
            onPress={() => setPriority(level)}
          >
            <Text style={styles.statusText}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Due Date */}
      <Text style={styles.label}>Due Date:</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          style={styles.webInput}
          value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
          onChange={onDateChange}
          min={new Date().toISOString().split('T')[0]}
        />
      ) : (
        <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
          <Text style={styles.input}>
            {selectedDate ? selectedDate.toDateString() : 'Select a date'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Assignees */}
      <Text style={styles.label}>Assign to:</Text>
      <FlatList
        data={users}
        keyExtractor={u => u.id}
        renderItem={renderUser}
        horizontal
        contentContainerStyle={{ paddingVertical: 8 }}
      />

      {/* Add Button */}
      <Pressable style={styles.button} onPress={handleAdd}>
        <Text style={styles.buttonText}>Add Task</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  webInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
    width: '100%',
  },
  label: { fontSize: 16, marginBottom: 8, fontWeight: '500' },
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statusBtn: {
    flex: 1,
    padding: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBtnSelected: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  statusText: { fontSize: 14, fontWeight: '500' },
  userItem: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userItemSelected: { backgroundColor: '#4CAF50' },
  userName: { color: '#000', marginRight: 5 },
  checkMark: { color: '#fff', fontWeight: 'bold' },
  button: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});