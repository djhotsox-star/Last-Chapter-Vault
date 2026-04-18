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

interface Beneficiary {
  id: string;
  full_name: string;
  relationship: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  notes?: string;
  created_at: string;
}

export default function ViewBeneficiaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { accessToken } = useAuth();
  
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBeneficiary();
  }, []);

  const fetchBeneficiary = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/beneficiaries/${params.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBeneficiary(data);
      } else {
        Alert.alert('Error', 'Failed to load beneficiary');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load beneficiary');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Beneficiary',
      'Are you sure you want to delete this beneficiary? They will be removed from all assets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await fetch(
                `${API_URL}/api/beneficiaries/${params.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Beneficiary deleted successfully', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                throw new Error('Delete failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete beneficiary');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
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

  if (!beneficiary) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Beneficiary</Text>
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
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#4A90E2" />
          </View>
          <Text style={styles.name}>{beneficiary.full_name}</Text>
          <Text style={styles.relationship}>{beneficiary.relationship}</Text>
        </View>

        {/* Contact Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {beneficiary.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#8B949E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{beneficiary.email}</Text>
              </View>
            </View>
          )}

          {beneficiary.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#8B949E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{beneficiary.phone}</Text>
              </View>
            </View>
          )}

          {beneficiary.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#8B949E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{beneficiary.address}</Text>
              </View>
            </View>
          )}

          {beneficiary.date_of_birth && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#8B949E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{beneficiary.date_of_birth}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        {beneficiary.notes && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{beneficiary.notes}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metadata}>
          <Text style={styles.metadataText}>
            Added {formatDate(beneficiary.created_at)}
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A90E220',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  relationship: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
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
  notes: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 22,
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
