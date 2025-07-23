import { Stack } from 'expo-router';
import { useAuth } from '../../hooks/useAuth'; 

export default function RootLayout() {
  const { currentUser } = useAuth();

  return (
    <Stack>
      {/* Always show index first */}
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />

      {/* Protect other screens if needed */}
      <Stack.Screen
        name="Task"
        options={{ title: 'Tasks' }}
      />
      <Stack.Screen
        name="Add"
        options={{ title: 'Add Task' }}
      />
      <Stack.Screen
        name="Edit"
        options={{
          title: 'Edit Task',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
