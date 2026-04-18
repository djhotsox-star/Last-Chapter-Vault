import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const settingsOptions = [
    {
      section: 'Account',
      items: [
        { icon: 'person-outline', label: 'Profile', onPress: () => router.push('/(modals)/edit-profile') },
        { icon: 'shield-checkmark-outline', label: 'Change Password', onPress: () => router.push('/(modals)/security-settings') },
        { icon: 'finger-print-outline', label: 'Biometric Lock', onPress: () => router.push('/(modals)/biometric-settings') },
      ],
    },
    {
      section: 'Security',
      items: [
        { icon: 'timer-outline', label: "Dead Man's Switch", onPress: () => router.push('/(modals)/dead-man-switch') },
        { icon: 'lock-closed-outline', label: 'Document Encryption', onPress: () => Alert.alert('Encryption', 'AES-256 encryption is active. Documents can be encrypted individually from the document viewer.') },
        { icon: 'time-outline', label: 'Access Logs', onPress: () => router.push('/(modals)/access-logs') },
      ],
    },
    {
      section: 'Data',
      items: [
        { icon: 'cloud-download-outline', label: 'Export Data', onPress: () => router.push('/(modals)/export-data') },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => Alert.alert('Coming Soon', 'Push notifications will be available in the next update.') },
      ],
    },
    {
      section: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', onPress: () => Alert.alert('Help Center', 'For support, contact us at support@lastchaptervault.com') },
        { icon: 'document-text-outline', label: 'Terms & Privacy', onPress: () => Alert.alert('Terms & Privacy', 'By using Last Chapter Vault, you agree to our Terms of Service and Privacy Policy. Your data is encrypted and securely stored.') },
        { icon: 'information-circle-outline', label: 'About', onPress: () => router.push('/(modals)/about') },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.full_name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleTag}>
              <Ionicons
                name={user?.role === 'owner' ? 'person' : 'briefcase'}
                size={12}
                color="#4A90E2"
              />
              <Text style={styles.roleText}>
                {user?.role === 'owner' ? 'Owner' : 'Executor'}
              </Text>
            </View>
          </View>
          {user?.is_verified && (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          )}
        </View>

        {/* Settings Options */}
        {settingsOptions.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <View style={styles.optionsContainer}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.option,
                    itemIndex === section.items.length - 1 && styles.optionLast,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons name={item.icon as any} size={22} color="#8B949E" />
                    <Text style={styles.optionLabel}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8B949E" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 4,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  optionsContainer: {
    backgroundColor: '#1C2128',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#30363D',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 32,
    padding: 16,
    backgroundColor: '#1C2128',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  version: {
    fontSize: 12,
    color: '#8B949E',
    textAlign: 'center',
    marginTop: 24,
  },
});
