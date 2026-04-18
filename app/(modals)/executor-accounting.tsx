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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface AccountingEntry {
  id: string;
  entry_type: string;
  amount: number;
  description: string;
  category?: string;
  date: string;
}

interface Summary {
  total_income: number;
  total_expenses: number;
  total_distributions: number;
  balance: number;
  total_entries: number;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  income: { label: 'Income', color: '#4CAF50', icon: 'arrow-down-circle' },
  expense: { label: 'Expense', color: '#F44336', icon: 'arrow-up-circle' },
  distribution: { label: 'Distribution', color: '#FF9800', icon: 'gift' },
};

export default function ExecutorAccountingScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense' | 'distribution'>('income');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/executor/accounting`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(`${API_URL}/api/executor/accounting/summary`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
      ]);
      if (entriesRes.ok) setEntries(await entriesRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAdd = async () => {
    const amt = parseFloat(formAmount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (!formDesc.trim()) { Alert.alert('Error', 'Enter a description'); return; }

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/executor/accounting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ entry_type: formType, amount: amt, description: formDesc.trim(), date: formDate || undefined }),
      });
      if (res.ok) {
        setFormAmount(''); setFormDesc(''); setFormDate(''); setShowForm(false);
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add entry');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (entry: AccountingEntry) => {
    Alert.alert('Delete Entry', `Delete "${entry.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/executor/accounting/${entry.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` } });
            fetchData();
          } catch (error) { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderEntry = ({ item }: { item: AccountingEntry }) => {
    const cfg = TYPE_CONFIG[item.entry_type] || TYPE_CONFIG.expense;
    return (
      <View style={styles.entryCard}>
        <View style={[styles.entryIcon, { backgroundColor: `${cfg.color}20` }]}>
          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
        </View>
        <View style={styles.entryContent}>
          <Text style={styles.entryDesc}>{item.description}</Text>
          <Text style={styles.entryDate}>{item.date}</Text>
        </View>
        <View style={styles.entryRight}>
          <Text style={[styles.entryAmount, { color: cfg.color }]}>
            {item.entry_type === 'income' ? '+' : '-'}{fmt(item.amount)}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={16} color="#8B949E" />
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Estate Accounting</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? 'close' : 'add'} size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={styles.summarySection}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Estate Balance</Text>
            <Text style={[styles.balanceAmount, { color: summary.balance >= 0 ? '#4CAF50' : '#F44336' }]}>{fmt(summary.balance)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={[styles.miniCard, { borderLeftColor: '#4CAF50' }]}>
              <Text style={styles.miniLabel}>Income</Text>
              <Text style={[styles.miniValue, { color: '#4CAF50' }]}>{fmt(summary.total_income)}</Text>
            </View>
            <View style={[styles.miniCard, { borderLeftColor: '#F44336' }]}>
              <Text style={styles.miniLabel}>Expenses</Text>
              <Text style={[styles.miniValue, { color: '#F44336' }]}>{fmt(summary.total_expenses)}</Text>
            </View>
            <View style={[styles.miniCard, { borderLeftColor: '#FF9800' }]}>
              <Text style={styles.miniLabel}>Distributed</Text>
              <Text style={[styles.miniValue, { color: '#FF9800' }]}>{fmt(summary.total_distributions)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Add Entry Form */}
      {showForm && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.form}>
            <View style={styles.typeRow}>
              {(['income', 'expense', 'distribution'] as const).map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <TouchableOpacity key={t} style={[styles.typeBtn, formType === t && { borderColor: cfg.color, backgroundColor: `${cfg.color}15` }]} onPress={() => setFormType(t)}>
                    <Ionicons name={cfg.icon as any} size={16} color={formType === t ? cfg.color : '#8B949E'} />
                    <Text style={[styles.typeBtnText, formType === t && { color: cfg.color }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.formInput, { flex: 0.4 }]} placeholder="Amount" placeholderTextColor="#8B949E" value={formAmount} onChangeText={setFormAmount} keyboardType="decimal-pad" />
              <TextInput style={[styles.formInput, { flex: 0.6 }]} placeholder="Description" placeholderTextColor="#8B949E" value={formDesc} onChangeText={setFormDesc} />
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.formInput, { flex: 1 }]} placeholder="Date (YYYY-MM-DD, optional)" placeholderTextColor="#8B949E" value={formDate} onChangeText={setFormDate} />
              <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.5 }]} onPress={handleAdd} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calculator-outline" size={64} color="#8B949E" />
          <Text style={styles.emptyText}>No accounting entries yet</Text>
          <Text style={styles.emptySubtext}>Track estate income, expenses, and distributions</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchData(); }} tintColor="#4A90E2" />}
        />
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
  summarySection: { padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  balanceCard: { backgroundColor: '#1C2128', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#30363D' },
  balanceLabel: { fontSize: 13, color: '#8B949E', marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: 'bold' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  miniCard: { flex: 1, backgroundColor: '#1C2128', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderWidth: 1, borderColor: '#30363D' },
  miniLabel: { fontSize: 11, color: '#8B949E', marginBottom: 4 },
  miniValue: { fontSize: 14, fontWeight: '700' },
  form: { padding: 16, backgroundColor: '#1C2128', borderBottomWidth: 1, borderBottomColor: '#30363D', gap: 10 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#30363D', gap: 6 },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#8B949E' },
  formRow: { flexDirection: 'row', gap: 8 },
  formInput: { backgroundColor: '#0F1419', borderRadius: 10, borderWidth: 1, borderColor: '#30363D', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#FFFFFF' },
  saveBtn: { backgroundColor: '#4A90E2', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  listContent: { padding: 16, paddingBottom: 40 },
  entryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C2128', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#30363D', gap: 12 },
  entryIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  entryContent: { flex: 1 },
  entryDesc: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  entryDate: { fontSize: 12, color: '#8B949E' },
  entryRight: { alignItems: 'flex-end', gap: 6 },
  entryAmount: { fontSize: 15, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  emptySubtext: { fontSize: 14, color: '#8B949E', textAlign: 'center' },
});
