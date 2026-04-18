import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function DashboardScreen() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState([
    { icon: 'document-text', label: 'Documents', count: 0, color: '#4A90E2' },
    { icon: 'images', label: 'Photos', count: 0, color: '#9C27B0' },
    { icon: 'cash', label: 'Assets', count: 0, color: '#4CAF50' },
    { icon: 'people', label: 'Beneficiaries', count: 0, color: '#FF9800' },
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch document stats
      const docResponse = await fetch(`${API_URL}/api/documents/stats/summary`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      // Fetch asset stats
      const assetResponse = await fetch(`${API_URL}/api/assets/stats/summary`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      // Fetch beneficiaries
      const benResponse = await fetch(`${API_URL}/api/beneficiaries`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (docResponse.ok && assetResponse.ok && benResponse.ok) {
        const docData = await docResponse.json();
        const assetData = await assetResponse.json();
        const benData = await benResponse.json();

        setStats(prev => prev.map(stat => {
          if (stat.label === 'Documents') {
            return { ...stat, count: docData.total_documents };
          } else if (stat.label === 'Assets') {
            return { ...stat, count: assetData.total_assets };
          } else if (stat.label === 'Beneficiaries') {
            return { ...stat, count: benData.length };
          }
          return stat;
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStats();
  };

  const quickActions = [
    { icon: 'add-circle', label: 'Add Document', color: '#4A90E2', route: '/(modals)/add-document-picker' },
    { icon: 'camera', label: 'Scan Document', color: '#9C27B0', route: '/(modals)/add-document-picker' },
    { icon: 'wallet', label: 'Add Asset', color: '#4CAF50', route: null },
    { icon: 'person-add', label: 'Add Beneficiary', color: '#FF9800', route: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4A90E2"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.full_name}</Text>
            <View style={styles.roleContainer}>
              <Ionicons
                name={user?.role === 'owner' ? 'person' : 'briefcase'}
                size={14}
                color="#4A90E2"
              />
              <Text style={styles.role}>
                {user?.role === 'owner' ? 'Owner Account' : 'Executor Account'}
              </Text>
            </View>
          </View>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <TouchableOpacity
                key={index}
                style={styles.statCard}
                onPress={() => {
                  if (stat.label === 'Documents') {
                    router.push('/(tabs)/documents');
                  } else if (stat.label === 'Photos') {
                    router.push('/(tabs)/photos');
                  } else if (stat.label === 'Assets' || stat.label === 'Beneficiaries') {
                    router.push('/(tabs)/contacts');
                  }
                }}
              >
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                  <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                </View>
                <Text style={styles.statCount}>{stat.count}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            {quickActions.map((action, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.actionCard}
                onPress={() => {
                  if (action.label === 'Add Document' || action.label === 'Scan Document') {
                    router.push('/(tabs)/documents');
                  } else if (action.label === 'Add Asset') {
                    router.push('/(modals)/add-asset');
                  } else if (action.label === 'Add Beneficiary') {
                    router.push('/(modals)/add-beneficiary');
                  }
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Executor Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executor Tools</Text>
          <View style={styles.executorGrid}>
            <TouchableOpacity
              style={styles.executorCard}
              onPress={() => router.push('/(modals)/executor-tasks')}
            >
              <View style={[styles.executorIcon, { backgroundColor: '#F4433620' }]}>
                <Ionicons name="checkbox" size={24} color="#F44336" />
              </View>
              <Text style={styles.executorLabel}>Task Checklist</Text>
              <Text style={styles.executorDesc}>Track estate tasks & deadlines</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.executorCard}
              onPress={() => router.push('/(modals)/executor-accounting')}
            >
              <View style={[styles.executorIcon, { backgroundColor: '#4CAF5020' }]}>
                <Ionicons name="calculator" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.executorLabel}>Accounting</Text>
              <Text style={styles.executorDesc}>Fiduciary financial tracking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.executorCard}
              onPress={() => router.push('/(modals)/professional-directory')}
            >
              <View style={[styles.executorIcon, { backgroundColor: '#9C27B020' }]}>
                <Ionicons name="people" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.executorLabel}>Professionals</Text>
              <Text style={styles.executorDesc}>Attorney & advisor directory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.executorCard}
              onPress={() => router.push('/(modals)/access-logs')}
            >
              <View style={[styles.executorIcon, { backgroundColor: '#FF980020' }]}>
                <Ionicons name="time" size={24} color="#FF9800" />
              </View>
              <Text style={styles.executorLabel}>Activity Log</Text>
              <Text style={styles.executorDesc}>View all vault activity</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 14,
    color: '#8B949E',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  role: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8B949E',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  emptyText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 4,
  },
  executorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  executorCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  executorIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  executorLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  executorDesc: {
    fontSize: 12,
    color: '#8B949E',
  },
});
