// app/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

export default function RootLayout() {
  const { currentUser } = useAuth();

  return (
    <Stack>
      {/*
        If not logged in, show Login first (no header).
      */}
      {!currentUser ? (
        <Stack.Screen
          name="Login"
          options={{ headerShown: false }}
        />
      ) : null}

      {/*
        Once authenticated, the rest of the app:
        index → add → Edit
      */}
      <Stack.Screen
        name="index"
        options={{ title: 'Tasks' }}
      />
      <Stack.Screen
        name="add"
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
