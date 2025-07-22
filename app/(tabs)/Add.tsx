import { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';

export default function AddTaskScreen() {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const { addTask } = useTasks();
  const { users } = useAuth();
  const router = useRouter();

  const handleAdd = () => {
    if (!title.trim() || !assigneeId) return;
    addTask(title, assigneeId);
    setTitle('');
    setAssigneeId('');
    router.replace("./index");
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Enter task"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <Picker
        selectedValue={assigneeId}
        onValueChange={setAssigneeId}
        style={styles.picker}
      >
        <Picker.Item label="Select Assignee" value="" />
        {users.map(user => (
          <Picker.Item key={user.id} label={user.username} value={user.id} />
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
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});