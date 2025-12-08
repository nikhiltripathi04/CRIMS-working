import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Dimensions,
  Image,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

const { width: screenWidth } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const SupervisorDashboard = ({ navigation }) => {
  const { user, logout, API_BASE_URL, token } = useAuth();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(false);

  // Attendance State
  const [cameraVisible, setCameraVisible] = useState(false);
  const [attendanceType, setAttendanceType] = useState(null); // 'login' or 'logout'
  const [capturedImage, setCapturedImage] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // Status State
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            // Reset state
            setSite(null);
            await logout();
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (user?.assignedSites?.length > 0) {
      if (typeof user.assignedSites[0] === 'object') {
        setSites(user.assignedSites);
        if (!selectedSiteId) {
          setSelectedSiteId(user.assignedSites[0]._id);
        }
      }
    } else if (user?.siteId) {
      const sid = user.siteId._id || user.siteId;
      setSelectedSiteId(sid);
    }
  }, [user]);

  const checkMyAttendance = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await axios.get(`${API_BASE_URL}/api/attendance/my-records`, {
        params: {
          startDate: today.toISOString(),
          endDate: tomorrow.toISOString()
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const records = response.data.data;
        const loggedIn = records.some(r => r.type === 'login');
        const loggedOut = records.some(r => r.type === 'logout');
        setHasCheckedIn(loggedIn);
        setHasCheckedOut(loggedOut);
      }
    } catch (error) {
      console.error('Check attendance status error:', error);
    }
  };

  const fetchData = async () => {
    // Always check attendance status (independent of site)
    checkMyAttendance();

    if (selectedSiteId) {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_BASE_URL}/api/sites/${selectedSiteId}?supervisorId=${user.id}`
        );

        if (response.data.success) {
          setSite(response.data.data);
        }
      } catch (error) {
        console.error('Fetch site details error:', error);
        // Alert.alert('Error', 'Failed to fetch site details');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSiteId]);

  // --- ATTENDANCE LOGIC ---

  const getLocation = async () => {
    setFetchingLocation(true);
    setLocationData(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        setFetchingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      // Reverse Geocode
      let address = "Unknown Location";
      try {
        let reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        if (reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          address = `${place.name || ''} ${place.street || ''}, ${place.city || ''}, ${place.region || ''}`;
        }
      } catch (e) {
        console.log("Geocode error", e);
        address = `Lat: ${location.coords.latitude.toFixed(5)}, Long: ${location.coords.longitude.toFixed(5)}`;
      }

      setLocationData({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        displayText: address, // Unified field for backend
        address: address // Fallback
      });

      // No longer need immediate location check here as we await it differently or just rely on state
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location');
      console.error(error);
    } finally {
      setFetchingLocation(false);
    }
  };

  const startAttendance = async (type) => {
    if (!permission) {
      // Camera permissions are still loading
      return;
    }
    if (!permission.granted) {
      requestPermission();
    }
    setAttendanceType(type);
    setCapturedImage(null);
    setLocationData(null);
    setCameraVisible(true);
    // Fetch location concurrently
    getLocation();
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      // Use base64 for data URI
      setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
    }
  };

  const cancelAttendance = () => {
    setCameraVisible(false);
    setCapturedImage(null);
    setAttendanceType(null);
  };

  const submitAttendance = async () => {
    if (!locationData) {
      Alert.alert('Wait', 'Still fetching location...');
      return;
    }
    if (!capturedImage) {
      Alert.alert('Error', 'Photo is required');
      return;
    }

    setSubmittingAttendance(true);

    try {
      const userIdVal = user.id || user._id;

      const payload = {
        type: attendanceType,
        photo: capturedImage,
        location: locationData,
        date: new Date().toISOString(),
        user: userIdVal,
        userId: userIdVal,
        tenant_id: user.tenant_id || user.tenantId || null
      };

      const response = await axios.post(`${API_BASE_URL}/api/attendance`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        Alert.alert('Success', `Successfully Marked: ${attendanceType === 'login' ? 'Check In' : 'Check Out'}`);
        setCameraVisible(false);
        setCapturedImage(null);
        fetchData(); // Refresh stats AND attendance buttons
      } else {
        throw new Error(response.data.message || 'Failed');
      }

    } catch (error) {
      console.error("Attendance submit error: ", error);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to submit');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  // --- STATS HELPER ---
  const getTodayAttendance = () => {
    if (!site || !site.workers) return { present: 0, total: 0, absent: 0, notMarked: 0 };
    const today = new Date().toDateString();
    let presentCount = 0;
    let absentCount = 0;
    let notMarkedCount = 0;
    let totalWorkers = site.workers.length;

    site.workers.forEach(worker => {
      const sortedAttendance = worker.attendance?.sort((a, b) => new Date(b.date) - new Date(a.date)) || [];
      const todayAttendance = sortedAttendance.find(att => new Date(att.date).toDateString() === today);
      if (todayAttendance) {
        if (todayAttendance.status === 'present') presentCount++;
        else if (todayAttendance.status === 'absent') absentCount++;
      } else {
        notMarkedCount++;
      }
    });

    return { present: presentCount, absent: absentCount, notMarked: notMarkedCount, total: totalWorkers };
  };

  const getSuppliesStats = () => {
    if (!site || !site.supplies) return { items: 0 };
    return { items: site.supplies.length };
  };

  const getUnreadAnnouncementsCount = () => {
    if (!site || !site.announcements) return 0;
    return site.announcements.filter(announcement => !announcement.readBy.some(read => read.user === user?.id)).length;
  };

  const getAttendancePercentage = () => {
    const att = getTodayAttendance();
    if (att.total === 0) return 0;
    return Math.round((att.present / att.total) * 100);
  };

  if (!user) return null;

  if (loading && !site) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2094f3" />
        <Text style={styles.loadingText}>Loading site details...</Text>
      </View>
    );
  }

  // Fallback if site load failed but not loading
  // REMOVED BLOCKING CHECK to allow other features to work

  const siteName = site?.siteName || 'No Site Assigned';
  const siteLocation = site?.location || null;
  const siteDescription = site?.description || null;

  const attendance = getTodayAttendance();
  const suppliesStats = getSuppliesStats();
  const attendancePercentage = getAttendancePercentage();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Supervisor Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={isIpad ? 28 : 24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
      >
        {/* --- SELF ATTENDANCE ACTIONS (FIRST FEATURE) --- */}
        <View style={styles.topAttendanceSection}>
          <Text style={styles.sectionTitle}>My Attendance</Text>
          <View style={styles.attendanceActionsContainer}>
            <TouchableOpacity
              style={[styles.attBtn, styles.checkInBtn, hasCheckedIn && styles.disabledAttBtn]}
              onPress={() => startAttendance('login')}
              disabled={hasCheckedIn}
            >
              <Ionicons name={hasCheckedIn ? "checkmark-circle" : "time"} size={20} color="#fff" />
              <Text style={styles.attBtnText}>{hasCheckedIn ? 'Checked In' : 'Check In'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attBtn, styles.checkOutBtn, hasCheckedOut && styles.disabledAttBtn]}
              onPress={() => startAttendance('logout')}
              disabled={hasCheckedOut}
            >
              <Ionicons name={hasCheckedOut ? "checkmark-circle" : "log-out"} size={20} color="#fff" />
              <Text style={styles.attBtnText}>{hasCheckedOut ? 'Checked Out' : 'Check Out'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- MESSAGE ADMIN (SECOND FEATURE) --- */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('SupervisorMessage', { site })}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#6f42c1' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Message Admin</Text>
              <Text style={styles.featureSubtitle}>Send text, video, or reports</Text>
            </View>
            <View style={styles.arrowBox}>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeContainer}>
          {/* Site Selection Bubbles */}
          {sites.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.siteSelector}>
              {sites.map(s => (
                <TouchableOpacity
                  key={s._id}
                  style={[styles.siteBubble, selectedSiteId === s._id && styles.siteBubbleActive]}
                  onPress={() => setSelectedSiteId(s._id)}
                >
                  <Text style={[styles.siteBubbleText, selectedSiteId === s._id && styles.siteBubbleTextActive]}>
                    {s.siteName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <View style={styles.siteInfoCard}>
            <Text style={styles.siteName}>{siteName}</Text>
            {siteLocation ? (
              <Text style={styles.siteLocation}>📍 {siteLocation}</Text>
            ) : (
              <Text style={styles.siteLocation}>Please contact admin to assign a site.</Text>
            )}
            {siteDescription && <Text style={styles.siteDescription}>{siteDescription}</Text>}
          </View>
        </View>

        {/* --- SUPPLIES HUB (FOURTH FEATURE) --- */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => navigation.navigate('SupervisorSupplies', { site })}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#007bff' }]}>
              <Ionicons name="cube-outline" size={28} color="#fff" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Supplies Hub</Text>
              <Text style={styles.featureSubtitle}>Request, Status & Stock</Text>
            </View>
            <View style={styles.arrowBox}>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={isIpad ? 32 : 24} color="#007bff" />
            <Text style={styles.statNumber}>{suppliesStats.items}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={isIpad ? 32 : 24} color="#ffc107" />
            <Text style={styles.statNumber}>{attendance.present}/{attendance.total}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
        </View>

        {/* Today's Attendance Summary */}
        {site && (
          <View style={styles.attendanceSummaryCard}>
            <Text style={styles.attendanceSummaryTitle}>Today's Worker Attendance</Text>
            <View style={styles.attendanceProgressContainer}>
              <View style={styles.attendanceProgressBar}>
                <View style={[styles.attendanceProgress, { width: `${attendancePercentage}%` }]} />
              </View>
              <Text style={styles.attendancePercentageText}>{attendancePercentage}% Present</Text>
            </View>
            <View style={styles.attendanceSummaryStats}>
              <View style={styles.attendanceStat}>
                <View style={[styles.attendanceStatDot, { backgroundColor: '#28a745' }]} />
                <Text style={styles.attendanceStatNumber}>{attendance.present}</Text>
                <Text style={styles.attendanceStatLabel}>Present</Text>
              </View>
              <View style={styles.attendanceStat}>
                <View style={[styles.attendanceStatDot, { backgroundColor: '#dc3545' }]} />
                <Text style={styles.attendanceStatNumber}>{attendance.absent}</Text>
                <Text style={styles.attendanceStatLabel}>Absent</Text>
              </View>
              <View style={styles.attendanceStat}>
                <View style={[styles.attendanceStatDot, { backgroundColor: '#ffc107' }]} />
                <Text style={styles.attendanceStatNumber}>{attendance.notMarked}</Text>
                <Text style={styles.attendanceStatLabel}>Pending</Text>
              </View>
            </View>
            {attendance.notMarked > 0 && (
              <View style={styles.attendanceAlert}>
                <Ionicons name="warning-outline" size={16} color="#856404" />
                <Text style={styles.attendanceAlertText}>
                  {attendance.notMarked} worker{attendance.notMarked > 1 ? 's' : ''} attendance not marked
                </Text>
              </View>
            )}
          </View>
        )}

        {/* --- SITE MANAGEMENT ACTIONS --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Site Management</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageWorkers', { site, canEdit: true })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="people-outline" size={22} color="#28a745" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, !site && { color: '#999' }]}>Manage Workers</Text>
              <Text style={styles.actionSubtitle}>Track attendance and details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AttendanceReport', { site: { ...site, _supervisorId: user.id } })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fff8e1' }]}>
              <Ionicons name="calendar-outline" size={22} color="#ffc107" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, !site && { color: '#999' }]}>Attendance Reports</Text>
              <Text style={styles.actionSubtitle}>View historical records</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Announcements', { site, canEdit: true })}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#fff3e0' }]}>
              <Ionicons name="megaphone-outline" size={22} color="#ff6b35" />
              {getUnreadAnnouncementsCount() > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{getUnreadAnnouncementsCount()}</Text></View>
              )}
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, !site && { color: '#999' }]}>Announcements</Text>
              <Text style={styles.actionSubtitle}>Manage site announcements</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- CAMERA MODAL (Unchanged) --- */}
      <Modal visible={cameraVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.cameraContainer}>
          {!capturedImage ? (
            <CameraView style={styles.camera} ref={cameraRef}>
              <View style={styles.cameraOverlay}>
                <View style={styles.cameraTopBar}>
                  <Text style={styles.cameraInstruction}>Take a photo at the site</Text>
                  <TouchableOpacity onPress={cancelAttendance} style={styles.closeCameraBtn}>
                    <Ionicons name="close" size={30} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.cameraBottomBar}>
                  <TouchableOpacity onPress={takePicture} style={styles.captureBtnOuter}>
                    <View style={styles.captureBtnInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          ) : (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Confirm Attendance</Text>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />

              <View style={styles.locationBox}>
                <Ionicons name="location" size={20} color="#e74c3c" />
                <Text style={styles.locationText}>
                  {fetchingLocation ? "Refining location..." : (locationData?.displayText || "Location not found")}
                </Text>
              </View>

              <View style={styles.previewActions}>
                <TouchableOpacity style={styles.retakeBtn} onPress={() => setCapturedImage(null)}>
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, (fetchingLocation || submittingAttendance) && styles.disabledBtn]}
                  onPress={submitAttendance}
                  disabled={fetchingLocation || submittingAttendance}
                >
                  {submittingAttendance ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit {attendanceType === 'login' ? 'IN' : 'OUT'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' }, // Slightly darker bg for contrast
  header: {
    backgroundColor: '#2094f3',
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  headerContent: { flex: 1 },
  title: { fontSize: isIpad ? 28 : 24, fontWeight: '800', color: '#FFFFFF' },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },
  scrollView: { flex: 1, backgroundColor: '#f0f2f5' },

  // Sections
  topAttendanceSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 0, // seamless flow
    paddingBottom: 25
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 15
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  // Attendance Buttons
  attendanceActionsContainer: {
    flexDirection: 'row', justifyContent: 'space-between'
  },
  attBtn: {
    flex: 0.48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16, borderRadius: 16, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3
  },
  checkInBtn: { backgroundColor: '#28a745' },
  checkOutBtn: { backgroundColor: '#dc3545' },
  disabledAttBtn: { backgroundColor: '#ccc', elevation: 0 },
  attBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  // Feature Cards (Shared Style for Message & Supplies)
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)'
  },
  featureIconBox: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16
  },
  featureContent: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 2 },
  featureSubtitle: { fontSize: 13, color: '#666', lineHeight: 18 },
  arrowBox: { opacity: 0.5 },

  // Site Info Area
  welcomeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f0f2f5'
  },
  siteSelector: { marginBottom: 12, flexDirection: 'row' },
  siteBubble: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#fff', borderRadius: 20, marginRight: 8,
    borderWidth: 1, borderColor: '#e0e0e0'
  },
  siteBubbleActive: { backgroundColor: '#2094f3', borderColor: '#2094f3' },
  siteBubbleText: { color: '#666', fontWeight: '600', fontSize: 13 },
  siteBubbleTextActive: { color: '#fff' },

  siteInfoCard: {
    backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
    borderLeftWidth: 4, borderLeftColor: '#2094f3'
  },
  siteName: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  siteLocation: { fontSize: 14, color: '#555', marginBottom: 8 },
  siteDescription: { fontSize: 13, color: '#888', fontStyle: 'italic', lineHeight: 18 },

  // Stats Grid
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  statCard: {
    backgroundColor: '#FFFFFF', padding: 15, borderRadius: 16, alignItems: 'center', width: '48%',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2
  },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },

  // Attendance Summary
  attendanceSummaryCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 20,
    padding: 20, borderRadius: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2
  },
  attendanceSummaryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 15, color: '#333' },
  attendanceProgressContainer: { marginBottom: 20 },
  attendanceProgressBar: { height: 6, backgroundColor: '#f1f1f1', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  attendanceProgress: { height: '100%', backgroundColor: '#2094f3' },
  attendancePercentageText: { textAlign: 'right', fontSize: 12, color: '#888', fontWeight: '600' },
  attendanceSummaryStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 5 },
  attendanceStat: { alignItems: 'center' },
  attendanceStatDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  attendanceStatNumber: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  attendanceStatLabel: { fontSize: 11, color: '#888' },
  attendanceAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8e1', padding: 12, borderRadius: 10, marginTop: 15 },
  attendanceAlertText: { marginLeft: 10, color: '#856404', fontSize: 13, flex: 1, fontWeight: '500' },

  // Secondary Actions (List Style)
  actionCard: {
    backgroundColor: '#FFFFFF', padding: 16, marginBottom: 10, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 1
  },
  actionIconBox: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 2 },
  actionSubtitle: { fontSize: 12, color: '#888' },
  badge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#ff3b30', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // Camera Modal
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraTopBar: { paddingTop: 50, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cameraInstruction: { color: '#fff', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },
  closeCameraBtn: { padding: 10 },
  cameraBottomBar: { paddingBottom: 50, alignItems: 'center' },
  captureBtnOuter: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },

  previewContainer: { flex: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center' },
  previewTitle: { fontSize: 24, fontWeight: 'bold', alignSelf: 'center', marginBottom: 20, color: '#333' },
  previewImage: { width: '100%', height: 400, borderRadius: 10, backgroundColor: '#eee', marginBottom: 20 },
  locationBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, paddingHorizontal: 10 },
  locationText: { marginLeft: 10, color: '#555', fontSize: 14, flex: 1 },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between' },
  retakeBtn: { flex: 0.45, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  retakeBtnText: { color: '#333', fontWeight: 'bold' },
  submitBtn: { flex: 0.45, padding: 15, borderRadius: 10, backgroundColor: '#2094f3', alignItems: 'center' },
  disabledBtn: { backgroundColor: '#a0c4ff' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default SupervisorDashboard;
