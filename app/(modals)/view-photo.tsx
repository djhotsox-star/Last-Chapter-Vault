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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width, height } = Dimensions.get('window');

interface Photo {
  id: string;
  title: string;
  description?: string;
  file_data: string;
  created_at: string;
}

export default function ViewPhotoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { accessToken } = useAuth();
  
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPhoto();
  }, []);

  const fetchPhoto = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/photos/${params.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPhoto(data);
      } else {
        Alert.alert('Error', 'Failed to load photo');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load photo');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await fetch(
                `${API_URL}/api/photos/${params.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Photo deleted successfully', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                throw new Error('Delete failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo');
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

  if (!photo) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo</Text>
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
        {/* Photo */}
        <Image
          source={{ uri: `data:image/jpeg;base64,${photo.file_data}` }}
          style={styles.photo}
          resizeMode="contain"
        />

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.title}>{photo.title}</Text>
          
          {photo.description && (
            <Text style={styles.description}>{photo.description}</Text>
          )}

          <View style={styles.metaRow}>
            <Ionicons name="calendar" size={16} color="#8B949E" />
            <Text style={styles.metaText}>
              Added {formatDate(photo.created_at)}
            </Text>
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
  photo: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363D',
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
