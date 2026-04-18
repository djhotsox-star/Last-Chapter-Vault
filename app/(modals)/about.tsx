import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  const router = useRouter();

  const features = [
    { icon: 'document-lock', title: 'Secure Document Vault', desc: 'Store wills, trusts, and legal documents' },
    { icon: 'wallet', title: 'Asset Inventory', desc: 'Track all your assets and liabilities' },
    { icon: 'people', title: 'Beneficiary Management', desc: 'Map assets to your loved ones' },
    { icon: 'images', title: 'Private Photo Vault', desc: 'Safely store precious memories' },
    { icon: 'videocam', title: 'Farewell Video', desc: 'Record a personal message for your family' },
    { icon: 'shield-checkmark', title: 'Dual-Role Security', desc: 'Owner and Executor access controls' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={48} color="#4A90E2" />
          </View>
          <Text style={styles.appName}>Last Chapter Vault</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.tagline}>
            Secure your legacy. Protect what matters most.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={22} color="#4A90E2" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.securityCard}>
            <View style={styles.securityRow}>
              <Ionicons name="lock-closed" size={18} color="#4CAF50" />
              <Text style={styles.securityText}>JWT Authentication with 2FA</Text>
            </View>
            <View style={styles.securityRow}>
              <Ionicons name="key" size={18} color="#4CAF50" />
              <Text style={styles.securityText}>Bcrypt Password Hashing</Text>
            </View>
            <View style={styles.securityRow}>
              <Ionicons name="eye-off" size={18} color="#4CAF50" />
              <Text style={styles.securityText}>Secure Token Storage</Text>
            </View>
            <View style={styles.securityRow}>
              <Ionicons name="time" size={18} color="#4CAF50" />
              <Text style={styles.securityText}>Session Timeout Protection</Text>
            </View>
            <View style={styles.securityRow}>
              <Ionicons name="ban" size={18} color="#4CAF50" />
              <Text style={styles.securityText}>Account Lockout after 5 Failures</Text>
            </View>
          </View>
        </View>

        <Text style={styles.copyright}>
          2025 Last Chapter Vault. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#4A90E220',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: '#4A90E2',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B949E',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#4A90E215',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#8B949E',
  },
  securityCard: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 14,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  copyright: {
    fontSize: 12,
    color: '#8B949E',
    textAlign: 'center',
    marginTop: 8,
  },
});
