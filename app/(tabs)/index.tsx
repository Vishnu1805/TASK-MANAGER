import { useAuth } from '@/hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function AuthScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const router = useRouter();

  const validateEmail = (em: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(em);
  };

  const handleSubmit = async () => {
    if (isRegister) {
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
        Alert.alert('Error', error?.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    } else {
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
        console.log('Login attempt with:', { email: identifier });
        const success = await login(identifier, password);
        if (success) {
          console.log('Login successful');
          router.replace('/Task');
        } else {
          Alert.alert('Login Failed', 'Invalid email or password.');
        }
      } catch (error: any) {
        console.error('Login error:', error);
        if (error?.response?.status === 401) {
          Alert.alert('Login Failed', 'Unauthorized: Check your email and password.');
        } else {
          Alert.alert('Error', error?.message || 'An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <LinearGradient
        colors={['#F7EFFF', '#F5D7FF', '#EDE7FF']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.background}
      >
        <View style={styles.topContainer}>
          <Text style={styles.welcomeTitle}>Welcome {isRegister ? '🙂' : '=)'}</Text>
          <Text style={styles.welcomeSubtitle}>
            {isRegister
              ? 'Create an account to get started'
              : 'Nice to see you again — login to continue'}
          </Text>
        </View>

        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>{isRegister ? 'Create Your Account' : 'Welcome Back'}</Text>

            {isRegister ? (
              <>
                <TextInput
                  placeholder="Full name"
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholderTextColor="#9b8da6"
                />
                <TextInput
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholderTextColor="#9b8da6"
                />
                <TextInput
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholderTextColor="#9b8da6"
                />
              </>
            ) : (
              <>
                <TextInput
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={identifier}
                  onChangeText={setIdentifier}
                  style={styles.input}
                  placeholderTextColor="#9b8da6"
                />
                <TextInput
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholderTextColor="#9b8da6"
                />
              </>
            )}

            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.85 },
                loading && { opacity: 0.8 },
              ]}
              disabled={loading}
            >
              <LinearGradient
                colors={['#FFB8E6', '#C9A0FF']}
                start={[0, 0]}
                end={[1, 1]}
                style={styles.primaryGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{isRegister ? 'Get Started' : 'Log In'}</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => setIsRegister(!isRegister)}
              style={{ marginTop: 14 }}
            >
              <Text style={styles.switchText}>
                {isRegister ? 'Already have an account? Log In' : "Don't have an account? Create one"}
              </Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 32,
  },
  topContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2a2132',
  },
  welcomeSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6f5f74',
    textAlign: 'center',
    maxWidth: 300,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(200,180,220,0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2a2132',
    marginBottom: 16,
    textAlign: 'left',
  },
  input: {
    backgroundColor: '#faf7fe',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(150,130,165,0.15)',
    color: '#2a2132',
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchText: {
    color: '#7b5f86',
    textAlign: 'center',
    fontWeight: '600',
  },
});