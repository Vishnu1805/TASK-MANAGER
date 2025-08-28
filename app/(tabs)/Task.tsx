

// app/(tabs)/Task.tsx
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

export default function TaskListScreen() {
  const { tasks, users, deleteTask, fetchTasks, loadingTasks, updateTask } = useTasks();
  const { currentUser } = useAuth();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string>('');
  const snackAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        try {
          await fetchTasks();
          console.log('Tasks fetched for user:', currentUser?._id || 'none');
        } catch (e) {
          console.warn('Fetch tasks failed:', e);
        }
      })();
    }, [fetchTasks, currentUser])
  );

  const usersMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    (users || []).forEach(u => {
      const id = (u as any)._id ?? (u as any).id ?? '';
      if (id) {
        map[id] = (u as any).name ?? 'Unknown';
      }
    });
    return map;
  }, [users]);

  const userTasks = React.useMemo(() => {
    if (!currentUser?._id) {
      console.log('No user ID, showing no tasks');
      return [];
    }
    const matches = (tasks || []).filter(t => {
      const assigneeIds = Array.isArray(t.assignees)
        ? t.assignees.map(a => (typeof a === 'string' ? a : (a as any)?._id ?? String(a))).filter(id => id)
        : [];
      const isAssigned = assigneeIds.includes(currentUser._id);
      console.log(`Task ${t._id}: assignees=${JSON.stringify(assigneeIds)}, currentUser=${currentUser._id}, isAssigned=${isAssigned}`);
      return isAssigned;
    });
    console.log('Filtered tasks:', matches.length, 'for user:', currentUser._id);
    return matches;
  }, [tasks, currentUser]);

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
    } catch (e) {
      console.warn('Delete task failed:', e);
      showSnackbar('Failed to delete');
    }
    setModalVisible(false);
  };

  // Existing Done toggle: pending <-> completed
  const handleToggle = async (id: string, currentStatus: string) => {
    try {
      console.log('Toggling task:', { id, currentStatus });

      const validStatuses = ['pending', 'completed'] as const;
      const safeCurrentStatus = validStatuses.includes(currentStatus as any) ? currentStatus : 'pending';
      const newStatus = safeCurrentStatus === 'completed' ? 'pending' : 'completed';

      console.log('New status to set:', newStatus);

      await updateTask(id, { status: newStatus });
      await fetchTasks();
      showSnackbar(`Task marked as ${newStatus}`);
    } catch (e) {
      console.warn('Toggle task failed:', e);
      showSnackbar('Failed to update status');
    }
  };

  // NEW: set status to in-progress
  const handleSetInProgress = async (id: string) => {
    try {
      console.log('Setting task to in-progress:', id);
      await updateTask(id, { status: 'in-progress' });
      await fetchTasks();
      showSnackbar('Task moved to in-progress');
    } catch (e) {
      console.warn('Set in-progress failed:', e);
      showSnackbar('Failed to move to in-progress');
    }
  };

  const renderRightActions = (progress: any, dragX: any, id: string) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <Pressable onPress={() => confirmDelete(id)} style={styles.deleteAction}>
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>🗑️ Delete</Animated.Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#222' }}>Tasks</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={() => router.push('/(tabs)/Kanban')}>
            <Text style={{ color: '#222' }}>Kanban</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/Analytics')}>
            <Text style={{ color: '#222' }}>Analytics</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={userTasks}
        keyExtractor={item => String(item._id ?? item.id ?? Math.random())}
        renderItem={({ item }) => {
          const assigneeNames = (item.assignees || [])
            .map(a => {
              const id = typeof a === 'string' ? a : (a as any)?._id ?? String(a);
              return usersMap[id] || id;
            })
            .filter(Boolean)
            .join(', ');
          return (
            <Swipeable renderRightActions={(p, d) => renderRightActions(p, d, item._id)}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, item.status === 'completed' && styles.done]}>
                    {item.title}
                  </Text>
                  <Text style={styles.meta}>Priority: {item.priority || 'Unknown'}</Text>
                  <Text style={styles.meta}>
                    Due: {item.dueDate ? new Date(item.dueDate).toDateString() : '—'}
                  </Text>
                  <Text style={styles.meta}>Assignees: {assigneeNames || 'None'}</Text>
                </View>
                <View style={styles.buttons}>
                  {/* In Progress button: only show when not already in-progress */}
                  {item.status !== 'in-progress' && (
                    <Pressable
                      onPress={() => handleSetInProgress(item._id)}
                      style={[styles.btn, styles.inProgressBtn]}
                    >
                      <Text style={styles.btnText}>In Progress</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => handleToggle(item._id, item.status || 'pending')}
                    style={[styles.btn, styles.doneBtn]}
                  >
                    <Text style={styles.btnText}>{item.status === 'completed' ? 'Undo' : 'Done'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/Edit?id=${item._id}`)}
                    style={[styles.btn, styles.editBtn]}
                  >
                    <Text style={styles.btnText}>Edit</Text>
                  </Pressable>
                </View>
              </View>
            </Swipeable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>{loadingTasks ? 'Loading tasks...' : 'No tasks assigned to you'}</Text>
        }
        refreshing={loadingTasks}
        onRefresh={fetchTasks}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/(tabs)/Add')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Delete this task?</Text>
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalBtnCancel}>
                <Text>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.modalBtnDelete}>
                <Text style={styles.modalBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {snackbar ? (
        <Animated.View style={[styles.snackbar, { opacity: snackAnim }]}>
          <Text style={styles.snackbarText}>{snackbar}</Text>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  row: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#333' },
  done: { textDecorationLine: 'line-through', color: '#888' },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  buttons: { flexDirection: 'row', gap: 12, marginLeft: 12, alignItems: 'center' },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 3,
  },
  doneBtn: { backgroundColor: '#28a745', borderColor: '#218838', borderWidth: 1 },
  // new In Progress style
  inProgressBtn: { backgroundColor: '#ff9800', borderColor: '#ef6c00', borderWidth: 1 },
  editBtn: { backgroundColor: '#007bff', borderColor: '#0056b3', borderWidth: 1 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deleteAction: {
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 20,
    borderRadius: 8,
  },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#28a745',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalText: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center', color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtnCancel: { padding: 12, borderRadius: 6, borderColor: '#ccc', borderWidth: 1 },
  modalBtnDelete: { backgroundColor: '#dc3545', padding: 12, borderRadius: 6 },
  modalBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  snackbar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  snackbarText: { color: '#fff', textAlign: 'center', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
});