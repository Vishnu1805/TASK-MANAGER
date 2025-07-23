// Login.tsx
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
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState(''); // For login (now email)
  const [name, setName] = useState(''); // For register
  const [email, setEmail] = useState(''); // For register
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (isRegister) {
      if (!name.trim() || !email.trim() || !password.trim()) {
        Alert.alert('Error', 'Please fill out all fields.');
        return;
      }
      setLoading(true);
      const success = await register(name, email, password);
      setLoading(false);
      if (success) {
        router.replace('/');
      } else {
        Alert.alert('Registration Failed', 'Could not create account.');
      }
    } else {
      if (!identifier.trim() || !password.trim()) {
        Alert.alert('Error', 'Please fill out both fields.');
        return;
      }
      setLoading(true);
      const success = await login(identifier, password); 
      setLoading(false);
      if (success) {
        router.replace('/Task'); // Redirect to Task list on successful login
      } else {
        Alert.alert('Login Failed', 'Invalid credentials.');
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
      <Pressable
        onPress={handleSubmit}
        style={styles.button}
        disabled={loading}
      >
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