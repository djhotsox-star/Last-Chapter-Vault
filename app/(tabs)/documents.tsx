import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Document {
  id: string;
  title: string;
  category: string;
  description?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

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

export default function DocumentsScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, selectedCategory, documents]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (selectedCategory) {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.file_name.toLowerCase().includes(query) ||
        (doc.description && doc.description.toLowerCase().includes(query))
      );
    }

    setFilteredDocs(filtered);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDocuments();
  };

  const handleUploadFromCamera = async () => {
    setShowUploadMenu(false);
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      router.push({
        pathname: '/(modals)/add-document',
        params: {
          fileData: asset.base64,
          fileName: `photo_${Date.now()}.jpg`,
          fileType: 'image/jpeg',
          fileSize: asset.base64?.length || 0,
        },
      });
    }
  };

  const handleUploadFromGallery = async () => {
    setShowUploadMenu(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      router.push({
        pathname: '/(modals)/add-document',
        params: {
          fileData: asset.base64,
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
          fileType: asset.type === 'image' ? 'image/jpeg' : 'application/pdf',
          fileSize: asset.base64?.length || 0,
        },
      });
    }
  };

  const handleUploadFromFiles = async () => {
    setShowUploadMenu(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        router.push({
          pathname: '/(modals)/add-document',
          params: {
            fileData: base64,
            fileName: asset.name,
            fileType: asset.mimeType || 'application/pdf',
            fileSize: asset.size || 0,
          },
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleScanDocument = async () => {
    setShowUploadMenu(false);
    
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to scan documents');
      return;
    }

    // On iOS, use the camera with quality settings optimized for documents
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: true,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      router.push({
        pathname: '/(modals)/add-document',
        params: {
          fileData: asset.base64,
          fileName: `scan_${Date.now()}.jpg`,
          fileType: 'image/jpeg',
          fileSize: asset.base64?.length || 0,
        },
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowUploadMenu(!showUploadMenu)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Upload Menu */}
      {showUploadMenu && (
        <View style={styles.uploadMenu}>
          <TouchableOpacity style={styles.uploadOption} onPress={handleScanDocument}>
            <Ionicons name="scan" size={24} color="#4A90E2" />
            <Text style={styles.uploadOptionText}>Scan Document</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadOption} onPress={handleUploadFromCamera}>
            <Ionicons name="camera" size={24} color="#4A90E2" />
            <Text style={styles.uploadOptionText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadOption} onPress={handleUploadFromGallery}>
            <Ionicons name="images" size={24} color="#4A90E2" />
            <Text style={styles.uploadOptionText}>Choose from Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadOption} onPress={handleUploadFromFiles}>
            <Ionicons name="document" size={24} color="#4A90E2" />
            <Text style={styles.uploadOptionText}>Browse Files</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8B949E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search documents..."
          placeholderTextColor="#8B949E"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.value}
            style={[
              styles.categoryChip,
              selectedCategory === category.value && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(
              selectedCategory === category.value ? null : category.value
            )}
          >
            <Ionicons
              name={category.icon as any}
              size={16}
              color={
                selectedCategory === category.value ? '#FFFFFF' : category.color
              }
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category.value && styles.categoryChipTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Documents List */}
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
        {filteredDocs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#8B949E" />
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory ? 'No documents found' : 'No documents yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters'
                : 'Upload your first document'}
            </Text>
          </View>
        ) : (
          <View style={styles.documentsGrid}>
            {filteredDocs.map((doc) => {
              const categoryInfo = getCategoryInfo(doc.category);
              return (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.documentCard}
                  onPress={() => router.push(`/(modals)/view-document?id=${doc.id}`)}
                >
                  <View
                    style={[
                      styles.documentIcon,
                      { backgroundColor: `${categoryInfo.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={categoryInfo.icon as any}
                      size={32}
                      color={categoryInfo.color}
                    />
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentTitle} numberOfLines={2}>
                      {doc.title}
                    </Text>
                    <Text style={styles.documentMeta}>
                      {categoryInfo.label} • {formatFileSize(doc.file_size)}
                    </Text>
                    <Text style={styles.documentDate}>
                      {formatDate(doc.created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
  uploadMenu: {
    backgroundColor: '#1C2128',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  uploadOptionText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    marginHorizontal: 24,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  categoriesContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1C2128',
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 6,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#8B949E',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
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
  documentsGrid: {
    gap: 16,
  },
  documentCard: {
    flexDirection: 'row',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 16,
  },
  documentIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#6E7681',
  },
});
