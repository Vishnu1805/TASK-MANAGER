import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTasks } from '../../hooks/useTasks';

export default function TaskListScreen() {
  const { tasks, users, toggleTask, deleteTask } = useTasks();
  const router = useRouter();

  const getAssigneeNames = (assigneeIds: string[]) => {
    return assigneeIds
      .map(id => users.find(u => u.id === id)?.name || 'Unknown')
      .join(', ');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTask(id),
      },
    ]);
  };

  const handleEdit = (id: string) => {
    router.push({
      pathname: '/(tabs)/Edit',
      params: { id },
    });
  };

  // Filter tasks to show only those assigned to the current user (assuming user context is available)
  const currentUserId = 'currentUserId'; // Replace with actual user ID from auth context
  const userTasks = tasks.filter(task => task.assignees.includes(currentUserId) || task.assignees.length === 0);

  return (
    <View style={styles.container}>
      <FlatList
        data={userTasks}
        keyExtractor={(t) => t._id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, item.status === 'completed' && styles.done]}>
                {item.title}
              </Text>
              <Text style={styles.priority}>Priority: {item.priority}</Text>
              <Text style={styles.dueDate}>Due: {item.dueDate || 'No due date'}</Text>
              <Text style={styles.assignee}>Assignees: {getAssigneeNames(item.assignees)}</Text>
            </View>

            <View style={styles.buttons}>
              <Pressable
                onPress={() => toggleTask(item._id)}
                style={styles.doneButton}
              >
                <Text style={styles.buttonText}>
                  {item.status === 'completed' ? 'Undo' : 'Complete'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleEdit(item._id)}
                style={styles.editButton}
              >
                <Text style={styles.buttonText}>Edit</Text>
              </Pressable>

              <Pressable
                onPress={() => handleDelete(item._id)}
                style={styles.deleteButton}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <Pressable
        style={styles.addButton}
        onPress={() => router.push('/(tabs)/Add')}
      >
        <Text style={styles.addText}>+ Add Task</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 16, fontWeight: '500' },
  done: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  priority: { fontSize: 12, color: '#666', marginTop: 4 },
  dueDate: { fontSize: 12, color: '#666', marginTop: 4 },
  assignee: { fontSize: 12, color: '#666', marginTop: 4 },
  buttons: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginLeft: 10,
    gap: 8,
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 32,
    elevation: 3,
  },
  addText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});