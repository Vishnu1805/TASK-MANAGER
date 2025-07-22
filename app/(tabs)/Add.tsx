// app/add.tsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  Alert,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useTasks } from '../../hooks/useTasks';
import { useAuth, User } from '../../hooks/useAuth';

export default function AddTaskScreen() {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const { addTask } = useTasks();
  const { users } = useAuth();
  const router = useRouter();

  const handleAdd = () => {
    if (!title.trim() || !assigneeId) {
      Alert.alert('Error', 'Please fill out both fields.');
      return;
    }
    addTask(title, assigneeId);
    Alert.alert('Success', 'Task added!');
    // Replace current screen with Tasks list
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Task Title"
        value={title}
        onChangeText={setTitle}
      />
      <Picker
        selectedValue={assigneeId}
        onValueChange={setAssigneeId}
        style={styles.picker}
      >
        <Picker.Item label="Select Assignee" value="" />
        {users.map((u: User) => (
          <Picker.Item key={u.id} label={u.username} value={u.id} />
        ))}
      </Picker>
      <Pressable onPress={handleAdd} style={styles.button}>
        <Text style={styles.buttonText}>Add Task</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
