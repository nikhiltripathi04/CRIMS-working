import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  RefreshControl
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const StaffDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { API_BASE_URL, token } = useAuth();

  // Initial params
  const initialStaff = route.params?.staff || {};

  // State
  const [staff, setStaff] = useState(initialStaff);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Form States
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- API Interactions ---

  const fetchStaffDetails = useCallback(async () => {
    if (!staff._id || !token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const updatedStaff = response.data.data.find(s => s._id === staff._id);
        if (updatedStaff) {
          setStaff(updatedStaff);
        }
      }
    } catch (error) {
      console.log('Fetch error:', error);
    }
  }, [API_BASE_URL, staff._id, token]);

  const fetchAttendance = useCallback(async () => {
    if (!staff._id || !token) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/staff/${staff._id}/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setAttendanceLogs(response.data.data || []);
      }
    } catch (error) {
      console.log('Attendance fetch error:', error);
    }
  }, [API_BASE_URL, staff._id, token]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStaffDetails(), fetchAttendance()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStaffDetails(), fetchAttendance()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Computed Stats ---

  const getStats = () => {
    const totalLogs = attendanceLogs.length;
    const lastSeen = totalLogs > 0 ? new Date(attendanceLogs[0].timestamp).toLocaleDateString() : 'N/A';
    // Simplified status: Active if marked present today
    const today = new Date().toDateString();
    const isPresentToday = attendanceLogs.some(log => new Date(log.timestamp).toDateString() === today && log.type === 'login');

    return { totalLogs, lastSeen, isPresentToday };
  };

  const stats = getStats();

  // --- Handlers ---

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/staff/${staff._id}`,
        { fullName: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setStaff(prev => ({ ...prev, fullName: newName }));
        setIsEditNameModalVisible(false);
        Alert.alert('Success', 'Staff name updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Password cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/staff/${staff._id}`,
        { password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setIsPasswordModalVisible(false);
        setNewPassword('');
        Alert.alert('Success', 'Password updated successfully');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = () => {
    Alert.alert(
      'Delete Staff Member',
      `Are you sure you want to delete ${staff.fullName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_BASE_URL}/api/staff/${staff._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete staff member');
            }
          }
        }
      ]
    );
  };

  // --- Render Sections ---

  const renderStatsRow = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Ionicons name="list-outline" size={24} color="#AF52DE" />
        <Text style={styles.statNumber}>{stats.totalLogs}</Text>
        <Text style={styles.statLabel}>Total Logs</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="calendar-outline" size={24} color="#28a745" />
        <Text style={styles.statNumber}>{stats.lastSeen}</Text>
        <Text style={styles.statLabel}>Last Seen</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="pulse-outline" size={24} color={stats.isPresentToday ? "#28a745" : "#6c757d"} />
        <Text style={[styles.statStatus, { color: stats.isPresentToday ? "#28a745" : "#6c757d" }]}>
          {stats.isPresentToday ? 'Active' : 'Inactive'}
        </Text>
        <Text style={styles.statLabel}>Status</Text>
      </View>
    </View>
  );

  const renderAttendanceCard = () => {
    // Prepare marked dates for calendar
    const markedDates = {};
    attendanceLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
      markedDates[dateStr] = { marked: true, dotColor: '#AF52DE' };
    });

    if (selectedDate) {
      markedDates[selectedDate] = {
        ...(markedDates[selectedDate] || {}),
        selected: true,
        selectedColor: '#AF52DE'
      };
    }

    const filteredLogs = selectedDate
      ? attendanceLogs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] === selectedDate)
      : attendanceLogs;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Attendance History</Text>
          {selectedDate && (
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <Text style={styles.clearFilterText}>Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>

        <Calendar
          markedDates={markedDates}
          onDayPress={day => {
            setSelectedDate(current => current === day.dateString ? null : day.dateString);
          }}
          theme={{
            selectedDayBackgroundColor: '#AF52DE',
            todayTextColor: '#AF52DE',
            arrowColor: '#AF52DE',
            dotColor: '#AF52DE',
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '500',
          }}
          style={styles.calendar}
        />

        <View style={styles.logsContainer}>
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>
                {selectedDate ? `No records for ${selectedDate}` : 'No attendance records found.'}
              </Text>
            </View>
          ) : (
            filteredLogs.map((log) => (
              <View key={log._id} style={styles.attendanceItem}>
                <View style={[
                  styles.logIconContainer,
                  { backgroundColor: log.type === 'login' ? '#F3E5F5' : '#FFEBEE' }
                ]}>
                  <Ionicons
                    name={log.type === 'login' ? "log-in-outline" : "log-out-outline"}
                    size={18}
                    color={log.type === 'login' ? '#7B1FA2' : '#D32F2F'}
                  />
                </View>

                <View style={styles.attendanceContent}>
                  <Text style={styles.attendanceTitle}>
                    {log.type === 'login' ? 'Check In' : 'Check Out'}
                  </Text>
                  <Text style={styles.attendanceTime}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.timestamp).toLocaleDateString()}
                  </Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={12} color="#666" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {log.location ?
                        (log.location.displayText || `${log.location.latitude?.toFixed(4)}, ${log.location.longitude?.toFixed(4)}`)
                        : 'Location not available'}
                    </Text>
                  </View>
                </View>

                {log.photo && (
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => setSelectedAttendance(log)}
                  >
                    <Ionicons name="image-outline" size={20} color="#AF52DE" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  const renderActionsCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Account Actions</Text>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setNewName(staff.fullName);
            setIsEditNameModalVisible(true);
          }}
        >
          <View style={[styles.actionIconCtx, { backgroundColor: '#F3E5F5' }]}>
            <Ionicons name="create-outline" size={20} color="#8E24AA" />
          </View>
          <View style={styles.actionTextCtx}>
            <Text style={styles.actionButtonTitle}>Edit Name</Text>
            <Text style={styles.actionButtonDesc}>Update display name</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setNewPassword('');
            setIsPasswordModalVisible(true);
          }}
        >
          <View style={[styles.actionIconCtx, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="key-outline" size={20} color="#F57C00" />
          </View>
          <View style={styles.actionTextCtx}>
            <Text style={styles.actionButtonTitle}>Change Password</Text>
            <Text style={styles.actionButtonDesc}>Update login credentials</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteAction]}
          onPress={handleDeleteStaff}
        >
          <View style={[styles.actionIconCtx, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="trash-outline" size={20} color="#D32F2F" />
          </View>
          <View style={styles.actionTextCtx}>
            <Text style={[styles.actionButtonTitle, { color: '#D32F2F' }]}>Delete Account</Text>
            <Text style={styles.actionButtonDesc}>Permanently remove</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#AF52DE" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#AF52DE', '#9C27B0']}
          style={styles.headerGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>{staff.fullName}</Text>
                <Text style={styles.headerSubtitle}>@{staff.username} • {staff.role || 'STAFF'}</Text>
              </View>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#AF52DE" style={{ marginTop: 40 }} />
        ) : (
          <>
            {renderStatsRow()}
            {renderAttendanceCard()}
            {renderActionsCard()}
          </>
        )}
      </ScrollView>

      {/* --- Modals --- */}

      {/* Edit Name Modal */}
      <Modal
        visible={isEditNameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditNameModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <TouchableOpacity onPress={() => setIsEditNameModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter full name"
                autoFocus={true}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsEditNameModalVisible(false)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleUpdateName} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setIsPasswordModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#856404" />
                <Text style={styles.warningText}>This will immediately update login credentials.</Text>
              </View>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => setIsPasswordModalVisible(false)}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleChangePassword} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Photo View Modal */}
      <Modal
        visible={!!selectedAttendance}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAttendance(null)}
      >
        <View style={styles.modalOverlay}>
          {selectedAttendance && (
            <View style={[styles.modalContainer, { width: '90%', maxWidth: 400 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Attendance Photo</Text>
                <TouchableOpacity onPress={() => setSelectedAttendance(null)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Image
                  source={{ uri: selectedAttendance.photo }}
                  style={styles.attendancePhoto}
                  resizeMode="contain"
                />
                <View style={styles.photoMeta}>
                  <Text style={styles.photoTime}>
                    {new Date(selectedAttendance.timestamp).toLocaleString()}
                  </Text>
                  <Text style={styles.photoLocation}>
                    {selectedAttendance.location?.displayText || 'Location Unknown'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerContainer: {
    width: '100%',
  },
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 20,
  },
  safeArea: {
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#AF52DE',
  },
  contentScroll: {
    padding: 20,
    gap: 20,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 4,
  },
  statStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },

  // Card Common
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 15,
  },
  clearFilterText: {
    color: '#AF52DE',
    fontSize: 13,
    fontWeight: '600',
  },

  // Attendance Section
  calendar: {
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  logsContainer: {
    gap: 12,
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  logIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attendanceContent: {
    flex: 1,
  },
  attendanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  attendanceTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  photoButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Actions Section
  actionGrid: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eff0f1',
  },
  actionIconCtx: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextCtx: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonDesc: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  deleteAction: {
    borderColor: '#ffebee',
    backgroundColor: '#fffafa',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  eyeButton: {
    padding: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  btnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  btnSecondaryText: {
    color: '#333',
    fontWeight: '600',
  },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#AF52DE',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '600',
  },
  attendancePhoto: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  photoMeta: {
    marginTop: 15,
  },
  photoTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  photoLocation: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default StaffDetailsScreen;