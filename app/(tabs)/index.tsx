//Index.tsx
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState(''); // Email for login
  const [name, setName] = useState(''); // For register
  const [email, setEmail] = useState(''); // For register
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const router = useRouter();

  // Basic email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (isRegister) {
      // Registration flow
      if (!name.trim() || !email.trim() || !password.trim()) {
        Alert.alert('Error', 'Please fill out all fields.');
        return;
      }
      if (!validateEmail(email)) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return;
      }
      setLoading(true);
      try {
        const success = await register(name, email, password);
        if (success) {
          router.replace('/');
        } else {
          Alert.alert('Registration Failed', 'Could not create account. Please try again.');
        }
      } catch (error: any) {
        console.error('Registration error:', error);
        Alert.alert('Error', error.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    } else {
      // Login flow
      if (!identifier.trim() || !password.trim()) {
        Alert.alert('Error', 'Please fill out both fields.');
        return;
      }
      if (!validateEmail(identifier)) {
        Alert.alert('Error', 'Please enter a valid email address.');
        return;
      }
      setLoading(true);
      try {
        console.log('Login attempt with:', { email: identifier, password });
        const success = await login(identifier, password);
        if (success) {
          console.log('Login successful');
          router.replace('/Task');
        } else {
          Alert.alert('Login Failed', 'Invalid email or password.');
        }
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.response?.status === 401) {
          Alert.alert('Login Failed', 'Unauthorized: Check your email and password.');
        } else {
          Alert.alert('Error', error.message || 'An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{isRegister ? 'Register' : 'Login'}</Text>
      {!isRegister ? (
        <>
          <TextInput
            placeholder="Email"
            autoCapitalize="none"
            value={identifier}
            onChangeText={setIdentifier}
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
        </>
      ) : (
        <>
          <TextInput
            placeholder="Name"
            autoCapitalize="none"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder="Email"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
        </>
      )}
      <Pressable onPress={handleSubmit} style={styles.button} disabled={loading}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>{isRegister ? 'Register' : 'Login'}</Text>
        )}
      </Pressable>
      <Pressable onPress={() => setIsRegister(!isRegister)}>
        <Text style={styles.switchText}>
          {isRegister ? 'Switch to Login' : 'Switch to Register'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  switchText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#2196F3',
  },
});