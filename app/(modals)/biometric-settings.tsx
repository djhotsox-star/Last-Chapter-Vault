import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

export default function BiometricSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsAvailable(compatible);

      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsEnrolled(enrolled);

        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Touch ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('Iris');
        }

        // Check if user previously enabled biometrics
        const savedPref = await AsyncStorage.getItem('biometric_enabled');
        setIsEnabled(savedPref === 'true');
      }
    } catch (error) {
      console.error('Biometric check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (value: boolean) => {
    if (value) {
      // Verify biometric first
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${biometricType} for Last Chapter Vault`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await AsyncStorage.setItem('biometric_enabled', 'true');
        setIsEnabled(true);
        Alert.alert('Enabled', `${biometricType} authentication is now active for Last Chapter Vault.`);
      } else {
        Alert.alert('Failed', 'Biometric verification failed. Please try again.');
      }
    } else {
      await AsyncStorage.setItem('biometric_enabled', 'false');
      setIsEnabled(false);
      Alert.alert('Disabled', `${biometricType} authentication has been turned off.`);
    }
  };

  const handleTestBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify your identity',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      Alert.alert('Success', `${biometricType} verification passed!`);
    } else {
      Alert.alert('Failed', result.error || 'Verification failed');
    }
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><View style={styles.loading}><ActivityIndicator size="large" color="#4A90E2" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biometric Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Icon */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Ionicons name={biometricType === 'Face ID' ? 'scan' : 'finger-print'} size={48} color="#4A90E2" />
          </View>
          <Text style={styles.biometricName}>{biometricType}</Text>
          <Text style={styles.biometricDesc}>
            {isAvailable
              ? isEnrolled
                ? `Your device supports ${biometricType}. Enable it to add an extra layer of security.`
                : `${biometricType} hardware detected but no biometrics enrolled. Please set up ${biometricType} in your device settings first.`
              : 'Biometric authentication is not available on this device. It requires a physical device with Face ID or Touch ID.'}
          </Text>
        </View>

        {isAvailable && isEnrolled && (
          <>
            {/* Enable Toggle */}
            <View style={styles.toggleCard}>
              <View style={styles.toggleInfo}>
                <View style={styles.toggleHeader}>
                  <Ionicons name="lock-closed" size={20} color="#4A90E2" />
                  <Text style={styles.toggleLabel}>App Lock with {biometricType}</Text>
                </View>
                <Text style={styles.toggleDesc}>
                  Require {biometricType} verification when opening Last Chapter Vault
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={handleToggle}
                trackColor={{ false: '#30363D', true: '#4A90E240' }}
                thumbColor={isEnabled ? '#4A90E2' : '#8B949E'}
              />
            </View>

            {/* Test Button */}
            {isEnabled && (
              <TouchableOpacity style={styles.testBtn} onPress={handleTestBiometric}>
                <Ionicons name={biometricType === 'Face ID' ? 'scan' : 'finger-print'} size={20} color="#4CAF50" />
                <Text style={styles.testBtnText}>Test {biometricType}</Text>
              </TouchableOpacity>
            )}

            {/* Security Info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Security Details</Text>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.infoText}>Biometric data never leaves your device</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.infoText}>Works alongside your password</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.infoText}>Falls back to device passcode if {biometricType} fails</Text>
              </View>
            </View>
          </>
        )}

        {(!isAvailable || !isEnrolled) && (
          <View style={styles.unavailableCard}>
            <Ionicons name="alert-circle" size={24} color="#FF9800" />
            <Text style={styles.unavailableText}>
              {!isAvailable
                ? 'Biometric authentication requires a physical mobile device with Face ID or Touch ID support. It is not available in web browsers.'
                : `No biometrics enrolled. Go to Settings > ${Platform.OS === 'ios' ? 'Face ID & Passcode' : 'Security'} to set up ${biometricType}.`}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1419' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  scrollContent: { padding: 20, gap: 16 },
  iconSection: { alignItems: 'center', marginBottom: 8 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#4A90E220', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  biometricName: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  biometricDesc: { fontSize: 14, color: '#8B949E', textAlign: 'center', lineHeight: 20 },
  toggleCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C2128', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#30363D' },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  toggleDesc: { fontSize: 13, color: '#8B949E' },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF5015', borderRadius: 12, paddingVertical: 14, gap: 8, borderWidth: 1, borderColor: '#4CAF50' },
  testBtnText: { fontSize: 15, fontWeight: '600', color: '#4CAF50' },
  infoCard: { backgroundColor: '#1C2128', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#30363D', gap: 12 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#8B949E', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: '#FFFFFF', flex: 1 },
  unavailableCard: { flexDirection: 'row', backgroundColor: '#1C2128', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: '#FF9800' },
  unavailableText: { flex: 1, fontSize: 14, color: '#8B949E', lineHeight: 20 },
});
