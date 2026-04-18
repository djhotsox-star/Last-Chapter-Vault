import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  value?: number;
  institution?: string;
  beneficiary_ids: string[];
}

interface Beneficiary {
  id: string;
  full_name: string;
  relationship: string;
  email?: string;
  phone?: string;
}

const ASSET_TYPES = [
  { value: 'bank_account', label: 'Bank Account', icon: 'card', color: '#4A90E2' },
  { value: 'real_estate', label: 'Real Estate', icon: 'home', color: '#4CAF50' },
  { value: 'investment', label: 'Investment', icon: 'trending-up', color: '#9C27B0' },
  { value: 'vehicle', label: 'Vehicle', icon: 'car', color: '#FF9800' },
  { value: 'cryptocurrency', label: 'Crypto', icon: 'logo-bitcoin', color: '#F44336' },
  { value: 'social_media', label: 'Social Media', icon: 'share-social', color: '#00BCD4' },
  { value: 'cloud_storage', label: 'Cloud Storage', icon: 'cloud', color: '#607D8B' },
  { value: 'debt', label: 'Debt', icon: 'alert-circle', color: '#E91E63' },
  { value: 'other', label: 'Other', icon: 'folder', color: '#795548' },
];

export default function ContactsScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'beneficiaries' | 'assets' | 'video'>('beneficiaries');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [farewellVideo, setFarewellVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    try {
      if (tab === 'beneficiaries') {
        const response = await fetch(`${API_URL}/api/beneficiaries`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setBeneficiaries(data);
        }
      } else if (tab === 'assets') {
        const response = await fetch(`${API_URL}/api/assets`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAssets(data);
        }
      } else if (tab === 'video') {
        const response = await fetch(`${API_URL}/api/farewell-video`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setFarewellVideo(data);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const formatValue = (value?: number) => {
    if (!value) return 'Not specified';
    return `$${value.toLocaleString()}`;
  };

  const getAssetTypeInfo = (type: string) => {
    return ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[8];
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Legacy Planning</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (tab === 'beneficiaries') {
              router.push('/(modals)/add-beneficiary');
            } else if (tab === 'assets') {
              router.push('/(modals)/add-asset');
            } else if (tab === 'video') {
              router.push('/(modals)/add-farewell-video');
            }
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'beneficiaries' && styles.tabActive]}
          onPress={() => setTab('beneficiaries')}
        >
          <Ionicons
            name="people"
            size={20}
            color={tab === 'beneficiaries' ? '#4A90E2' : '#8B949E'}
          />
          <Text style={[styles.tabText, tab === 'beneficiaries' && styles.tabTextActive]}>
            Beneficiaries
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'assets' && styles.tabActive]}
          onPress={() => setTab('assets')}
        >
          <Ionicons
            name="wallet"
            size={20}
            color={tab === 'assets' ? '#4A90E2' : '#8B949E'}
          />
          <Text style={[styles.tabText, tab === 'assets' && styles.tabTextActive]}>
            Assets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'video' && styles.tabActive]}
          onPress={() => setTab('video')}
        >
          <Ionicons
            name="videocam"
            size={20}
            color={tab === 'video' ? '#4A90E2' : '#8B949E'}
          />
          <Text style={[styles.tabText, tab === 'video' && styles.tabTextActive]}>
            Video
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
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
        {tab === 'beneficiaries' ? (
          beneficiaries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#8B949E" />
              <Text style={styles.emptyText}>No beneficiaries yet</Text>
              <Text style={styles.emptySubtext}>Add people who will inherit your assets</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {beneficiaries.map((beneficiary) => (
                <TouchableOpacity
                  key={beneficiary.id}
                  style={styles.card}
                  onPress={() => router.push(`/(modals)/view-beneficiary?id=${beneficiary.id}`)}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color="#4A90E2" />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{beneficiary.full_name}</Text>
                    <Text style={styles.cardSubtitle}>{beneficiary.relationship}</Text>
                    {beneficiary.email && (
                      <View style={styles.contactRow}>
                        <Ionicons name="mail" size={14} color="#8B949E" />
                        <Text style={styles.contactText}>{beneficiary.email}</Text>
                      </View>
                    )}
                    {beneficiary.phone && (
                      <View style={styles.contactRow}>
                        <Ionicons name="call" size={14} color="#8B949E" />
                        <Text style={styles.contactText}>{beneficiary.phone}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#8B949E" />
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : tab === 'assets' ? (
          assets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color="#8B949E" />
              <Text style={styles.emptyText}>No assets yet</Text>
              <Text style={styles.emptySubtext}>Track your valuable possessions</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {assets.map((asset) => {
                const typeInfo = getAssetTypeInfo(asset.asset_type);
                return (
                  <TouchableOpacity
                    key={asset.id}
                    style={styles.card}
                    onPress={() => router.push(`/(modals)/view-asset?id=${asset.id}`)}
                  >
                    <View style={[styles.assetIcon, { backgroundColor: `${typeInfo.color}20` }]}>
                      <Ionicons name={typeInfo.icon as any} size={24} color={typeInfo.color} />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{asset.name}</Text>
                      <Text style={styles.cardSubtitle}>{typeInfo.label}</Text>
                      {asset.institution && (
                        <Text style={styles.institution}>{asset.institution}</Text>
                      )}
                      <Text style={styles.value}>{formatValue(asset.value)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#8B949E" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        ) : tab === 'video' ? (
          !farewellVideo ? (
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={64} color="#8B949E" />
              <Text style={styles.emptyText}>No farewell video yet</Text>
              <Text style={styles.emptySubtext}>Record a special message for your loved ones</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.videoCard}
              onPress={() => router.push('/(modals)/view-farewell-video')}
            >
              <View style={styles.videoThumbnail}>
                <Ionicons name="play-circle" size={64} color="#4A90E2" />
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>{farewellVideo.title}</Text>
                {farewellVideo.description && (
                  <Text style={styles.videoDescription} numberOfLines={2}>
                    {farewellVideo.description}
                  </Text>
                )}
                <View style={styles.videoMeta}>
                  <Ionicons name="time" size={14} color="#8B949E" />
                  <Text style={styles.videoMetaText}>
                    {farewellVideo.duration ? `${farewellVideo.duration}s` : 'Video'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8B949E" />
            </TouchableOpacity>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1C2128',
    borderWidth: 2,
    borderColor: '#30363D',
    gap: 8,
  },
  tabActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#1C2533',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
  },
  tabTextActive: {
    color: '#4A90E2',
  },
  scrollContent: {
    padding: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 8,
  },
  list: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90E220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#8B949E',
  },
  institution: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 16,
  },
  videoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#4A90E220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoMetaText: {
    fontSize: 12,
    color: '#8B949E',
  },
});
