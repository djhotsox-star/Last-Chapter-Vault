import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Check if user is verified
        if (user.is_verified) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/verify-otp');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, isAuthenticated, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Ionicons name="shield-checkmark" size={80} color="#4A90E2" />
        <Text style={styles.title}>Last Chapter Vault</Text>
        <Text style={styles.subtitle}>Secure Digital Will & Document Vault</Text>
      </View>
      <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 8,
  },
  loader: {
    marginTop: 32,
  },
});
