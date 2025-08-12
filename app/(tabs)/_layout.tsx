// app/tabs/_layout.tsx
import { useAuth } from '@/hooks/useAuth';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TabsLayout() {
  const { currentUser } = useAuth();

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="Task" options={{ title: 'Tasks' }} />
        <Stack.Screen name="Add" options={{ title: 'Add Task' }} />
        <Stack.Screen
          name="Edit"
          options={{ title: 'Edit Task', presentation: 'modal' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});