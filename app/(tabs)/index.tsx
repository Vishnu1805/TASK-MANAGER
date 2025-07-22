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
  const { tasks, toggleTask, deleteTask } = useTasks();
  const router = useRouter();

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

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, item.done && styles.done]}>
                {item.title}
              </Text>
              <Text style={styles.assignee}>
                Assigned to: {item.assigneeId}
              </Text>
            </View>

            <View style={styles.buttons}>
              <Pressable
                onPress={() => toggleTask(item.id)}
                style={styles.doneButton}
              >
                <Text style={styles.buttonText}>
                  {item.done ? 'Undo' : 'Done'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleEdit(item.id)}
                style={styles.editButton}
              >
                <Text style={styles.buttonText}>Edit</Text>
              </Pressable>

              <Pressable
                onPress={() => handleDelete(item.id)}
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
