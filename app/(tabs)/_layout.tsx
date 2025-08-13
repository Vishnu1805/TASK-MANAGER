import { AuthProvider } from '@/hooks/useAuth';
import { TasksProvider } from '@/hooks/useTasks';
import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TabsLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <TasksProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="Task" options={{ title: 'Tasks' }} />
            <Stack.Screen name="Add" options={{ title: 'Add Task' }} />
            <Stack.Screen name="Edit" options={{ title: 'Edit Task', presentation: 'modal' }} />
          </Stack>
        </TasksProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});