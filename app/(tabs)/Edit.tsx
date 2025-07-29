import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTasks } from '../../hooks/useTasks';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tasks, updateTask } = useTasks();

  const task = tasks.find((t) => t._id === id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'completed'>('pending');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(task.status);
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
      console.log('📋 Loaded task for editing:', task);
    } else if (tasks.length > 0) {
      console.warn('❌ Task not found with ID:', id);
      router.replace('/Task');
    }
  }, [task, tasks]);

  const handleUpdate = async () => {
    if (!task) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Title is required.');
      return;
    }

    const updates = {
      title,
      description,
      status,
      dueDate,
    };

    console.log('🔄 Updating task:', task._id, updates);

    await updateTask(task._id, updates);
    Alert.alert('✅ Success', 'Task updated!');
    router.replace('/Task'); // ✅ Back to task list
  };

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading Task...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Task</Text>

      <TextInput
        style={styles.input}
        placeholder="Task Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Description"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Status:</Text>
      <View style={styles.statusRow}>
        {(['pending', 'completed'] as const).map(s => (
          <Pressable
            key={s}
            style={[styles.statusBtn, status === s && styles.statusBtnSelected]}
            onPress={() => setStatus(s)}
          >
            <Text style={status === s ? styles.statusTextSelected : styles.statusText}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Due Date:</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          style={styles.webInput}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      ) : (
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={dueDate}
          onChangeText={setDueDate}
        />
      )}

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
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  webInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    width: '100%',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
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
  statusText: {
    fontWeight: '500',
  },
  statusTextSelected: {
    fontWeight: '500',
    color: '#fff',
  },
});
