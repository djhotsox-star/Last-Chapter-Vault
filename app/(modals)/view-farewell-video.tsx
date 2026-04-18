import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Video, ResizeMode } from 'expo-av';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface FarewellVideo {
  id: string;
  title: string;
  description?: string;
  file_data: string;
  file_size: number;
  duration?: number;
  created_at: string;
}

export default function ViewFarewellVideoScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const videoRef = useRef<Video>(null);
  
  const [video, setVideo] = useState<FarewellVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetchVideo();
  }, []);

  const fetchVideo = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/farewell-video`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data) {
          setVideo(data);
        } else {
          Alert.alert('No Video', 'No farewell video found');
          router.back();
        }
      } else {
        Alert.alert('Error', 'Failed to load video');
        router.back();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load video');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Farewell Video',
      'Are you sure you want to delete your farewell video? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await fetch(
                `${API_URL}/api/farewell-video`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Farewell video deleted successfully', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                throw new Error('Delete failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete video');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown duration';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  if (!video) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farewell Video</Text>
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
        {/* Video Player */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: `data:video/mp4;base64,${video.file_data}` }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={(status) => {
              if ('isPlaying' in status) {
                setIsPlaying(status.isPlaying);
              }
            }}
          />
        </View>

        {/* Video Info */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Ionicons name="videocam" size={24} color="#4A90E2" />
            <Text style={styles.title}>{video.title}</Text>
          </View>

          {video.description && (
            <Text style={styles.description}>{video.description}</Text>
          )}

          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Ionicons name="time" size={16} color="#8B949E" />
              <Text style={styles.metaText}>Duration: {formatDuration(video.duration)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="resize" size={16} color="#8B949E" />
              <Text style={styles.metaText}>Size: {formatFileSize(video.file_size)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar" size={16} color="#8B949E" />
              <Text style={styles.metaText}>Recorded: {formatDate(video.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Info Message */}
        <View style={styles.messageBox}>
          <Ionicons name="heart" size={20} color="#F44336" />
          <Text style={styles.messageText}>
            This farewell message will be accessible to your designated executor and loved ones.
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
  videoContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: 300,
  },
  infoCard: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363D',
    marginBottom: 16,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 16,
    color: '#8B949E',
    lineHeight: 24,
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
  messageBox: {
    flexDirection: 'row',
    backgroundColor: '#F4433620',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
});
