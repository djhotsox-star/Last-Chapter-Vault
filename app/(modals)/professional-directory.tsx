import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Professional {
  id: string;
  name: string;
  profession: string;
  specialty?: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  notes?: string;
}

const PROFESSIONS = [
  { value: 'attorney', label: 'Attorney', icon: 'briefcase', color: '#4A90E2' },
  { value: 'accountant', label: 'Accountant', icon: 'calculator', color: '#9C27B0' },
  { value: 'financial_advisor', label: 'Financial Advisor', icon: 'trending-up', color: '#4CAF50' },
  { value: 'insurance_agent', label: 'Insurance Agent', icon: 'shield', color: '#FF9800' },
  { value: 'other', label: 'Other', icon: 'person', color: '#607D8B' },
];

function getProfInfo(profession: string) {
  return PROFESSIONS.find(p => p.value === profession) || PROFESSIONS[4];
}

export default function ProfessionalDirectoryScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formProfession, setFormProfession] = useState('attorney');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/executor/professionals`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      if (res.ok) setProfessionals(await res.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const resetForm = () => {
    setFormName(''); setFormProfession('attorney'); setFormPhone(''); setFormEmail('');
    setFormCompany(''); setFormSpecialty(''); setFormNotes('');
  };

  const handleAdd = async () => {
    if (!formName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/executor/professionals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({
          name: formName.trim(), profession: formProfession,
          phone: formPhone.trim() || undefined, email: formEmail.trim() || undefined,
          company: formCompany.trim() || undefined, specialty: formSpecialty.trim() || undefined,
          notes: formNotes.trim() || undefined,
        }),
      });
      if (res.ok) { resetForm(); setShowForm(false); fetchData(); }
    } catch (error) {
      Alert.alert('Error', 'Failed to add professional');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (pro: Professional) => {
    Alert.alert('Remove Professional', `Remove ${pro.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/executor/professionals/${pro.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } });
            fetchData();
          } catch (error) { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  const renderPro = ({ item }: { item: Professional }) => {
    const info = getProfInfo(item.profession);
    return (
      <View style={styles.proCard}>
        <View style={[styles.proIcon, { backgroundColor: `${info.color}20` }]}>
          <Ionicons name={info.icon as any} size={22} color={info.color} />
        </View>
        <View style={styles.proContent}>
          <Text style={styles.proName}>{item.name}</Text>
          <Text style={styles.proType}>{info.label}{item.specialty ? ` - ${item.specialty}` : ''}</Text>
          {item.company ? <Text style={styles.proCompany}>{item.company}</Text> : null}
          <View style={styles.proActions}>
            {item.phone ? (
              <TouchableOpacity style={styles.proActionBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                <Ionicons name="call" size={14} color="#4A90E2" />
                <Text style={styles.proActionText}>{item.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {item.email ? (
              <TouchableOpacity style={styles.proActionBtn} onPress={() => Linking.openURL(`mailto:${item.email}`)}>
                <Ionicons name="mail" size={14} color="#4A90E2" />
                <Text style={styles.proActionText}>{item.email}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color="#8B949E" />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><View style={styles.loading}><ActivityIndicator size="large" color="#4A90E2" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professional Directory</Text>
        <TouchableOpacity onPress={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
          <Ionicons name={showForm ? 'close' : 'add'} size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Add Form */}
      {showForm && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
            <Text style={styles.formTitle}>Add Professional</Text>
            <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#8B949E" value={formName} onChangeText={setFormName} />
            <View style={styles.profRow}>
              {PROFESSIONS.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.profChip, formProfession === p.value && { borderColor: p.color, backgroundColor: `${p.color}15` }]}
                  onPress={() => setFormProfession(p.value)}
                >
                  <Ionicons name={p.icon as any} size={14} color={formProfession === p.value ? p.color : '#8B949E'} />
                  <Text style={[styles.profChipText, formProfession === p.value && { color: p.color }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Company/Firm" placeholderTextColor="#8B949E" value={formCompany} onChangeText={setFormCompany} />
            <TextInput style={styles.input} placeholder="Specialty" placeholderTextColor="#8B949E" value={formSpecialty} onChangeText={setFormSpecialty} />
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Phone" placeholderTextColor="#8B949E" value={formPhone} onChangeText={setFormPhone} keyboardType="phone-pad" />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Email" placeholderTextColor="#8B949E" value={formEmail} onChangeText={setFormEmail} keyboardType="email-address" />
            </View>
            <TextInput style={[styles.input, { height: 60 }]} placeholder="Notes" placeholderTextColor="#8B949E" value={formNotes} onChangeText={setFormNotes} multiline textAlignVertical="top" />
            <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.5 }]} onPress={handleAdd} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Add Professional</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Directory List */}
      {!showForm && (
        professionals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#8B949E" />
            <Text style={styles.emptyText}>No professionals yet</Text>
            <Text style={styles.emptySubtext}>Add attorneys, accountants, and advisors to your directory</Text>
          </View>
        ) : (
          <FlatList
            data={professionals}
            keyExtractor={(item) => item.id}
            renderItem={renderPro}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchData(); }} tintColor="#4A90E2" />}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1419' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  formContainer: { maxHeight: 420, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  formContent: { padding: 16, gap: 10 },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  input: { backgroundColor: '#1C2128', borderRadius: 10, borderWidth: 1, borderColor: '#30363D', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#FFFFFF' },
  profRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#30363D', gap: 4 },
  profChipText: { fontSize: 12, fontWeight: '600', color: '#8B949E' },
  row: { flexDirection: 'row', gap: 8 },
  saveBtn: { backgroundColor: '#4A90E2', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  listContent: { padding: 16, paddingBottom: 40 },
  proCard: { flexDirection: 'row', backgroundColor: '#1C2128', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#30363D', gap: 12 },
  proIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  proContent: { flex: 1 },
  proName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  proType: { fontSize: 13, color: '#8B949E', marginBottom: 4 },
  proCompany: { fontSize: 13, color: '#4A90E2', marginBottom: 6 },
  proActions: { gap: 4 },
  proActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proActionText: { fontSize: 12, color: '#4A90E2' },
  deleteBtn: { padding: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  emptySubtext: { fontSize: 14, color: '#8B949E', textAlign: 'center', paddingHorizontal: 32 },
});
