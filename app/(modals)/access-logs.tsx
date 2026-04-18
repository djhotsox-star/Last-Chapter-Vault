import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LogEntry {
  id: string;
  action: string;
  timestamp: string;
  ip_address?: string;
}

const ACTION_ICONS: Record<string, { icon: string; color: string }> = {
  register: { icon: 'person-add', color: '#4CAF50' },
  login: { icon: 'log-in', color: '#4A90E2' },
  logout: { icon: 'log-out', color: '#FF9800' },
  update_profile: { icon: 'person', color: '#9C27B0' },
  change_password: { icon: 'key', color: '#F44336' },
  export_data: { icon: 'download', color: '#00BCD4' },
  create_document: { icon: 'document', color: '#4CAF50' },
  update_document: { icon: 'create', color: '#FF9800' },
  delete_document: { icon: 'trash', color: '#F44336' },
  create_asset: { icon: 'wallet', color: '#4CAF50' },
  update_asset: { icon: 'create', color: '#FF9800' },
  delete_asset: { icon: 'trash', color: '#F44336' },
  create_beneficiary: { icon: 'person-add', color: '#4CAF50' },
  update_beneficiary: { icon: 'create', color: '#FF9800' },
  delete_beneficiary: { icon: 'trash', color: '#F44336' },
  create_photo: { icon: 'camera', color: '#4CAF50' },
  delete_photo: { icon: 'trash', color: '#F44336' },
  upload_farewell_video: { icon: 'videocam', color: '#4CAF50' },
  delete_farewell_video: { icon: 'trash', color: '#F44336' },
};

function getActionInfo(action: string) {
  // Check for exact match first
  if (ACTION_ICONS[action]) return ACTION_ICONS[action];
  // Check for prefix match (e.g., "create_document: My Doc")
  const prefix = action.split(':')[0].trim();
  if (ACTION_ICONS[prefix]) return ACTION_ICONS[prefix];
  return { icon: 'ellipse', color: '#8B949E' };
}

function formatAction(action: string): string {
  const parts = action.split(':');
  const baseAction = parts[0].trim().replace(/_/g, ' ');
  const detail = parts[1]?.trim();
  const capitalized = baseAction.charAt(0).toUpperCase() + baseAction.slice(1);
  return detail ? `${capitalized} - ${detail}` : capitalized;
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function AccessLogsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/access-logs?limit=100`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    const info = getActionInfo(item.action);
    return (
      <View style={styles.logItem}>
        <View style={[styles.logIcon, { backgroundColor: `${info.color}20` }]}>
          <Ionicons name={info.icon as any} size={18} color={info.color} />
        </View>
        <View style={styles.logContent}>
          <Text style={styles.logAction}>{formatAction(item.action)}</Text>
          <Text style={styles.logTime}>{formatTimestamp(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Access Logs</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.infoBar}>
        <Ionicons name="shield-checkmark" size={18} color="#4CAF50" />
        <Text style={styles.infoText}>
          All activity in your vault is tracked for security
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#8B949E" />
          <Text style={styles.emptyText}>No activity logs yet</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchLogs();
              }}
              tintColor="#4A90E2"
            />
          }
        />
      )}
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
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2128',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  infoText: {
    fontSize: 13,
    color: '#8B949E',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8B949E',
  },
  listContent: {
    padding: 16,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 14,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  logTime: {
    fontSize: 12,
    color: '#8B949E',
  },
});
