import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { user, verifyOTP, resendOTP, devOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
    // Auto-verify when 6 digits entered
    if (cleaned.length === 6) {
      autoVerify(cleaned);
    }
  };

  const autoVerify = async (otpCode: string) => {
    if (!user?.email) {
      Alert.alert('Error', 'User email not found. Please login again.');
      router.replace('/(auth)/login');
      return;
    }

    setIsLoading(true);
    try {
      const verified = await verifyOTP(user.email, otpCode);
      if (verified) {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid OTP');
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !user?.email) return;

    try {
      await resendOTP(user.email);
      Alert.alert('Success', 'OTP has been resent to your email');
      setResendTimer(60);
      setCanResend(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back button — lets user escape if they entered the wrong email */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(auth)/login')}
            accessibilityLabel="Back to sign in"
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back to sign in</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail" size={60} color="#4A90E2" />
            </View>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to{' '}
              <Text style={styles.email}>{user?.email}</Text>
            </Text>
            <Text style={styles.hint}>Check your email and enter the code below</Text>
          </View>

          {/* Dev OTP Banner — REMOVED for production: was leaking OTP codes on screen */}

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#8B949E"
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
            />
          </View>

          {/* Auto-verify indicator */}
          {isLoading && (
            <View style={styles.verifyingContainer}>
              <ActivityIndicator color="#4A90E2" size="large" />
              <Text style={styles.verifyingText}>Verifying...</Text>
            </View>
          )}

          {/* Resend OTP */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend}
              style={styles.resendButton}
            >
              <Text
                style={[
                  styles.resendButtonText,
                  !canResend && styles.resendButtonTextDisabled,
                ]}
              >
                {canResend ? 'Resend' : `Resend in ${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Wrong-email escape hatch — second visible exit in case the back button is missed */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.wrongEmailButton}
          >
            <Text style={styles.wrongEmailText}>
              Wrong email? Go back to sign in
            </Text>
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#4A90E2" />
            <Text style={styles.infoText}>
              The OTP will expire in 10 minutes. Make sure to check your spam folder if you don't see the email.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  wrongEmailButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  wrongEmailText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1C2128',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#8B949E',
    textAlign: 'center',
  },
  otpContainer: {
    marginBottom: 32,
  },
  otpInput: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    height: 64,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  verifyingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  verifyingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#8B949E',
  },
  resendButton: {
    padding: 4,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  resendButtonTextDisabled: {
    color: '#8B949E',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#8B949E',
    lineHeight: 18,
  },
  devOtpBanner: {
    flexDirection: 'row',
    backgroundColor: '#FF980015',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
    alignItems: 'center',
  },
  devOtpContent: {
    flex: 1,
  },
  devOtpLabel: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 4,
  },
  devOtpCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
    letterSpacing: 4,
  },
});
