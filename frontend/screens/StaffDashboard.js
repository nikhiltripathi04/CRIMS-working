import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// FIX: Use CameraView and useCameraPermissions for new Expo versions
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const { width: screenWidth } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const StaffDashboardScreen = () => {
    const { user, token, logout, API_BASE_URL } = useAuth();
    const navigation = useNavigation();

    // State
    const [currentTime, setCurrentTime] = useState(new Date());
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [locationData, setLocationData] = useState(null);
    const [attendanceType, setAttendanceType] = useState(null); // 'login' or 'logout'
    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [facing, setFacing] = useState('back'); // Camera facing state

    // Permissions State (New API)
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [hasLocationPermission, setHasLocationPermission] = useState(null);

    // Refs
    const cameraRef = useRef(null);

    // --- 1. Init & Permissions ---

    useEffect(() => {
        (async () => {
            try {
                // Location permissions (Standard)
                const locStatus = await Location.requestForegroundPermissionsAsync();
                setHasLocationPermission(locStatus.status === 'granted');
            } catch (e) {
                console.error("Permission error", e);
            }
        })();

        // Live Clock
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch History on mount
    useEffect(() => {
        fetchMyRecords();
    }, []);

    const fetchMyRecords = useCallback(async () => {
        if (!user || !token) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/api/attendance/my-records`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setAttendanceHistory(response.data.data || []);
            }
        } catch (error) {
            console.log("Failed to fetch records", error);
        }
    }, [user, token, API_BASE_URL]);

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: logout }
            ]
        );
    };

    // --- 2. Location Logic ---

    const fetchLocation = async () => {
        if (!hasLocationPermission) {
            Alert.alert("Permission Denied", "Location permission is required to mark attendance.");
            return;
        }

        setFetchingLocation(true);
        setLocationData(prev => prev ? { ...prev, address: "Updating location..." } : null);

        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const { latitude, longitude, accuracy } = location.coords;

            const currentLoc = {
                latitude,
                longitude,
                accuracy,
                address: "Fetching address details...",
                timestamp: new Date().toISOString()
            };

            setLocationData(currentLoc);

            const timestamp = new Date().getTime();
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&t=${timestamp}`, {
                headers: { 'User-Agent': 'ConstructionApp/1.0' }
            });
            const data = await response.json();

            if (data && data.display_name) {
                setLocationData(prev => ({ ...prev, address: data.display_name }));
            } else {
                setLocationData(prev => ({ ...prev, address: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)}` }));
            }

        } catch (error) {
            console.warn("Location error:", error);
            setLocationData(prev => ({
                ...prev,
                address: prev?.latitude ? `Lat: ${prev.latitude.toFixed(5)}, Long: ${prev.longitude.toFixed(5)} (Network Error)` : "Location Error"
            }));
        } finally {
            setFetchingLocation(false);
        }
    };

    // --- 3. Camera Logic ---

    const startAttendanceProcess = async (type) => {
        // Check permissions
        if (!cameraPermission?.granted) {
            const permission = await requestCameraPermission();
            if (!permission.granted) {
                Alert.alert("Permission Denied", "Camera permission is required.");
                return;
            }
        }

        if (!hasLocationPermission) {
            Alert.alert("Permission Denied", "Location permission is required.");
            return;
        }

        setAttendanceType(type);
        setCameraActive(true);
        setCapturedImage(null);
        setLocationData(null);
        setFacing('back'); // Reset to back camera

        fetchLocation();
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const takePhoto = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    base64: true,
                    skipProcessing: true
                });

                if (photo.base64) {
                    const dataUri = `data:image/jpeg;base64,${photo.base64}`;
                    setCapturedImage(dataUri);
                    setCameraActive(false);
                } else {
                    setCapturedImage(photo.uri);
                    setCameraActive(false);
                }

            } catch (error) {
                console.error("Camera take picture error", error);
                Alert.alert("Error", "Failed to take photo");
            }
        }
    };

    const cancelAttendance = () => {
        setCameraActive(false);
        setCapturedImage(null);
        setAttendanceType(null);
    };

    // --- 4. Submission Logic ---

    const handleSubmitAttendance = async () => {
        if ((!locationData || fetchingLocation) && !locationData?.latitude) {
            Alert.alert("Wait", "Still fetching precise location...");
            return;
        }

        if (!token) {
            Alert.alert("Error", "Authentication missing.");
            return;
        }

        setLoading(true);

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

            const res = await axios.post(`${API_BASE_URL}/api/attendance`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                Alert.alert(
                    "Success",
                    `Successfully Marked: ${attendanceType === 'login' ? 'Check In' : 'Check Out'}`,
                    [{
                        text: "OK", onPress: () => {
                            setCapturedImage(null);
                            setAttendanceType(null);
                            fetchMyRecords();
                        }
                    }]
                );
            } else {
                Alert.alert("Failed", res.data.message || "Unknown error");
            }
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || error.message || "Submission failed";
            Alert.alert("Error", msg);
        } finally {
            setLoading(false);
        }
    };

    // --- Render Helpers ---

    if (!user) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2094f3" /></View>;

    // 1. Camera View
    if (cameraActive && !capturedImage) {
        return (
            <View style={styles.fullScreenCamera}>
                <StatusBar hidden />
                {/* FIX: Using CameraView instead of Camera */}
                <CameraView
                    style={styles.camera}
                    facing={facing} // Use state for facing
                    ref={cameraRef}
                >
                    <SafeAreaView style={styles.cameraOverlay}>
                        <View style={styles.cameraHeader}>
                            <Text style={styles.cameraTitle}>Take Photo</Text>
                            <Text style={styles.cameraSubtitle}>Please stand at the site</Text>
                        </View>

                        <View style={styles.locationOverlay}>
                            {fetchingLocation ? (
                                <View style={styles.locBadgeFetching}>
                                    <ActivityIndicator size="small" color="#E69138" />
                                    <Text style={styles.locTextFetching}>Locating...</Text>
                                </View>
                            ) : locationData ? (
                                <View style={styles.locBadgeFound}>
                                    <Ionicons name="location" size={14} color="#10B981" />
                                    <Text style={styles.locTextFound}>GPS Locked (~{Math.round(locationData.accuracy)}m)</Text>
                                </View>
                            ) : (
                                <View style={styles.locBadgeError}>
                                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                                    <Text style={styles.locTextError}>No GPS</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.cameraControls}>
                            <TouchableOpacity style={styles.btnCancelCam} onPress={cancelAttendance}>
                                <Text style={styles.txtCancelCam}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnCaptureOuter} onPress={takePhoto}>
                                <View style={styles.btnCaptureInner} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnFlipCam} onPress={toggleCameraFacing}>
                                <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </CameraView>
            </View>
        );
    }

    // 2. Preview View
    if (capturedImage) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.centerContent}>
                    <View style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                            <Text style={styles.previewTitle}>Confirm Attendance</Text>
                            <View style={[
                                styles.badge,
                                { backgroundColor: attendanceType === 'login' ? '#10B981' : '#EF4444' }
                            ]}>
                                <Text style={styles.badgeText}>
                                    {attendanceType === 'login' ? 'CHECK IN' : 'CHECK OUT'}
                                </Text>
                            </View>
                        </View>

                        <Image source={{ uri: capturedImage }} style={styles.previewImage} />

                        <View style={styles.detailsBox}>
                            <View style={styles.detailRow}>
                                <Ionicons name="time-outline" size={20} color="#666" />
                                <Text style={styles.detailText}>{new Date().toLocaleString()}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="location-outline" size={20} color="#666" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.detailText}>
                                        {locationData?.address || "Fetching address..."}
                                    </Text>
                                    {locationData?.accuracy && (
                                        <Text style={styles.detailSubText}>
                                            Accuracy: ~{Math.round(locationData.accuracy)}m
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={fetchLocation} style={styles.refreshBtn}>
                                    <Ionicons name={fetchingLocation ? "sync" : "refresh"} size={20} color="#2094f3" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.previewActions}>
                            <TouchableOpacity
                                style={styles.btnRetake}
                                onPress={() => startAttendanceProcess(attendanceType)}
                                disabled={loading}
                            >
                                <Text style={styles.btnRetakeText}>Retake</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.btnSubmit, (loading || fetchingLocation) && styles.btnDisabled]}
                                onPress={handleSubmitAttendance}
                                disabled={loading || fetchingLocation}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.btnSubmitText}>Confirm & Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // 3. Dashboard View (Default)
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#2094f3" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>Staff Portal</Text>
                        <Text style={styles.headerSubtitle}>Welcome, {user.fullName || user.username}</Text>
                    </View>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    {/* Clock Section */}
                    <View style={styles.clockContainer}>
                        <Text style={styles.timeText}>
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.dateText}>
                            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.btnIn]}
                            onPress={() => startAttendanceProcess('login')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.iconCircleIn}>
                                <Ionicons name="enter" size={32} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.btnLabel}>Check In</Text>
                                <Text style={styles.btnSubLabel}>Start your shift</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.btnOut]}
                            onPress={() => startAttendanceProcess('logout')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.iconCircleOut}>
                                <Ionicons name="exit" size={32} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.btnLabel}>Check Out</Text>
                                <Text style={styles.btnSubLabel}>End your shift</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    {/* Recent Activity */}
                    <Text style={styles.sectionTitle}>Recent Activity</Text>

                    {attendanceHistory.length === 0 ? (
                        <Text style={styles.emptyText}>No recent records found.</Text>
                    ) : (
                        <View style={styles.historyList}>
                            {attendanceHistory.slice(0, 5).map((record, index) => (
                                <View key={record._id || index} style={styles.historyItem}>
                                    <View style={[
                                        styles.historyIcon,
                                        { backgroundColor: record.type === 'login' ? '#D1FAE5' : '#FEE2E2' }
                                    ]}>
                                        <Ionicons
                                            name={record.type === 'login' ? "enter" : "exit"}
                                            size={18}
                                            color={record.type === 'login' ? '#059669' : '#DC2626'}
                                        />
                                    </View>
                                    <View style={styles.historyContent}>
                                        <Text style={styles.historyType}>
                                            {record.type === 'login' ? 'Checked In' : 'Checked Out'}
                                        </Text>
                                        <Text style={styles.historyLocation} numberOfLines={1}>
                                            {record.location?.address || "Address unavailable"}
                                        </Text>
                                    </View>
                                    <Text style={styles.historyTime}>
                                        {new Date(record.timestamp || record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
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
        backgroundColor: '#f3f4f6',
    },

    // Header
    header: {
        backgroundColor: '#2094f3',
        paddingTop: Platform.OS === 'ios' ? (isIpad ? 20 : 10) : 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: isIpad ? 28 : 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: isIpad ? 16 : 14,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    logoutButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
    },

    // Main Container
    container: {
        flex: 1,
        backgroundColor: '#2094f3',
    },
    contentContainer: {
        padding: isIpad ? 40 : 20,
        paddingTop: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: isIpad ? 30 : 20,
        paddingBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        minHeight: 500,
    },

    // Clock
    clockContainer: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    timeText: {
        fontSize: isIpad ? 56 : 42,
        fontWeight: '800',
        color: '#333',
        letterSpacing: -1,
    },
    dateText: {
        fontSize: isIpad ? 18 : 15,
        color: '#888',
        fontWeight: '600',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Action Buttons
    actionsContainer: {
        gap: 16,
        marginBottom: 20,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    btnIn: {
        backgroundColor: '#F0FDF4',
        borderColor: '#DCFCE7',
    },
    btnOut: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FEE2E2',
    },
    iconCircleIn: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: '#10B981',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16,
    },
    iconCircleOut: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16,
    },
    btnLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    btnSubLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },

    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 24,
    },

    // History
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        marginTop: 10,
    },
    historyList: {
        gap: 12,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    historyIcon: {
        width: 32, height: 32, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    historyContent: {
        flex: 1,
    },
    historyType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    historyLocation: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    historyTime: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },

    // --- Camera View Styles ---
    fullScreenCamera: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
    },
    cameraHeader: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    cameraTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    cameraSubtitle: {
        color: '#ccc',
        fontSize: 14,
    },
    locationOverlay: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    locBadgeFetching: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6
    },
    locBadgeFound: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.9)', // Green
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6
    },
    locBadgeError: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.9)', // Red
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6
    },
    locTextFetching: { color: '#E69138', fontSize: 12, fontWeight: '600' },
    locTextFound: { color: '#fff', fontSize: 12, fontWeight: '600' },
    locTextError: { color: '#fff', fontSize: 12, fontWeight: '600' },

    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 30,
        paddingBottom: 50,
    },
    btnCancelCam: {
        padding: 10,
    },
    txtCancelCam: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    btnCaptureOuter: {
        width: 72, height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnCaptureInner: {
        width: 60, height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
    },
    btnFlipCam: {
        padding: 10,
    },

    // --- Preview Styles ---
    centerContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#2094f3',
    },
    previewCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    previewImage: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        backgroundColor: '#eee',
        marginBottom: 16,
    },
    detailsBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: 20,
        gap: 12
    },
    detailRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    detailText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        lineHeight: 20,
    },
    detailSubText: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    refreshBtn: {
        padding: 4,
    },
    previewActions: {
        flexDirection: 'row',
        gap: 12,
    },
    btnRetake: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    btnRetakeText: {
        fontSize: 16,
        color: '#555',
        fontWeight: '600',
    },
    btnSubmit: {
        flex: 2,
        padding: 15,
        borderRadius: 12,
        backgroundColor: '#10B981',
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4
    },
    btnDisabled: {
        opacity: 0.7,
        backgroundColor: '#9ca3af',
    },
    btnSubmitText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default StaffDashboardScreen;