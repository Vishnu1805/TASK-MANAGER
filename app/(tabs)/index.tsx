import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';

export default function HomeScreen() {
  const { tasks, toggleTask } = useTasks();
  const { currentUser, users, logout } = useAuth();

  if (!currentUser) {
    return null; // or a loading indicator
  }

  const getAssigneeName = (assigneeId: string) => {
    const user = users.find(u => u.id === assigneeId);
    return user ? user.username : 'Unknown';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Task List</Text>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.taskItem,
              item.done && styles.taskDoneBackground,
            ]}
          >
            <Text
              style={[
                styles.taskText,
                item.done && styles.taskDoneText,
              ]}
            >
              {item.title} (Assigned to: {getAssigneeName(item.assigneeId)})
            </Text>
            <Pressable
              onPress={() => toggleTask(item.id)}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>
                {item.done ? 'Undo' : 'Done'}
              </Text>
            </Pressable>
          </View>
        )}
      />
      <Pressable onPress={logout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  taskDoneBackground: {
    backgroundColor: '#e0e0e0',
  },
  taskText: {
    fontSize: 16,
    flex: 1,
  },
  taskDoneText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  button: {
    padding: 8,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  buttonPressed: {
    backgroundColor: '#1976D2',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});