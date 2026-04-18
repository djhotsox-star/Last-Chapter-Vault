import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  due_date?: string;
  notes?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All', icon: 'apps' },
  { value: 'immediate', label: 'Immediate', icon: 'flash' },
  { value: 'legal', label: 'Legal', icon: 'document-text' },
  { value: 'financial', label: 'Financial', icon: 'cash' },
  { value: 'notifications', label: 'Notify', icon: 'notifications' },
  { value: 'tax', label: 'Tax', icon: 'calculator' },
  { value: 'distribution', label: 'Distribute', icon: 'gift' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: '#F44336',
  medium: '#FF9800',
  low: '#4CAF50',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: '#8B949E', icon: 'ellipse-outline' },
  in_progress: { label: 'In Progress', color: '#FF9800', icon: 'time' },
  completed: { label: 'Done', color: '#4CAF50', icon: 'checkmark-circle' },
};

export default function ExecutorTasksScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeCategory]);

  const fetchData = async () => {
    try {
      let url = `${API_URL}/api/executor/tasks`;
      if (activeCategory !== 'all') url += `?category=${activeCategory}`;
      
      const [tasksRes, statsRes] = await Promise.all([
        fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(`${API_URL}/api/executor/tasks/stats`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
      ]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleInit = async () => {
    try {
      const res = await fetch(`${API_URL}/api/executor/tasks/init`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) {
        Alert.alert('Success', 'Default task checklist created!');
        fetchData();
      } else {
        const err = await res.json();
        Alert.alert('Info', err.detail || 'Could not initialize tasks');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize tasks');
    }
  };

  const cycleStatus = async (task: Task) => {
    const next = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'pending';
    try {
      const res = await fetch(`${API_URL}/api/executor/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = (task: Task) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/executor/tasks/${task.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete task');
          }
        },
      },
    ]);
  };

  const handleAddTask = async () => {
    if (!newTitle.trim()) { Alert.alert('Error', 'Title is required'); return; }
    try {
      const res = await fetch(`${API_URL}/api/executor/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ title: newTitle.trim(), due_date: newDueDate || undefined, category: activeCategory === 'all' ? 'other' : activeCategory }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewDueDate('');
        setShowAddForm(false);
        fetchData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add task');
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
  };

  const renderTask = ({ item }: { item: Task }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const overdue = isOverdue(item.due_date) && item.status !== 'completed';

    return (
      <View style={[styles.taskCard, item.status === 'completed' && styles.taskCompleted]}>
        <TouchableOpacity style={styles.statusButton} onPress={() => cycleStatus(item)}>
          <Ionicons name={statusCfg.icon as any} size={26} color={statusCfg.color} />
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text style={[styles.taskTitle, item.status === 'completed' && styles.taskTitleDone]} numberOfLines={2}>
              {item.title}
            </Text>
            <TouchableOpacity onPress={() => handleDeleteTask(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={20} color="#8B949E" />
            </TouchableOpacity>
          </View>
          {item.description ? (
            <Text style={styles.taskDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <View style={styles.taskMeta}>
            <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLORS[item.priority] || '#8B949E'}20` }]}>
              <Text style={[styles.priorityText, { color: PRIORITY_COLORS[item.priority] || '#8B949E' }]}>
                {item.priority}
              </Text>
            </View>
            {item.due_date ? (
              <View style={[styles.dueBadge, overdue && styles.overdueBadge]}>
                <Ionicons name="calendar" size={12} color={overdue ? '#F44336' : '#8B949E'} />
                <Text style={[styles.dueText, overdue && styles.overdueText]}>{item.due_date}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4A90E2" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Executor Tasks</Text>
        <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)}>
          <Ionicons name={showAddForm ? 'close' : 'add'} size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      {stats && stats.total > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.completed}/{stats.total}</Text>
            <Text style={styles.statLbl}>Done</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${stats.completion_rate}%` }]} />
          </View>
          <Text style={styles.statPct}>{stats.completion_rate}%</Text>
          {stats.overdue > 0 && (
            <View style={styles.overdueStat}>
              <Ionicons name="warning" size={14} color="#F44336" />
              <Text style={styles.overdueStatText}>{stats.overdue} overdue</Text>
            </View>
          )}
        </View>
      )}

      {/* Category Filters */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, activeCategory === item.value && styles.categoryChipActive]}
            onPress={() => setActiveCategory(item.value)}
          >
            <Ionicons name={item.icon as any} size={14} color={activeCategory === item.value ? '#4A90E2' : '#8B949E'} />
            <Text style={[styles.categoryText, activeCategory === item.value && styles.categoryTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Add Task Form */}
      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput style={styles.addInput} placeholder="Task title..." placeholderTextColor="#8B949E" value={newTitle} onChangeText={setNewTitle} />
          <TextInput style={[styles.addInput, { flex: 0.6 }]} placeholder="Due (YYYY-MM-DD)" placeholderTextColor="#8B949E" value={newDueDate} onChangeText={setNewDueDate} />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddTask}>
            <Ionicons name="checkmark" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Task List */}
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkbox-outline" size={64} color="#8B949E" />
          <Text style={styles.emptyText}>No tasks yet</Text>
          <Text style={styles.emptySubtext}>Initialize the default checklist or add tasks manually</Text>
          <TouchableOpacity style={styles.initButton} onPress={handleInit}>
            <Ionicons name="flash" size={20} color="#FFF" />
            <Text style={styles.initButtonText}>Load Default Checklist</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchData(); }} tintColor="#4A90E2" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1419' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  statsBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1C2128', borderBottomWidth: 1, borderBottomColor: '#30363D', gap: 10 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  statLbl: { fontSize: 10, color: '#8B949E' },
  progressBarBg: { flex: 1, height: 8, backgroundColor: '#30363D', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
  statPct: { fontSize: 14, fontWeight: '700', color: '#4CAF50' },
  overdueStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overdueStatText: { fontSize: 12, color: '#F44336', fontWeight: '600' },
  categoryList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#30363D', gap: 6 },
  categoryChipActive: { borderColor: '#4A90E2', backgroundColor: '#1C2533' },
  categoryText: { fontSize: 12, color: '#8B949E', fontWeight: '600' },
  categoryTextActive: { color: '#4A90E2' },
  addForm: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#30363D' },
  addInput: { flex: 1, backgroundColor: '#1C2128', borderRadius: 10, borderWidth: 1, borderColor: '#30363D', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#FFFFFF' },
  addBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  taskCard: { flexDirection: 'row', backgroundColor: '#1C2128', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#30363D', gap: 12 },
  taskCompleted: { opacity: 0.6 },
  statusButton: { justifyContent: 'center', padding: 4 },
  taskContent: { flex: 1 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#8B949E' },
  taskDesc: { fontSize: 13, color: '#8B949E', marginBottom: 8 },
  taskMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  dueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#30363D' },
  overdueBadge: { backgroundColor: '#F4433620' },
  dueText: { fontSize: 11, color: '#8B949E' },
  overdueText: { color: '#F44336', fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  emptySubtext: { fontSize: 14, color: '#8B949E', textAlign: 'center' },
  initButton: { flexDirection: 'row', backgroundColor: '#4A90E2', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, gap: 8, marginTop: 12, alignItems: 'center' },
  initButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
