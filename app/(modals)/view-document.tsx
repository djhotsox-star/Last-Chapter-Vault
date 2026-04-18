import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Share,
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

interface Document {
  id: string;
  title: string;
  category: string;
  description?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_data: string;
  created_at: string;
  updated_at: string;
}

export default function ViewDocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { accessToken } = useAuth();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, []);

  const fetchDocument = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/documents/${params.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDocument(data);
      } else {
        Alert.alert('Error', 'Failed to load document');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load document');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await fetch(
                `${API_URL}/api/documents/${params.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Document deleted successfully', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                throw new Error('Delete failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete document');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[7];
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

  if (!document) {
    return null;
  }

  const categoryInfo = getCategoryInfo(document.category);
  const isImage = document.file_type.startsWith('image/');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Document</Text>
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
        {/* File Preview */}
        <View style={styles.previewContainer}>
          {isImage ? (
            <Image
              source={{ uri: `data:${document.file_type};base64,${document.file_data}` }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.filePreview}>
              <Ionicons name="document" size={80} color="#4A90E2" />
              <Text style={styles.fileType}>
                {document.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
              </Text>
            </View>
          )}
        </View>

        {/* Document Info */}
        <View style={styles.infoCard}>
          <View style={styles.categoryBadge}>
            <Ionicons
              name={categoryInfo.icon as any}
              size={16}
              color={categoryInfo.color}
            />
            <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </Text>
          </View>

          <Text style={styles.title}>{document.title}</Text>

          {document.description && (
            <Text style={styles.description}>{document.description}</Text>
          )}

          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Ionicons name="document" size={16} color="#8B949E" />
              <Text style={styles.metaText}>{document.file_name}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="resize" size={16} color="#8B949E" />
              <Text style={styles.metaText}>{formatFileSize(document.file_size)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar" size={16} color="#8B949E" />
              <Text style={styles.metaText}>
                Added {formatDate(document.created_at)}
              </Text>
            </View>
            {document.updated_at !== document.created_at && (
              <View style={styles.metaRow}>
                <Ionicons name="time" size={16} color="#8B949E" />
                <Text style={styles.metaText}>
                  Updated {formatDate(document.updated_at)}
                </Text>
              </View>
            )}
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
  previewContainer: {
    marginBottom: 24,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#1C2128',
  },
  filePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#1C2128',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  fileType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginTop: 16,
  },
  infoCard: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0F1419',
    marginBottom: 16,
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#8B949E',
    lineHeight: 24,
    marginBottom: 20,
  },
  metaContainer: {
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#8B949E',
  },
});
