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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Calendar } from 'react-native-calendars';

const { width: screenWidth } = Dimensions.get("window");

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
        // Haptic Feedback for better interaction
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Check permissions
        if (!cameraPermission?.granted) {
            const permission = await requestCameraPermission();
            if (!permission.granted) {
                Alert.alert("Permission", "We need camera access to take your photo.");
                return;
            }
        }

        if (!hasLocationPermission) {
            Alert.alert("Permission", "We need location access to know where you are.");
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

    // --- CHECK TODAY'S STATUS & CALENDAR MARKING ---
    const todayStr = new Date().toDateString();
    const todaysRecords = attendanceHistory.filter(r => new Date(r.timestamp || r.date).toDateString() === todayStr);
    const hasCheckedIn = todaysRecords.some(r => r.type === 'login');
    const hasCheckedOut = todaysRecords.some(r => r.type === 'logout');

    const getMarkedDates = () => {
        const marked = {};
        attendanceHistory.forEach(record => {
            const dateStr = new Date(record.timestamp || record.date).toISOString().split('T')[0];

            if (!marked[dateStr]) {
                marked[dateStr] = {
                    dots: [],
                    selected: true,
                    selectedColor: 'transparent',
                    textStyle: { fontWeight: 'bold' }
                };
            }

            // Avoid duplicate dots for same type on same day
            const hasType = marked[dateStr].dots.some(d => d.key === record.type);
            if (!hasType) {
                marked[dateStr].dots.push({
                    key: record.type,
                    color: record.type === 'login' ? '#10B981' : '#EF4444',
                    selectedDotColor: record.type === 'login' ? '#10B981' : '#EF4444',
                });
            }
        });

        // Highlight today
        const todayIso = new Date().toISOString().split('T')[0];
        marked[todayIso] = {
            ...(marked[todayIso] || {}),
            selected: true,
            selectedColor: '#E0F2FE',
            selectedTextColor: '#0284C7'
        };

        return marked;
    };

    const markedDates = getMarkedDates();

    // --- 4. Submission Logic ---

    const handleSubmitAttendance = async () => {
        if ((!locationData || fetchingLocation) && !locationData?.latitude) {
            Alert.alert("Please Wait", "We are still finding your location...");
            return;
        }

        if (!token) {
            Alert.alert("Error", "You are not logged in.");
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
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                    "Success!",
                    `You have successfully ${attendanceType === 'login' ? 'CHECKED IN' : 'CHECKED OUT'}.`,
                    [{
                        text: "Great!", onPress: () => {
                            setCapturedImage(null);
                            setAttendanceType(null);
                            fetchMyRecords();
                        }
                    }]
                );
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Failed", res.data.message || "Something went wrong.");
            }
        } catch (error) {
            console.error(error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const msg = error.response?.data?.message || error.message || "Submission failed";
            Alert.alert("Error", msg);
        } finally {
            setLoading(false);
        }
    };

    // --- Render Helpers ---

    if (!user) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#AF52DE" /></View>;

    // 1. Camera View
    if (cameraActive && !capturedImage) {
        return (
            <View style={styles.fullScreenCamera}>
                <StatusBar hidden />
                <CameraView
                    style={styles.camera}
                    facing={facing}
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
                                <Ionicons name="time-outline" size={24} color="#666" />
                                <Text style={styles.detailText}>{new Date().toLocaleString()}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="location-outline" size={24} color="#666" />
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
                                    <Ionicons name={fetchingLocation ? "sync" : "refresh"} size={24} color="#AF52DE" />
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
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#AF52DE" />

            {/* Header - Purple Gradient */}
            <LinearGradient
                colors={['#AF52DE', '#9C27B0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerContainer}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.greetingText}>Hello,</Text>
                            <Text style={styles.userNameText}>{user?.fullName || user?.username || 'Staff'}</Text>
                        </View>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                             <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView
                style={styles.mainScroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Status Banner - Huge Visibility */}
                <View style={[
                    styles.statusCard,
                    hasCheckedIn && !hasCheckedOut ? styles.statusCardActive : styles.statusCardInactive
                ]}>
                    <Text style={styles.statusLabel}>CURRENT STATUS</Text>
                    <View style={styles.statusRow}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: hasCheckedIn && !hasCheckedOut ? '#10B981' : '#9CA3AF' }
                        ]} />
                        <Text style={styles.statusMainText}>
                            {hasCheckedIn
                                ? (hasCheckedOut ? "FINISHED" : "ON DUTY")
                                : "NOT STARTED"}
                        </Text>
                    </View>
                    {hasCheckedIn && !hasCheckedOut && (
                        <Text style={styles.statusSubText}>
                            Started at {todaysRecords.find(r => r.type === 'login')?.timestamp ? new Date(todaysRecords.find(r => r.type === 'login').timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </Text>
                    )}
                </View>

                {/* 2. Live Clock - Clear & Big */}
                <View style={styles.timeContainer}>
                    <Text style={styles.bigTimeText}>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={styles.dateText}>
                        {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                </View>

                {/* 3. Primary Actions - GIANT Buttons for Accessibility */}
                <View style={styles.actionGrid}>
                    {/* Start Work Button */}
                    <TouchableOpacity
                        style={[
                            styles.actionCard,
                            styles.actionCardGreen,
                            hasCheckedIn && styles.actionCardDisabled
                        ]}
                        onPress={() => {
                            if (!hasCheckedIn) {
                                startAttendanceProcess('login');
                            } else {
                                Alert.alert("Already Started", "You have already checked in today.");
                            }
                        }}
                        activeOpacity={hasCheckedIn ? 1 : 0.7}
                        disabled={hasCheckedIn}
                    >
                        <View style={styles.iconCircleGreen}>
                            <Ionicons name="enter" size={56} color="#10B981" />
                        </View>
                        <View style={styles.actionTextContainer}>
                            <Text style={styles.actionCardTitle}>START WORK</Text>
                            <Text style={styles.actionCardSubtitle}>Tap here to Check In</Text>
                        </View>
                        {hasCheckedIn && (
                            <View style={styles.completedOverlay}>
                                <Ionicons name="checkmark-circle" size={60} color="#fff" />
                                <Text style={styles.completedText}>DONE</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* End Work Button */}
                    <TouchableOpacity
                        style={[
                            styles.actionCard,
                            styles.actionCardRed,
                            (!hasCheckedIn || hasCheckedOut) && styles.actionCardDisabled
                        ]}
                        onPress={() => {
                            if (hasCheckedIn && !hasCheckedOut) {
                                startAttendanceProcess('logout');
                            } else {
                                if (hasCheckedOut) Alert.alert("Finished", "You have already checked out today.");
                                else Alert.alert("Not Started", "You need to Start Work (Check In) first.");
                            }
                        }}
                        activeOpacity={(!hasCheckedIn || hasCheckedOut) ? 1 : 0.7}
                        disabled={!hasCheckedIn || hasCheckedOut}
                    >
                        <View style={styles.iconCircleRed}>
                            <Ionicons name="exit" size={56} color="#EF4444" />
                        </View>
                        <View style={styles.actionTextContainer}>
                            <Text style={styles.actionCardTitle}>END WORK</Text>
                            <Text style={styles.actionCardSubtitle}>Tap here to Check Out</Text>
                        </View>
                        {hasCheckedOut && (
                            <View style={styles.completedOverlay}>
                                <Ionicons name="checkmark-circle" size={60} color="#fff" />
                                <Text style={styles.completedText}>DONE</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 4. Recent Activity */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    {attendanceHistory.length === 0 ? (
                        <View style={styles.emptyStateSimple}>
                            <Text style={styles.emptyTextSimple}>No activity recorded yet.</Text>
                        </View>
                    ) : (
                        <View style={styles.historyList}>
                            {attendanceHistory.slice(0, 5).map((record, index) => (
                                <View key={record._id || index} style={styles.historyRow}>
                                    <View style={[styles.historyDot, { backgroundColor: record.type === 'login' ? '#10B981' : '#EF4444' }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.historyType}>{record.type === 'login' ? 'Started Work' : 'Ended Work'}</Text>
                                        <Text style={styles.historyLocation} numberOfLines={1}>{record.location?.address || 'GPS Location'}</Text>
                                    </View>
                                    <Text style={styles.historyTime}>
                                        {new Date(record.timestamp || record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* 5. Calendar */}
                <View style={[styles.sectionContainer, { marginTop: 24 }]}>
                    <Text style={styles.sectionTitle}>Attendance Calendar</Text>
                    <View style={styles.calendarWrapper}>
                        <Calendar
                            current={new Date().toISOString().split('T')[0]}
                            hideExtraDays={true}
                            disableMonthChange={false}
                            firstDay={1}
                            hideDayNames={false}
                            showWeekNumbers={false}
                            markingType={'multi-dot'}
                            markedDates={markedDates}
                            theme={{
                                backgroundColor: '#ffffff',
                                calendarBackground: '#ffffff',
                                textSectionTitleColor: '#9CA3AF',
                                selectedDayBackgroundColor: '#AF52DE',
                                selectedDayTextColor: '#ffffff',
                                todayTextColor: '#AF52DE',
                                dayTextColor: '#1F2937',
                                textDisabledColor: '#E5E7EB',
                                dotColor: '#AF52DE',
                                selectedDotColor: '#ffffff',
                                arrowColor: '#AF52DE',
                                monthTextColor: '#1F2937',
                                textDayFontWeight: '600',
                                textMonthFontWeight: 'bold',
                                textDayHeaderFontWeight: '600',
                                textDayFontSize: 16,
                            }}
                        />
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    mainScroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },

    // --- Header ---
    headerContainer: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 50 : 20, // More top padding for status bar
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
        shadowColor: '#AF52DE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
        marginBottom: 4,
    },
    userNameText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    logoutButton: {
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    // --- Status Card ---
    statusCard: {
        padding: 24,
        borderRadius: 24,
        marginBottom: 24,
        marginTop: 20,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    statusCardActive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#10B981',
        borderLeftWidth: 8, // Prominent indicator
    },
    statusCardInactive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderLeftWidth: 8,
        borderLeftColor: '#9CA3AF',
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1.2,
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statusDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    statusMainText: {
        fontSize: 28, // Bigger
        fontWeight: '800',
        color: '#1F2937',
    },
    statusSubText: {
        marginTop: 12,
        fontSize: 16,
        color: '#059669',
        fontWeight: '600',
    },

    // --- Live Clock ---
    timeContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    bigTimeText: {
        fontSize: 60, // Bigger
        fontWeight: '900',
        color: '#111827',
        fontVariant: ['tabular-nums'],
        letterSpacing: -1,
    },
    dateText: {
        fontSize: 20,
        color: '#6B7280',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // --- Action Grid (Buttons) ---
    actionGrid: {
        gap: 24,
        marginBottom: 32,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 28, // Bigger padding
        borderRadius: 28,
        backgroundColor: '#fff',
        borderWidth: 2,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        minHeight: 140, // Taller
        position: 'relative',
        overflow: 'hidden',
    },
    actionCardGreen: {
        borderColor: '#10B981',
    },
    actionCardRed: {
        borderColor: '#EF4444',
    },
    actionCardDisabled: {
        backgroundColor: '#F9FAFB',
        borderColor: '#E5E7EB',
        opacity: 0.6,
        elevation: 0,
    },
    iconCircleGreen: {
        width: 80, height: 80, // Bigger circle
        borderRadius: 40,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 24,
    },
    iconCircleRed: {
        width: 80, height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 24,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionCardTitle: {
        fontSize: 24, // Bigger text
        fontWeight: '900',
        color: '#1F2937',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    actionCardSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    completedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(16, 185, 129, 0.95)', // Stronger overlay
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        flexDirection: 'row',
        gap: 12,
    },
    completedText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2,
    },

    // --- History Section ---
    sectionContainer: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    historyList: {
        gap: 16,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    historyDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 16,
    },
    historyType: {
        fontSize: 18, // Bigger
        fontWeight: '600',
        color: '#374151',
    },
    historyLocation: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    historyTime: {
        fontSize: 16,
        fontWeight: '600',
        color: '#9CA3AF',
    },
    emptyStateSimple: {
        padding: 20,
        alignItems: 'center',
    },
    emptyTextSimple: {
        color: '#9CA3AF',
        fontStyle: 'italic',
        fontSize: 16,
    },

    // --- Camera Styles ---
    fullScreenCamera: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
    },
    cameraHeader: {
        alignItems: 'center',
        marginTop: 40,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 16,
        borderRadius: 16,
    },
    cameraTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    cameraSubtitle: {
        color: '#E5E7EB',
        fontSize: 16,
        marginTop: 4,
    },
    locationOverlay: {
        alignItems: 'center',
    },
    locBadgeFetching: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    locTextFetching: { color: '#E69138', fontWeight: 'bold' },
    locBadgeFound: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    locTextFound: { color: '#10B981', fontWeight: 'bold' },
    locBadgeError: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    locTextError: { color: '#EF4444', fontWeight: 'bold' },

    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 30,
    },
    btnCancelCam: {
        padding: 12,
    },
    txtCancelCam: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    btnCaptureOuter: {
        width: 80, height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnCaptureInner: {
        width: 64, height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
    },
    btnFlipCam: {
        padding: 12,
    },

    // --- Preview Styles ---
    safeArea: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centerContent: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
    },
    previewCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    previewTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    badge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    badgeText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 1,
    },
    previewImage: {
        width: '100%',
        height: 300,
        borderRadius: 16,
        backgroundColor: '#E5E7EB',
        marginBottom: 20,
    },
    detailsBox: {
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        gap: 16,
        marginBottom: 24,
    },
    detailRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    detailText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '500',
    },
    detailSubText: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    refreshBtn: {
        padding: 4,
    },
    previewActions: {
        flexDirection: 'row',
        gap: 16,
    },
    btnRetake: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    btnRetakeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    btnSubmit: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#10B981',
        alignItems: 'center',
        elevation: 2,
    },
    btnSubmitText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    btnDisabled: {
        backgroundColor: '#9CA3AF',
        opacity: 0.7,
    },

    // --- Calendar Styles ---
    calendarWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
});

export default StaffDashboardScreen;