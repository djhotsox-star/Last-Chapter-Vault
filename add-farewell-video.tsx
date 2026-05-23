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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function AddFarewellVideoScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  
  const [title, setTitle] = useState('My Final Message');
  const [description, setDescription] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoBase64, setVideoBase64] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(true);

  const handlePickVideo = async (fromCamera: boolean) => {
    setShowUploadMenu(false);
    
    try {
      let result;
      
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 0.7,
          videoMaxDuration: 300, // 5 minutes max
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Photo library permission is required');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          quality: 0.7,
          videoMaxDuration: 300,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setVideoUri(asset.uri);
        setDuration(asset.duration || 0);
        
        // Convert to base64
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        setVideoBase64(base64);
        setFileSize(base64.length);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video');
      console.error('Video picker error:', error);
    }
  };

  const handleUpload = async () => {
    if (!videoBase64) {
      Alert.alert('Error', 'Please select a video first');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch(`${API_URL}/api/farewell-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          file_data: videoBase64,
          file_size: fileSize,
          duration: Math.round(duration),
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Farewell video uploaded successfully!', [
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Final Farewell Video</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Upload Menu */}
        {showUploadMenu && !videoUri && (
          <View style={styles.uploadMenu}>
            <Text style={styles.uploadTitle}>Choose Video Source</Text>
            <TouchableOpacity style={styles.uploadOption} onPress={() => handlePickVideo(true)}>
              <Ionicons name="videocam" size={32} color="#4A90E2" />
              <Text style={styles.uploadOptionText}>Record Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadOption} onPress={() => handlePickVideo(false)}>
              <Ionicons name="folder" size={32} color="#4A90E2" />
              <Text style={styles.uploadOptionText}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Video Preview */}
        {videoUri && (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: videoUri }}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
              isLooping={false}
            />
            <TouchableOpacity
              style={styles.changeVideoButton}
              onPress={() => {
                setVideoUri(null);
                setVideoBase64(null);
                setShowUploadMenu(true);
              }}
            >
              <Ionicons name="refresh" size={16} color="#4A90E2" />
              <Text style={styles.changeVideoText}>Change Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Form */}
        {videoUri && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., My Final Message"
                placeholderTextColor="#8B949E"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a description or context for this video"
                placeholderTextColor="#8B949E"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#4A90E2" />
              <Text style={styles.infoText}>
                This video will replace any existing farewell video. It will be accessible to your designated executor.
              </Text>
            </View>

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
                  <Text style={styles.uploadButtonText}>Upload Video</Text>
                </>
              )}
            </TouchableOpacity>
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
  uploadMenu: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1419',
    borderRadius: 12,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  uploadOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  videoContainer: {
    marginBottom: 24,
  },
  video: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  changeVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  changeVideoText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#8B949E',
    lineHeight: 18,
  },
  uploadButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
