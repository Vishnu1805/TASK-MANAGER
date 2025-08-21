// app/(tabs)/Kanban.tsx
import { useTasks } from '@/hooks/useTasks';
import { useTheme } from '@/providers/ThemeProvider';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

let DragDropContext: any, Droppable: any, Draggable: any;
if (Platform.OS === 'web') {
  const dnd = require('@hello-pangea/dnd');
  DragDropContext = dnd.DragDropContext;
  Droppable = dnd.Droppable;
  Draggable = dnd.Draggable;
}

const COLUMN_ORDER = ['pending', 'in-progress', 'completed'];
const COLUMN_TITLES: Record<string, string> = {
  pending: 'To Do',
  'in-progress': 'In Progress',
  completed: 'Done',
};

function cloneColumnsFromTasks(tasks: any[]) {
  const cols: Record<string, any[]> = { pending: [], 'in-progress': [], completed: [] };
  (tasks || []).forEach((t: any) => {
    const s = t.status ?? 'pending';
    const key = COLUMN_ORDER.includes(s) ? s : 'pending';
    cols[key].push(t);
  });
  return cols;
}

export default function KanbanScreen() {
  const { tasks, updateTask } = useTasks();
  const router = useRouter();
  const { theme } = useTheme();
  const [localCols, setLocalCols] = useState<Record<string, any[]>>(() => cloneColumnsFromTasks(tasks || []));

  useEffect(() => {
    setLocalCols(cloneColumnsFromTasks(tasks || []));
  }, [tasks]);

  const onDragEndWeb = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;
    const sourceIndex = source.index;
    const destIndex = destination.index;

    const next: Record<string, any[]> = {
      pending: [...(localCols.pending || [])],
      'in-progress': [...(localCols['in-progress'] || [])],
      completed: [...(localCols.completed || [])],
    };

    try {
      if (sourceCol === destCol) {
        const [moved] = next[sourceCol].splice(sourceIndex, 1);
        next[sourceCol].splice(destIndex, 0, moved);
      } else {
        const [moved] = next[sourceCol].splice(sourceIndex, 1);
        const movedWithStatus = { ...(moved || {}), status: destCol };
        next[destCol].splice(destIndex, 0, movedWithStatus);
      }

      setLocalCols(next);
      await updateTask(draggableId, { status: destCol });
      if (destCol === 'completed') router.push('/(tabs)/Task');
    } catch (e) {
      console.warn('Drag update failed, reverting UI:', e);
      setLocalCols(cloneColumnsFromTasks(tasks || []));
    }
  };

  const moveTaskNative = async (taskId: string, destCol: string) => {
    try {
      setLocalCols(prev => {
        const next: Record<'pending' | 'in-progress' | 'completed', any[]> = {
          pending: [...(prev.pending || [])],
          'in-progress': [...(prev['in-progress'] || [])],
          completed: [...(prev.completed || [])],
        };
        for (const col of COLUMN_ORDER) {
          const idx = next[col as 'completed' | 'pending' | 'in-progress'].findIndex(t => String(t._id ?? t.id) === String(taskId));
          if (idx >= 0) {
            const [moved] = next[col as 'pending' | 'in-progress' | 'completed'].splice(idx, 1);
            next[destCol as 'pending' | 'in-progress' | 'completed'].push({ ...(moved || {}), status: destCol });
            break;
          }
        }
        return next;
      });

      await updateTask(taskId, { status: destCol });
      if (destCol === 'completed') router.push('/(tabs)/Task');
    } catch (e) {
      console.warn('Native move failed', e);
      setLocalCols(cloneColumnsFromTasks(tasks || []));
    }
  };

  const cardBg = theme === 'dark' ? '#222' : '#fff';
  const pageBg = theme === 'dark' ? '#121212' : '#f5f5f5';
  const textColor = theme === 'dark' ? '#eee' : '#222';

  if (Platform.OS === 'web' && DragDropContext) {
    return (
      <View style={[styles.page, { backgroundColor: pageBg }]}>
        <DragDropContext onDragEnd={onDragEndWeb}>
          <div style={{ display: 'flex', gap: 16, padding: 16 }}>
            {COLUMN_ORDER.map(colId => (
              <Droppable droppableId={colId} key={colId}>
                {(provided: any) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ background: theme === 'dark' ? '#1b1b1b' : '#eee', padding: 12, width: 320, minHeight: 400, borderRadius: 8 }}
                  >
                    <h3 style={{ marginTop: 0, color: textColor }}>{COLUMN_TITLES[colId]}</h3>
                    {(localCols[colId] || []).map((task: any, idx: number) => (
                      <Draggable draggableId={String(task._id ?? task.id)} index={idx} key={task._id ?? task.id}>
                        {(prov: any, snapshot: any) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            style={{ padding: 12, marginBottom: 8, borderRadius: 6, background: cardBg, boxShadow: snapshot.isDragging ? '0 6px 12px rgba(0,0,0,0.2)' : 'none', ...prov.draggableProps.style }}
                            onDoubleClick={() => router.push(`/Edit?id=${task._id ?? task.id}`)}
                          >
                            <strong style={{ color: textColor }}>{task.title}</strong>
                            <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{task.priority ? `Priority: ${task.priority}` : ''}</div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </View>
    );
  }

  const cols = useMemo(() => cloneColumnsFromTasks(tasks || []), [tasks]);
  return (
    <ScrollView style={[styles.page, { backgroundColor: pageBg }]}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        {COLUMN_ORDER.map(colId => (
          <View key={colId} style={[styles.col, { backgroundColor: theme === 'dark' ? '#111' : '#eee' }]}>
            <Text style={[styles.colTitle, { color: textColor }]}>{COLUMN_TITLES[colId]}</Text>
            {(cols[colId] || []).map((task: any) => (
              <Pressable
                key={String(task._id ?? task.id)}
                onPress={() => router.push(`/Edit?id=${task._id ?? task.id}`)}
                onLongPress={() => {
                  const currentIndex = COLUMN_ORDER.indexOf(colId);
                  const next = COLUMN_ORDER[(currentIndex + 1) % COLUMN_ORDER.length];
                  moveTaskNative(String(task._id ?? task.id), next);
                }}
                style={[styles.card, { backgroundColor: cardBg }]}
              >
                <Text style={{ color: textColor, fontWeight: '600' }}>{task.title}</Text>
                <Text style={{ color: '#888', marginTop: 6 }}>{task.priority ?? ''}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  col: { flex: 1, padding: 8, borderRadius: 8, minWidth: 200 },
  colTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  card: { padding: 12, marginBottom: 8, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.08, elevation: 2 },
});
