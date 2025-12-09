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
  KeyboardAvoidingView
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
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

  // Modal States
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null); // For photo modal
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
      // Don't set full page loading for refreshes, just background update
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

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStaffDetails(), fetchAttendance()]).finally(() => setLoading(false));
  }, []);

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

  const renderProfileCard = () => (
    <View style={styles.card}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.profileName}>{staff.fullName}</Text>
        <Text style={styles.profileUsername}>@{staff.username}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{staff.role || 'STAFF'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Created At</Text>
        <Text style={styles.infoValue}>
          {new Date(staff.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Staff ID</Text>
        <Text style={styles.infoValue}>...{staff._id?.slice(-6)}</Text>
      </View>
    </View>
  );

  const renderActionsCard = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Account Actions</Text>

      <View style={styles.actionList}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setNewName(staff.fullName);
            setIsEditNameModalVisible(true);
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="create-outline" size={20} color="#007bff" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Edit Details</Text>
            <Text style={styles.actionDesc}>Change display name</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setNewPassword('');
            setIsPasswordModalVisible(true);
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#fff3cd' }]}>
            <Ionicons name="key-outline" size={20} color="#856404" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Change Credentials</Text>
            <Text style={styles.actionDesc}>Update password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteStaff}
        >
          <Ionicons name="trash-outline" size={20} color="#dc3545" style={{ marginRight: 8 }} />
          <Text style={styles.deleteButtonText}>Delete Staff Member</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAttendanceCard = () => {
    // Prepare marked dates for calendar
    const markedDates = {};
    attendanceLogs.forEach(log => {
      // safely extract date part (YYYY-MM-DD)
      const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
      markedDates[dateStr] = { marked: true, dotColor: '#10B981' };
    });

    if (selectedDate) {
      markedDates[selectedDate] = {
        ...(markedDates[selectedDate] || {}),
        selected: true,
        selectedColor: '#2094f3'
      };
    }

    // Filter logs based on selection
    const filteredLogs = selectedDate
      ? attendanceLogs.filter(log => new Date(log.timestamp).toISOString().split('T')[0] === selectedDate)
      : attendanceLogs;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Attendance History</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {selectedDate && (
              <TouchableOpacity onPress={() => setSelectedDate(null)} style={{ marginRight: 8 }}>
                <Text style={{ color: '#2094f3', fontWeight: '600' }}>Show All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { setSelectedDate(null); fetchAttendance(); }} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <Calendar
          markedDates={markedDates}
          onDayPress={day => {
            setSelectedDate(current => current === day.dateString ? null : day.dateString);
          }}
          theme={{
            selectedDayBackgroundColor: '#2094f3',
            todayTextColor: '#2094f3',
            arrowColor: '#2094f3',
            dotColor: '#10B981',
          }}
          style={{ marginBottom: 16, borderRadius: 12, borderColor: '#eee', borderWidth: 1 }}
        />

        {filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>
              {selectedDate ? `No records for ${selectedDate}` : 'No attendance records found.'}
            </Text>
          </View>
        ) : (
          <View style={styles.attendanceList}>
            {filteredLogs.map((log) => (
              <View key={log._id} style={styles.attendanceItem}>
                <View style={[
                  styles.attendanceIcon,
                  { backgroundColor: log.type === 'login' ? '#D1FAE5' : '#FEE2E2' }
                ]}>
                  <Ionicons
                    name={log.type === 'login' ? "enter" : "exit"}
                    size={20}
                    color={log.type === 'login' ? '#10B981' : '#EF4444'}
                  />
                </View>

                <View style={styles.attendanceContent}>
                  <Text style={styles.attendanceTitle}>
                    {log.type === 'login' ? 'Checked In' : 'Checked Out'}
                  </Text>
                  <Text style={styles.attendanceTime}>
                    {new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <View style={styles.attendanceLocation}>
                    <Ionicons name="location-sharp" size={12} color="#6B7280" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {log.location ?
                        (log.location.displayText || `${log.location.latitude?.toFixed(4)}, ${log.location.longitude?.toFixed(4)}`)
                        : 'Location unknown'}
                    </Text>
                  </View>
                </View>

                {log.photo && (
                  <TouchableOpacity
                    style={styles.viewPhotoButton}
                    onPress={() => setSelectedAttendance(log)}
                  >
                    <Ionicons name="image-outline" size={20} color="#007bff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // --- Modal Content Renderers ---

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2094f3" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{staff.fullName}</Text>
          <Text style={styles.headerSubtitle}>Staff Details</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2094f3" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {renderProfileCard()}
          {renderActionsCard()}
          {renderAttendanceCard()}
        </ScrollView>
      )}

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
                <Ionicons name="warning" size={16} color="#856404" />
                <Text style={styles.warningText}>This will immediately update login credentials.</Text>
              </View>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
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
        animationType="slide"
        onRequestClose={() => setSelectedAttendance(null)}
      >
        <View style={styles.modalOverlay}>
          {selectedAttendance && (
            <View style={[styles.modalContainer, { maxWidth: 500 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Attendance Photo</Text>
                <TouchableOpacity onPress={() => setSelectedAttendance(null)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <View style={styles.photoWrapper}>
                  <Image
                    source={{ uri: selectedAttendance.photo }}
                    style={styles.attendancePhoto}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.photoMeta}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Type:</Text>
                    <Text style={[
                      styles.metaValue,
                      { color: selectedAttendance.type === 'login' ? '#10B981' : '#EF4444' }
                    ]}>
                      {selectedAttendance.type === 'login' ? 'Check In' : 'Check Out'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Time:</Text>
                    <Text style={styles.metaValue}>{new Date(selectedAttendance.timestamp).toLocaleString()}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Location:</Text>
                    <Text style={[styles.metaValue, { maxWidth: '70%' }]} numberOfLines={2}>
                      {selectedAttendance.location ?
                        (selectedAttendance.location.displayText || `${selectedAttendance.location.latitude?.toFixed(5)}, ${selectedAttendance.location.longitude?.toFixed(5)}`)
                        : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2094f3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f9',
  },

  // Header
  header: {
    backgroundColor: '#2094f3',
    paddingTop: Platform.OS === 'ios' ? (isIpad ? 20 : 10) : 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  headerTitle: {
    fontSize: isIpad ? 24 : 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },

  contentContainer: {
    padding: isIpad ? 30 : 16,
    gap: 20,
    backgroundColor: '#f4f6f9',
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Profile Card
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 4,
    borderColor: '#f0f9ff',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  profileUsername: {
    color: '#6b7280',
    fontSize: 15,
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 12,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  infoValue: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 14,
  },

  // Action Buttons
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionList: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#feb2b2',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },

  // Attendance
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#9ca3af',
    marginTop: 8,
    fontStyle: 'italic'
  },
  attendanceList: {
    gap: 12,
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attendanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  attendanceContent: {
    flex: 1,
  },
  attendanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  attendanceTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  attendanceLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  viewPhotoButton: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginLeft: 8
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
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden'
  },
  eyeButton: {
    padding: 12,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
    flex: 1
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  btnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  btnSecondaryText: {
    color: '#374151',
    fontWeight: '500',
  },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '500',
  },

  // Photo Modal Specific
  photoWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  attendancePhoto: {
    width: '100%',
    height: '100%',
  },
  photoMeta: {
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  metaLabel: {
    color: '#6b7280',
    fontWeight: '500',
  },
  metaValue: {
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'right',
  }
});

export default StaffDetailsScreen;