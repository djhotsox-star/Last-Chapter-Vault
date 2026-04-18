import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  value?: number;
  description?: string;
  account_number?: string;
  institution?: string;
  location?: string;
  access_info?: string;
  beneficiary_ids: string[];
  created_at: string;
}

interface Beneficiary {
  id: string;
  full_name: string;
}

export default function ViewAssetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { accessToken } = useAuth();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assetRes, benRes] = await Promise.all([
        fetch(`${API_URL}/api/assets/${params.id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`${API_URL}/api/beneficiaries`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      if (assetRes.ok && benRes.ok) {
        const assetData = await assetRes.json();
        const benData = await benRes.json();
        setAsset(assetData);
        setBeneficiaries(benData);
      } else {
        Alert.alert('Error', 'Failed to load asset');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load asset');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Asset',
      'Are you sure you want to delete this asset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await fetch(
                `${API_URL}/api/assets/${params.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Asset deleted successfully', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                throw new Error('Delete failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete asset');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatValue = (value?: number) => {
    if (!value) return 'Not specified';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAssetTypeInfo = (type: string) => {
    return ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[8];
  };

  const getAssignedBeneficiaries = () => {
    return beneficiaries.filter(b => asset?.beneficiary_ids.includes(b.id));
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

  if (!asset) {
    return null;
  }

  const typeInfo = getAssetTypeInfo(asset.asset_type);
  const assignedBeneficiaries = getAssignedBeneficiaries();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Asset Details</Text>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteButton}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#F44336" />
          ) : (
            <Ionicons name="trash" size={24} color="#F44336" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Asset Icon & Name */}
        <View style={styles.headerSection}>
          <View style={[styles.icon, { backgroundColor: `${typeInfo.color}20` }]}>
            <Ionicons name={typeInfo.icon as any} size={48} color={typeInfo.color} />
          </View>
          <Text style={styles.name}>{asset.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={[styles.typeText, { color: typeInfo.color }]}>
              {typeInfo.label}
            </Text>
          </View>
          <Text style={styles.value}>{formatValue(asset.value)}</Text>
        </View>

        {/* Details */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          {asset.institution && (
            <View style={styles.infoRow}>
              <Ionicons name="business" size={20} color="#8B949E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Institution</Text>
                <Text style={styles.infoValue}>{asset.institution}</Text>
              </View>
            </View>
          )}

          {asset.account_number && (
            <View style={styles.infoRow}>
              <Ionicons name="card" size={20} color="#8B949E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Account Number</Text>
                <Text style={styles.infoValue}>{asset.account_number}</Text>
              </View>
            </View>
          )}

          {asset.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#8B949E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{asset.location}</Text>
              </View>
            </View>
          )}

          {asset.description && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={20} color="#8B949E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>{asset.description}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Access Info */}
        {asset.access_info && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Access Information</Text>
            <Text style={styles.accessInfo}>{asset.access_info}</Text>
          </View>
        )}

        {/* Beneficiaries */}
        {assignedBeneficiaries.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>
              Assigned Beneficiaries ({assignedBeneficiaries.length})
            </Text>
            <View style={styles.beneficiariesList}>
              {assignedBeneficiaries.map((beneficiary) => (
                <View key={beneficiary.id} style={styles.beneficiaryRow}>
                  <Ionicons name="person" size={16} color="#4A90E2" />
                  <Text style={styles.beneficiaryName}>{beneficiary.full_name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            Added {formatDate(asset.created_at)}
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1C2128',
    marginBottom: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  infoCard: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363D',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  accessInfo: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  beneficiariesList: {
    gap: 12,
  },
  beneficiaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  beneficiaryName: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  metadata: {
    alignItems: 'center',
    paddingTop: 16,
  },
  metadataText: {
    fontSize: 12,
    color: '#6E7681',
  },
});
