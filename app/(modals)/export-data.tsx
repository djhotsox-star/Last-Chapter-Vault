import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ExportDataScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<any>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`${API_URL}/api/export`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setExportData(data);
      } else {
        throw new Error('Export failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!exportData) return;
    try {
      await Clipboard.setStringAsync(JSON.stringify(exportData, null, 2));
      Alert.alert('Copied', 'Export data copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Data</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!exportData ? (
          <View style={styles.preExport}>
            <View style={styles.iconContainer}>
              <Ionicons name="cloud-download" size={64} color="#4A90E2" />
            </View>
            <Text style={styles.mainText}>Export Your Vault Data</Text>
            <Text style={styles.subText}>
              Download a complete summary of your Last Chapter Vault including documents metadata, assets, beneficiaries, photos metadata, and activity logs.
            </Text>

            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={20} color="#FF9800" />
              <Text style={styles.warningText}>
                File contents (documents, photos, videos) are not included in the export for security. Only metadata and records are exported.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
              onPress={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download" size={20} color="#FFFFFF" />
                  <Text style={styles.exportButtonText}>Generate Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.postExport}>
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={styles.successText}>Export Ready</Text>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{exportData.summary?.total_documents || 0}</Text>
                <Text style={styles.summaryLabel}>Documents</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{exportData.summary?.total_assets || 0}</Text>
                <Text style={styles.summaryLabel}>Assets</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{exportData.summary?.total_beneficiaries || 0}</Text>
                <Text style={styles.summaryLabel}>Beneficiaries</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{exportData.summary?.total_photos || 0}</Text>
                <Text style={styles.summaryLabel}>Photos</Text>
              </View>
            </View>

            <View style={styles.exportInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Export Date</Text>
                <Text style={styles.infoValue}>
                  {new Date(exportData.export_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Farewell Video</Text>
                <Text style={styles.infoValue}>
                  {exportData.summary?.has_farewell_video ? 'Yes' : 'No'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Activity Logs</Text>
                <Text style={styles.infoValue}>
                  {exportData.access_logs?.length || 0} entries
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.copyButton} onPress={handleCopyToClipboard}>
              <Ionicons name="copy" size={20} color="#4A90E2" />
              <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={() => {
                setExportData(null);
              }}
            >
              <Ionicons name="refresh" size={20} color="#8B949E" />
              <Text style={styles.regenerateText}>Generate New Export</Text>
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
  preExport: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A90E220',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mainText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subText: {
    fontSize: 15,
    color: '#8B949E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
    marginBottom: 24,
    width: '100%',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#8B949E',
    lineHeight: 18,
  },
  exportButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postExport: {
    gap: 20,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  successText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#8B949E',
  },
  exportInfo: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#8B949E',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  copyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C2533',
    borderRadius: 12,
    height: 52,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  regenerateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  regenerateText: {
    fontSize: 14,
    color: '#8B949E',
  },
});
