// app/(tabs)/Task.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useTasks } from '../../hooks/useTasks';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TaskListScreen() {
  const { tasks, users, toggleTask, deleteTask, fetchTasks } = useTasks();
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

  const [snackbar, setSnackbar] = useState<string>('');
  const snackAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    (async () => {
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      setCurrentUserId(user?.id || null);
    })();
  }, []);

  const getAssigneeNames = (assigneeIds: string[]) =>
    assigneeIds.map(id => {
      const user = users.find(u => u.id === id);
      return user ? user.name : 'Unknown';
    }).join(', ');

  const showSnackbar = (message: string) => {
    setSnackbar(message);
    Animated.timing(snackAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(snackAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 3000);
    });
  };

  const confirmDelete = (id: string) => {
    setToDeleteId(id);
    setModalVisible(true);
  };

  const handleDelete = async () => {
    if (!toDeleteId) return;
    try {
      await deleteTask(toDeleteId);
      await fetchTasks();
      showSnackbar('Task deleted');
    } catch (err) {
      console.error('Delete error:', err);
      showSnackbar('Failed to delete');
    }
    setModalVisible(false);
    setToDeleteId(null);
  };

  const handleEdit = (id: string) => {
    router.push(`/Edit?id=${id}`);
  };

  const handleToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await toggleTask(id, newStatus as 'pending' | 'completed');
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    id: string
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-SCREEN_WIDTH, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <Pressable onPress={() => confirmDelete(id)} style={styles.deleteAction}>
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
          🗑️ Delete
        </Animated.Text>
      </Pressable>
    );
  };

  const userTasks = tasks.filter(
    t => currentUserId && (t.userId === currentUserId || t.assignees.includes(currentUserId))
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={userTasks}
        keyExtractor={(item) => {
          if (!item._id) {
            console.warn('⚠️ Missing _id on task:', item);
            return Math.random().toString(); // fallback
          }
          return item._id;
        }}
        renderItem={({ item }) => (
          <Swipeable renderRightActions={(prog, dragX) => renderRightActions(prog, dragX, item._id)}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, item.status === 'completed' && styles.done]}>
                  {item.title}
                </Text>
                <Text style={styles.meta}>Priority: {item.priority}</Text>
                <Text style={styles.meta}>
                  Due: {item.dueDate ? new Date(item.dueDate).toDateString() : '—'}
                </Text>
                <Text style={styles.meta}>Assignees: {getAssigneeNames(item.assignees)}</Text>
              </View>
              <View style={styles.buttons}>
                <Pressable onPress={() => handleToggle(item._id, item.status)} style={styles.btn}>
                  <Text style={styles.btnText}>
                    {item.status === 'completed' ? 'Undo' : 'Done'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleEdit(item._id)} style={styles.btn}>
                  <Text style={styles.btnText}>Edit</Text>
                </Pressable>
              </View>
            </View>
          </Swipeable>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20 }}>No tasks</Text>
        }
      />

      <Pressable
        style={styles.fab}
        onPress={async () => {
          await fetchTasks();
          router.push('/(tabs)/Add');
        }}
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      {/* Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Delete this task?</Text>
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalBtnCancel}>
                <Text>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.modalBtnDelete}>
                <Text style={{ color: '#fff' }}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Snackbar */}
      {snackbar ? (
        <Animated.View style={[styles.snackbar, { opacity: snackAnim }]}>
          <Text style={styles.snackbarText}>{snackbar}</Text>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  row: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  title: { fontSize: 16, fontWeight: '600' },
  done: { textDecorationLine: 'line-through', color: '#999' },
  meta: { fontSize: 12, color: '#555', marginTop: 4 },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  btn: {
    backgroundColor: '#4CAF50',
    padding: 6,
    borderRadius: 4,
  },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  deleteAction: {
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 20,
  },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#4CAF50',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 8,
    elevation: 4,
  },
  modalText: { fontSize: 18, marginBottom: 16, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtnCancel: {
    padding: 12,
  },
  modalBtnDelete: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 4,
  },
  snackbar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
  },
  snackbarText: { color: '#fff', textAlign: 'center' },
});