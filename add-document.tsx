import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CATEGORIES = [
  { value: 'will', label: 'Will', icon: 'document-text', color: '#4A90E2' },
  { value: 'trust', label: 'Trust', icon: 'shield-checkmark', color: '#9C27B0' },
  { value: 'insurance', label: 'Insurance', icon: 'medical', color: '#F44336' },
  { value: 'legal', label: 'Legal', icon: 'hammer', color: '#FF9800' },
  { value: 'property', label: 'Property', icon: 'home', color: '#4CAF50' },
  { value: 'financial', label: 'Financial', icon: 'cash', color: '#00BCD4' },
  { value: 'medical', label: 'Medical', icon: 'fitness', color: '#E91E63' },
  { value: 'other', label: 'Other', icon: 'folder', color: '#607D8B' },
];

export default function AddDocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { accessToken } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the document');
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category: selectedCategory,
          file_data: params.fileData,
          file_name: params.fileName,
          file_type: params.fileType,
          file_size: parseInt(params.fileSize as string),
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Document uploaded successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Please try again');
    } finally {
      setIsUploading(false);
    }
  };

  const isImage = params.fileType?.toString().startsWith('image/');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Document</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* File Preview */}
        <View style={styles.previewContainer}>
          {isImage ? (
            <Image
              source={{ uri: `data:${params.fileType};base64,${params.fileData}` }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.filePreview}>
              <Ionicons name="document" size={64} color="#4A90E2" />
              <Text style={styles.fileName} numberOfLines={2}>
                {params.fileName}
              </Text>
            </View>
          )}
        </View>

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter document title"
            placeholderTextColor="#8B949E"
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add a description"
            placeholderTextColor="#8B949E"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Category Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.value && {
                    backgroundColor: `${category.color}20`,
                    borderColor: category.color,
                  },
                ]}
                onPress={() => setSelectedCategory(category.value)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={selectedCategory === category.value ? category.color : '#8B949E'}
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    selectedCategory === category.value && {
                      color: category.color,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </>
          )}
        </TouchableOpacity>
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
  previewContainer: {
    marginBottom: 24,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1C2128',
  },
  filePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1C2128',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 16,
  },
  fileName: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 12,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
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
    height: 100,
    paddingTop: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#30363D',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#8B949E',
  },
  uploadButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
