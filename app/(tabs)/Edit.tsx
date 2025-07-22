// app/Edit.tsx
import React, { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTasks } from '../../hooks/useTasks';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tasks, updateTask } = useTasks();
  const { users } = useAuth();

  const task = tasks.find((t) => t.id === id);
  const [title, setTitle] = useState(task?.title ?? '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');

  useEffect(() => {
    if (!task) {
      // invalid id → back to list
      router.replace('/');
    }
  }, [task]);

  const handleUpdate = () => {
    if (!task) return;
    if (!title.trim() || !assigneeId) {
      Alert.alert('Error', 'Please fill out both fields.');
      return;
    }
    updateTask(task.id, { title, assigneeId });
    Alert.alert('Success', 'Task updated!');
    router.replace('/');
  };

  if (!task) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Task</Text>
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
        {users.map((u) => (
          <Picker.Item
            key={u.id}
            label={u.username}
            value={u.id}
          />
        ))}
      </Picker>
      <Pressable onPress={handleUpdate} style={styles.button}>
        <Text style={styles.buttonText}>Save Changes</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
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
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
