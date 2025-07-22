import { Tabs } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import LoginScreen from './Login';

export default function TabLayout() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="add" options={{ title: 'Add Task' }} />
    </Tabs>
  );
}