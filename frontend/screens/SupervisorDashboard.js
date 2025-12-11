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
  Platform,
  StatusBar,
  ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

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
      const { latitude, longitude, accuracy } = location.coords;

      // 1. Set initial location with coords
      const currentLoc = {
        latitude,
        longitude,
        accuracy,
        displayText: "Fetching address details...",
        address: "Fetching address details...",
        timestamp: new Date().toISOString()
      };
      setLocationData(currentLoc);

      // 2. Fetch from OpenStreetMap
      try {
        const timestamp = new Date().getTime();
        // Using the same URL structure as StaffDashboard
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&t=${timestamp}`, {
          headers: { 'User-Agent': 'ConstructionApp/1.0' }
        });
        const data = await response.json();

        if (data && data.display_name) {
          setLocationData(prev => ({
            ...prev,
            displayText: data.display_name,
            address: data.display_name
          }));
        } else {
          setLocationData(prev => ({
            ...prev,
            displayText: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)}`,
            address: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)}`
          }));
        }
      } catch (apiError) {
        console.warn("Address fetch error:", apiError);
        setLocationData(prev => ({
          ...prev,
          displayText: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)} (Network Error)`,
          address: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)} (Network Error)`
        }));
      }

    } catch (error) {
      Alert.alert('Error', 'Could not fetch location');
      console.error(error);
    } finally {
      setFetchingLocation(false);
    }
  };

  const startAttendance = async (type) => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
    setAttendanceType(type);
    setCapturedImage(null);
    setLocationData(null);
    setCameraVisible(true);
    getLocation();
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
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
        fetchData();
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

  const siteName = site?.siteName || 'No Site Assigned';
  const siteLocation = site?.location || null;

  const attendance = getTodayAttendance();
  const suppliesStats = getSuppliesStats();

  const DashboardCard = ({ title, count, subtitle, onPress, route, iconName, iconColor, iconBgColor }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress || (() => navigation.navigate(route, { site }))}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor || '#F0F8FF' }]}>
          <Ionicons name={iconName} size={24} color={iconColor || '#34C759'} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>
            {count !== undefined ? count : subtitle}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const AttendanceButton = ({ type, isActive, disabled, onPress }) => {
    const isLogin = type === 'login';
    const label = isLogin ? (isActive ? 'Checked In' : 'Check In') : (isActive ? 'Checked Out' : 'Check Out');
    const icon = isLogin ? (isActive ? "checkmark-circle" : "time") : (isActive ? "checkmark-circle" : "log-out");
    const color = isLogin ? '#34C759' : '#AF52DE'; // Green for In, Purple for Out to differentiate
    const bgColor = isLogin ? '#E6F9E9' : '#F6E6FF';

    return (
      <TouchableOpacity
        style={[styles.attendanceBtn, disabled && styles.disabledBtnOpacity]}
        onPress={onPress}
        disabled={disabled}
      >
        <View style={[styles.attIconBox, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.attBtnText}>{label}</Text>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#34C759' }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#34C759" />

      {/* Header Section */}
      <View style={styles.headerWrapper}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop' }}
          style={styles.headerBackground}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['#34C759CC', '#34C759CC']} // Increased opacity for better green tint visibility
            style={styles.headerGradient}
          >
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.headerContent}>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.welcomeText}>Welcome back,</Text>
                  <Text style={styles.headerTitle}>{user.username}</Text>
                  <Text style={styles.siteText}>
                    {siteName} {siteLocation ? `• ${siteLocation}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                  <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Main Content Section */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
        >
          <View style={styles.gridContainer}>

            {/* Site Switcher Bubbles if multiple sites */}
            {sites.length > 1 && (
              <View style={styles.siteSelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
              </View>
            )}

            {/* Attendance Section - Full Width Row */}
            <Text style={styles.sectionTitle}>My Attendance</Text>
            <View style={styles.row}>
              <AttendanceButton
                type="login"
                isActive={hasCheckedIn}
                disabled={hasCheckedIn}
                onPress={() => startAttendance('login')}
              />
              <AttendanceButton
                type="logout"
                isActive={hasCheckedOut}
                disabled={hasCheckedOut}
                onPress={() => startAttendance('logout')}
              />
            </View>

            {/* Combined Overview and Actions for better layout */}
            <View style={styles.row}>
              {/* Site Overview: Supplies */}
              <View style={styles.halfColumn}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <DashboardCard
                  title="Supplies"
                  count={suppliesStats.items}
                  route="Supplies"
                  onPress={() => Alert.alert('Coming Soon', 'Supplies Hub is under development')}
                  iconName="cube"
                  iconColor="#007ADC"
                  iconBgColor="#E6F2FF"
                />
              </View>

              {/* Actions: Message Admin */}
              <View style={styles.halfColumn}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <DashboardCard
                  title="Message Admin"
                  subtitle="Send"
                  route="SupervisorMessage"
                  iconName="chatbubble-ellipses"
                  iconColor="#FF9500"
                  iconBgColor="#FFF5E6"
                />
              </View>
            </View>

          </View>
        </ScrollView>
      </View>

      {/* --- CAMERA MODAL (Unchanged Logic, just styling tweaks if needed) --- */}
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

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#34C759', // Primary Green
  },
  headerWrapper: {
    height: height * 0.25, // Slightly taller to accommodate site info
    width: '100%',
  },
  headerBackground: {
    flex: 1,
    width: '100%',
  },
  headerGradient: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerTextContainer: {
    alignItems: 'flex-start',
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  siteText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  logoutButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    marginLeft: 10,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F2F4F8',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    width: '100%', // Card should fill its container
    // Soft Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  cardContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfColumn: {
    width: '48%', // Each column takes half width
    flexDirection: 'column',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  // Attendance Buttons
  attendanceBtn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  attIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  disabledBtnOpacity: {
    opacity: 0.7,
  },
  // Site Selector
  siteSelector: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  siteBubble: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  siteBubbleActive: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  siteBubbleText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  siteBubbleTextActive: {
    color: '#fff',
  },

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
  submitBtn: { flex: 0.45, padding: 15, borderRadius: 10, backgroundColor: '#34C759', alignItems: 'center' },
  disabledBtn: { backgroundColor: '#a0c4ff' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
});

export default SupervisorDashboard;
