import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordChecks = [
    { label: 'At least 8 characters', valid: newPassword.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(newPassword) },
    { label: 'One number', valid: /[0-9]/.test(newPassword) },
    { label: 'Passwords match', valid: newPassword.length > 0 && newPassword === confirmPassword },
  ];
  const allValid = passwordChecks.every((c) => c.valid);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();
      if (data.dev_otp) setDevOtp(data.dev_otp);
      setStep('otp');
      Alert.alert('Verification Code Sent', 'Check the OTP code displayed below (SMS delivery is being configured).');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndProceed = () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    setStep('password');
  };

  const handleResetPassword = async () => {
    if (!allValid) {
      Alert.alert('Error', 'Please meet all password requirements');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Password reset successfully! You can now login.', [
          { text: 'Go to Login', onPress: () => router.replace('/(auth)/login') },
        ]);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Reset failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (step === 'password') setStep('otp');
            else if (step === 'otp') setStep('email');
            else router.back();
          }}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={step === 'email' ? 'key' : step === 'otp' ? 'keypad' : 'lock-open'}
                size={48}
                color="#4A90E2"
              />
            </View>
            <Text style={styles.title}>
              {step === 'email' ? 'Forgot Password' : step === 'otp' ? 'Enter OTP' : 'New Password'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Enter your email and we\'ll send you a verification code'
                : step === 'otp'
                ? `Enter the 6-digit code sent to ${email}`
                : 'Create a strong new password'}
            </Text>
          </View>

          {/* Step 1: Email */}
          {step === 'email' && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={20} color="#8B949E" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#8B949E"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <View style={styles.form}>
              {devOtp && (
                <View style={styles.devOtpBanner}>
                  <Ionicons name="key" size={20} color="#FF9800" />
                  <View style={styles.devOtpContent}>
                    <Text style={styles.devOtpLabel}>Dev Mode - Your OTP Code:</Text>
                    <Text style={styles.devOtpCode}>{devOtp}</Text>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor="#8B949E"
                  value={otp}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, otp.length !== 6 && styles.buttonDisabled]}
                onPress={handleVerifyAndProceed}
                disabled={otp.length !== 6}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="#8B949E" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor="#8B949E"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#8B949E" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="#8B949E" />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor="#8B949E"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              <View style={styles.checklist}>
                {passwordChecks.map((check, i) => (
                  <View key={i} style={styles.checkRow}>
                    <Ionicons
                      name={check.valid ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={check.valid ? '#4CAF50' : '#8B949E'}
                    />
                    <Text style={[styles.checkText, check.valid && styles.checkTextValid]}>
                      {check.label}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!allValid || isLoading) && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={!allValid || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            {['email', 'otp', 'password'].map((s, i) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  (step === 'email' && i === 0) || (step === 'otp' && i <= 1) || (step === 'password' && i <= 2)
                    ? styles.stepDotActive
                    : null,
                ]}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1419' },
  scrollContent: { padding: 24, paddingTop: 16 },
  backButton: { padding: 8, marginBottom: 16, alignSelf: 'flex-start' },
  header: { alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#1C2128', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8B949E', textAlign: 'center', lineHeight: 20 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C2128', borderRadius: 12, borderWidth: 1, borderColor: '#30363D', paddingHorizontal: 16, gap: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#FFFFFF' },
  otpInput: { backgroundColor: '#1C2128', borderRadius: 12, borderWidth: 1, borderColor: '#30363D', height: 64, fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 8 },
  primaryButton: { backgroundColor: '#4A90E2', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  checklist: { backgroundColor: '#1C2128', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#30363D', gap: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { fontSize: 14, color: '#8B949E' },
  checkTextValid: { color: '#4CAF50' },
  devOtpBanner: { flexDirection: 'row', backgroundColor: '#FF980015', borderRadius: 12, padding: 16, gap: 12, borderWidth: 1, borderColor: '#FF9800', alignItems: 'center' },
  devOtpContent: { flex: 1 },
  devOtpLabel: { fontSize: 12, color: '#FF9800', fontWeight: '600', marginBottom: 4 },
  devOtpCode: { fontSize: 28, fontWeight: 'bold', color: '#FF9800', letterSpacing: 4 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', marginTop: 32, gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#30363D' },
  stepDotActive: { backgroundColor: '#4A90E2', width: 24 },
});
