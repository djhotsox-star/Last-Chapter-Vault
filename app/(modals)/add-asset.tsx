import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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

interface Beneficiary {
  id: string;
  full_name: string;
}

export default function AddAssetScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    asset_type: 'other',
    value: '',
    description: '',
    account_number: '',
    institution: '',
    location: '',
    access_info: '',
  });
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const fetchBeneficiaries = async () => {
    try {
      const response = await fetch(`${API_URL}/api/beneficiaries`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBeneficiaries(data);
      }
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
    }
  };

  const toggleBeneficiary = (id: string) => {
    setSelectedBeneficiaries(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter asset name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          asset_type: formData.asset_type,
          value: formData.value ? parseFloat(formData.value) : undefined,
          description: formData.description.trim() || undefined,
          account_number: formData.account_number.trim() || undefined,
          institution: formData.institution.trim() || undefined,
          location: formData.location.trim() || undefined,
          access_info: formData.access_info.trim() || undefined,
          beneficiary_ids: selectedBeneficiaries,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Asset added successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create asset');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Asset</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Asset Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Asset Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Main Checking Account"
              placeholderTextColor="#8B949E"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              autoFocus
            />
          </View>

          {/* Asset Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Asset Type *</Text>
            <View style={styles.typesGrid}>
              {ASSET_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    formData.asset_type === type.value && {
                      backgroundColor: `${type.color}20`,
                      borderColor: type.color,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, asset_type: type.value })}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={formData.asset_type === type.value ? type.color : '#8B949E'}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      formData.asset_type === type.value && {
                        color: type.color,
                        fontWeight: '600',
                      },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Value */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estimated Value (Optional)</Text>
            <View style={styles.valueInput}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#8B949E"
                value={formData.value}
                onChangeText={(text) => setFormData({ ...formData, value: text.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Institution */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Institution/Bank (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Chase Bank"
              placeholderTextColor="#8B949E"
              value={formData.institution}
              onChangeText={(text) => setFormData({ ...formData, institution: text })}
            />
          </View>

          {/* Account Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account/ID Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Last 4 digits or full number"
              placeholderTextColor="#8B949E"
              value={formData.account_number}
              onChangeText={(text) => setFormData({ ...formData, account_number: text })}
            />
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 123 Main St, City, State"
              placeholderTextColor="#8B949E"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />
          </View>

          {/* Access Info */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Access Information (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Login credentials, safe deposit box location, etc."
              placeholderTextColor="#8B949E"
              value={formData.access_info}
              onChangeText={(text) => setFormData({ ...formData, access_info: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any additional details"
              placeholderTextColor="#8B949E"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Beneficiaries */}
          {beneficiaries.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assign to Beneficiaries (Optional)</Text>
              <View style={styles.beneficiariesList}>
                {beneficiaries.map((beneficiary) => (
                  <TouchableOpacity
                    key={beneficiary.id}
                    style={[
                      styles.beneficiaryChip,
                      selectedBeneficiaries.includes(beneficiary.id) && styles.beneficiaryChipActive,
                    ]}
                    onPress={() => toggleBeneficiary(beneficiary.id)}
                  >
                    <Ionicons
                      name={selectedBeneficiaries.includes(beneficiary.id) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={selectedBeneficiaries.includes(beneficiary.id) ? '#4A90E2' : '#8B949E'}
                    />
                    <Text
                      style={[
                        styles.beneficiaryName,
                        selectedBeneficiaries.includes(beneficiary.id) && styles.beneficiaryNameActive,
                      ]}
                    >
                      {beneficiary.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Add Asset</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    paddingTop: 16,
  },
  valueInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  currency: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    paddingLeft: 16,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '31%',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#30363D',
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  typeLabel: {
    fontSize: 11,
    color: '#8B949E',
    textAlign: 'center',
  },
  beneficiariesList: {
    gap: 10,
  },
  beneficiaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 12,
    gap: 12,
  },
  beneficiaryChipActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E210',
  },
  beneficiaryName: {
    fontSize: 14,
    color: '#8B949E',
  },
  beneficiaryNameActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
