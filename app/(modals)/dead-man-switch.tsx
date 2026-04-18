import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const PRESETS = [7, 14, 30, 60, 90, 180, 365];

export default function DeadManSwitchScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [inactivityDays, setInactivityDays] = useState(30);
  const [executorEmail, setExecutorEmail] = useState('');
  const [executorPhone, setExecutorPhone] = useState('');
  const [message, setMessage] = useState('');
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);
  const [daysSince, setDaysSince] = useState(0);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/security/dead-man-switch`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled || false);
        setInactivityDays(data.inactivity_days || 30);
        setExecutorEmail(data.executor_email || '');
        setExecutorPhone(data.executor_phone || '');
        setMessage(data.message || '');
        setLastCheckin(data.last_checkin);
        setDaysSince(data.days_since_checkin || 0);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/security/dead-man-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ enabled, inactivity_days: inactivityDays, executor_email: executorEmail || null, executor_phone: executorPhone || null, message: message || null }),
      });
      if (res.ok) {
        Alert.alert('Saved', 'Dead Man\'s Switch configuration updated');
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Save failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/security/checkin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) {
        Alert.alert('Check-in Successful', 'Your activity timer has been reset.');
        setDaysSince(0);
        setLastCheckin(new Date().toISOString());
      }
    } catch (error) {
      Alert.alert('Error', 'Check-in failed');
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
        <Text style={styles.headerTitle}>Dead Man's Switch</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={32} color="#4A90E2" />
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            If you don't access your vault for a set period, your designated contact will be automatically notified. This ensures your loved ones can access critical information when needed.
          </Text>
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Activity</Text>
            <Text style={styles.statusValue}>{daysSince === 0 ? 'Today' : `${daysSince} days ago`}</Text>
          </View>
          <TouchableOpacity style={styles.checkinBtn} onPress={handleCheckin}>
            <Ionicons name="hand-left" size={18} color="#4CAF50" />
            <Text style={styles.checkinText}>Check In Now</Text>
          </TouchableOpacity>
        </View>

        {/* Enable Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Enable Dead Man's Switch</Text>
            <Text style={styles.toggleDesc}>Notify contacts after inactivity</Text>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: '#30363D', true: '#4A90E240' }} thumbColor={enabled ? '#4A90E2' : '#8B949E'} />
        </View>

        {enabled && (
          <View style={styles.configSection}>
            {/* Inactivity Period */}
            <Text style={styles.sectionLabel}>Inactivity Period</Text>
            <View style={styles.presetRow}>
              {PRESETS.map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.presetChip, inactivityDays === days && styles.presetActive]}
                  onPress={() => setInactivityDays(days)}
                >
                  <Text style={[styles.presetText, inactivityDays === days && styles.presetTextActive]}>
                    {days < 30 ? `${days}d` : days < 365 ? `${days / 30}mo` : '1yr'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Executor Contact */}
            <Text style={styles.sectionLabel}>Emergency Contact</Text>
            <TextInput style={styles.input} placeholder="Executor Email" placeholderTextColor="#8B949E" value={executorEmail} onChangeText={setExecutorEmail} keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Executor Phone (optional)" placeholderTextColor="#8B949E" value={executorPhone} onChangeText={setExecutorPhone} keyboardType="phone-pad" />

            {/* Custom Message */}
            <Text style={styles.sectionLabel}>Notification Message</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Custom message sent to your contact..." placeholderTextColor="#8B949E" value={message} onChangeText={setMessage} multiline textAlignVertical="top" />

            <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.5 }]} onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Configuration</Text>}
            </TouchableOpacity>
          </View>
        )}

        {!enabled && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
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
  infoCard: { backgroundColor: '#1C2128', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#4A90E2', alignItems: 'center', gap: 10 },
  infoTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  infoText: { fontSize: 14, color: '#8B949E', textAlign: 'center', lineHeight: 20 },
  statusCard: { backgroundColor: '#1C2128', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#30363D', gap: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 14, color: '#8B949E' },
  statusValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  checkinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF5015', borderRadius: 10, paddingVertical: 12, gap: 8, borderWidth: 1, borderColor: '#4CAF50' },
  checkinText: { fontSize: 15, fontWeight: '600', color: '#4CAF50' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C2128', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#30363D' },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  toggleDesc: { fontSize: 13, color: '#8B949E' },
  configSection: { gap: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginTop: 4 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#30363D' },
  presetActive: { borderColor: '#4A90E2', backgroundColor: '#1C2533' },
  presetText: { fontSize: 14, fontWeight: '600', color: '#8B949E' },
  presetTextActive: { color: '#4A90E2' },
  input: { backgroundColor: '#1C2128', borderRadius: 10, borderWidth: 1, borderColor: '#30363D', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#FFFFFF' },
  saveBtn: { backgroundColor: '#4A90E2', borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
