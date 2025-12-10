import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    Dimensions,
    Image,
    Modal,
    StatusBar,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Calendar } from 'react-native-calendars';

const { width: screenWidth } = Dimensions.get('window');
const isIpad = screenWidth >= 768;
const isIOS = Platform.OS === 'ios';

const SupervisorDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { supervisor } = route.params || {};
    const { API_BASE_URL, user, token } = useAuth();

    const [loading, setLoading] = useState(false);
    const [attendance, setAttendance] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // overview, attendance, messages
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // Initial check
    useEffect(() => {
        if (!supervisor) {
            navigation.goBack();
        }
    }, [supervisor, navigation]);

    // Fetch Data
    const fetchData = useCallback(async () => {
        if (!supervisor || !user) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Fetch Attendance & Messages concurrently
            const [attendanceRes, messagesRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/attendance/user/${supervisor._id}`, config).catch(e => ({ data: { success: false, data: [] } })),
                axios.get(`${API_BASE_URL}/api/messages/user/${supervisor._id}`, config).catch(e => ({ data: { success: false, data: [] } }))
            ]);

            setAttendance(attendanceRes.data.success ? attendanceRes.data.data : []);
            setMessages(messagesRes.data.success ? messagesRes.data.data : []);

        } catch (error) {
            console.error('Error fetching supervisor details:', error);
            // Silent fail or toast
        } finally {
            setLoading(false);
        }
    }, [supervisor, user, API_BASE_URL, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handlers
    const handleDelete = () => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete supervisor "${supervisor.username}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const config = { headers: { Authorization: `Bearer ${token}` } };
                            await axios.delete(`${API_BASE_URL}/api/auth/supervisors/${supervisor._id}?adminId=${user.id}`, config);
                            Alert.alert('Success', 'Supervisor deleted successfully', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } catch (error) {
                            console.error('Error deleting supervisor:', error);
                            Alert.alert('Error', 'Failed to delete supervisor');
                        }
                    }
                }
            ]
        );
    };

    const handlePasswordChange = async () => {
        if (!newPassword.trim()) {
            Alert.alert('Validation Error', 'Please enter a new password');
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`${API_BASE_URL}/api/auth/supervisors/${supervisor._id}/password`, {
                adminId: user.id,
                newPassword: newPassword
            }, config);

            Alert.alert('Success', 'Password changed successfully');
            setIsPasswordModalOpen(false);
            setNewPassword('');
        } catch (error) {
            console.error('Error changing password:', error);
            Alert.alert('Error', 'Failed to change password');
        }
    };

    const handleSaveVideo = async (videoUrl) => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync(true);
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant permission to save videos to your gallery.');
                return;
            }

            const filename = videoUrl.split('/').pop() || `video_${Date.now()}.mp4`;
            const fileUri = FileSystem.documentDirectory + filename;

            const downloadRes = await FileSystem.downloadAsync(videoUrl, fileUri);

            if (downloadRes.status === 200) {
                await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
                Alert.alert('Success', 'Video saved to gallery!');
            } else {
                Alert.alert('Error', 'Failed to download video.');
            }

        } catch (error) {
            console.error('Save video error:', error);
            Alert.alert('Error', 'An error occurred while saving the video.');
        }
    };

    // Render Helpers
    const renderTabButton = (key, label) => (
        <TouchableOpacity
            style={[styles.tabButton, activeTab === key && styles.activeTabButton]}
            onPress={() => setActiveTab(key)}
        >
            <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>{label}</Text>
        </TouchableOpacity>
    );

    const renderOverview = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>

            {/* Password Button Section - Prominent at top or middle as per image */}
            <TouchableOpacity
                style={styles.mainActionButton} // Blue button as requested
                onPress={() => setIsPasswordModalOpen(true)}
            >
                <Text style={styles.mainActionText}>Change password</Text>
            </TouchableOpacity>

            {/* Info Cards */}
            <View style={styles.infoSection}>
                {/* Credentials */}
                <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                        <Ionicons name="person-outline" size={20} color="#4CAF50" />
                    </View>
                    <View style={styles.detailTextBox}>
                        <Text style={styles.detailLabel}>Username</Text>
                        <Text style={styles.detailValue}>{supervisor.username}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                        <Ionicons name="briefcase-outline" size={20} color="#4CAF50" />
                    </View>
                    <View style={styles.detailTextBox}>
                        <Text style={styles.detailLabel}>Role</Text>
                        <Text style={styles.detailValue}>Supervisor</Text>
                    </View>
                </View>

                {/* Assigned Sites */}
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Assigned Sites</Text>
                {supervisor.assignedSites && supervisor.assignedSites.length > 0 ? (
                    <View style={styles.sitesContainer}>
                        {supervisor.assignedSites.map((site, index) => (
                            <View key={index} style={styles.siteChip}>
                                <Ionicons name="location" size={14} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={styles.siteChipText}>{site.siteName || site.name || 'Unknown Site'}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.emptyText}>No sites assigned.</Text>
                )}
            </View>

            <View style={styles.infoSection}>
                <TouchableOpacity style={styles.deleteButtonOutline} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={18} color="#FF5252" style={{ marginRight: 8 }} />
                    <Text style={styles.deleteButtonText}>Delete Supervisor</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );

    const renderAttendance = () => {
        if (loading && attendance.length === 0) {
            return <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#4CAF50" />;
        }

        const markedDates = {};
        attendance.forEach(item => {
            const dateStr = new Date(item.timestamp).toISOString().split('T')[0];
            markedDates[dateStr] = { marked: true, dotColor: '#4CAF50' };
        });

        if (selectedDate) {
            markedDates[selectedDate] = {
                ...(markedDates[selectedDate] || {}),
                selected: true,
                selectedColor: '#4CAF50'
            };
        }

        const filteredAttendance = selectedDate
            ? attendance.filter(item => new Date(item.timestamp).toISOString().split('T')[0] === selectedDate)
            : attendance;

        return (
            <FlatList
                data={filteredAttendance}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={{ marginBottom: 16 }}>
                        <Calendar
                            markedDates={markedDates}
                            onDayPress={day => {
                                setSelectedDate(curr => curr === day.dateString ? null : day.dateString);
                            }}
                            theme={{
                                backgroundColor: '#ffffff',
                                calendarBackground: '#ffffff',
                                textSectionTitleColor: '#b6c1cd',
                                selectedDayBackgroundColor: '#4CAF50',
                                selectedDayTextColor: '#ffffff',
                                todayTextColor: '#4CAF50',
                                dayTextColor: '#2d4150',
                                textDisabledColor: '#d9e1e8',
                                dotColor: '#4CAF50',
                                selectedDotColor: '#ffffff',
                                arrowColor: '#4CAF50',
                                disabledArrowColor: '#d9e1e8',
                                monthTextColor: '#2d4150',
                                indicatorColor: '#4CAF50',
                                textDayFontFamily: isIOS ? 'System' : 'Roboto',
                                textMonthFontFamily: isIOS ? 'System' : 'Roboto',
                                textDayHeaderFontFamily: isIOS ? 'System' : 'Roboto',
                                textDayFontWeight: '300',
                                textMonthFontWeight: 'bold',
                                textDayHeaderFontWeight: '300',
                                textDayFontSize: 14,
                                textMonthFontSize: 16,
                                textDayHeaderFontSize: 13
                            }}
                            style={{
                                borderRadius: 16,
                                borderColor: '#f0f0f0',
                                borderWidth: 1,
                                marginBottom: 16,
                                overflow: 'hidden'
                            }}
                        />
                        {selectedDate && (
                            <TouchableOpacity onPress={() => setSelectedDate(null)} style={{ alignSelf: 'center', marginTop: 10 }}>
                                <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Show All Records</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                ListEmptyComponent={
                    <Text style={styles.emptyListText}>
                        {selectedDate ? `No attendance on ${selectedDate}` : 'No attendance records found.'}
                    </Text>
                }
                renderItem={({ item }) => (
                    <View style={styles.logItem}>
                        <View style={styles.logHeader}>
                            <View style={[styles.logBadge, { backgroundColor: item.type === 'login' ? '#E8F5E9' : '#FFEBEE' }]}>
                                <Text style={[styles.logBadgeText, { color: item.type === 'login' ? '#2E7D32' : '#C62828' }]}>
                                    {item.type === 'login' ? 'IN' : 'OUT'}
                                </Text>
                            </View>
                            <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                        </View>
                        <Text style={styles.logLocation}>📍 {item.location?.displayText || 'Unknown Location'}</Text>
                        {item.photo && (
                            <TouchableOpacity style={styles.viewPhotoBtn} onPress={() => setSelectedAttendance(item)}>
                                <Ionicons name="image-outline" size={16} color="#4CAF50" style={{ marginRight: 5 }} />
                                <Text style={styles.viewPhotoText}>View Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            />
        );
    };

    const renderMessages = () => {
        if (loading && messages.length === 0) {
            return <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#4CAF50" />;
        }

        return (
            <FlatList
                data={messages}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyListText}>No messages sent.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.messageItem}>
                        <View style={styles.messageHeader}>
                            <Text style={styles.messageSite}>{item.siteName}</Text>
                            <Text style={styles.messageTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                        </View>
                        <Text style={styles.messageContent}>{item.content}</Text>
                        {item.videoUrl && (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={styles.viewVideoBtn}
                                    onPress={() => setSelectedVideo(item.videoUrl)}
                                >
                                    <Ionicons name="play-circle-outline" size={16} color="#4CAF50" style={{ marginRight: 6 }} />
                                    <Text style={styles.viewVideoText}>View</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.viewVideoBtn}
                                    onPress={() => handleSaveVideo(item.videoUrl)}
                                >
                                    <Ionicons name="download-outline" size={16} color="#4CAF50" style={{ marginRight: 6 }} />
                                    <Text style={styles.viewVideoText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            />
        );
    };

    if (!supervisor) return null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

            {/* Header / Background */}
            <View style={styles.headerBackground}>
                <SafeAreaView>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Supervisor Details</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            {/* Main Content Card Wrapper */}
            <View style={styles.mainCardWrapper}>
                {/* Tabs */}
                <View style={styles.tabBar}>
                    {renderTabButton('overview', 'Overview')}
                    {renderTabButton('attendance', 'Attendance')}
                    {renderTabButton('messages', 'Messages')}
                </View>

                {/* Tab Content */}
                <View style={styles.contentArea}>
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'attendance' && renderAttendance()}
                    {activeTab === 'messages' && renderMessages()}
                </View>
            </View>

            {/* Photo Modal */}
            <Modal visible={!!selectedAttendance} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalCloseArea} onPress={() => setSelectedAttendance(null)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Attendance Photo</Text>
                            <TouchableOpacity onPress={() => setSelectedAttendance(null)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        {selectedAttendance && (
                            <View style={styles.modalBody}>
                                <Image
                                    source={{ uri: selectedAttendance.photo }}
                                    style={styles.modalImage}
                                    resizeMode="contain"
                                />
                                <View style={styles.modalMeta}>
                                    <Text style={styles.modalLabel}>Time: <Text style={styles.modalValue}>{new Date(selectedAttendance.timestamp).toLocaleString()}</Text></Text>
                                    <Text style={styles.modalLabel}>Location: <Text style={styles.modalValue}>{selectedAttendance.location?.displayText || 'N/A'}</Text></Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Video Modal */}
            <Modal visible={!!selectedVideo} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalCloseArea} onPress={() => setSelectedVideo(null)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Video Message</Text>
                            <TouchableOpacity onPress={() => setSelectedVideo(null)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <Video
                                style={{ width: '100%', height: 300, backgroundColor: 'black', borderRadius: 8 }}
                                source={{ uri: selectedVideo }}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                isLooping={false}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Password Change Modal */}
            <Modal visible={isPasswordModalOpen} transparent={true} animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity style={styles.modalCloseArea} onPress={() => setIsPasswordModalOpen(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={{ marginBottom: 15, color: '#666' }}>
                                Enter a new password for <Text style={{ fontWeight: 'bold' }}>{supervisor.username}</Text>.
                            </Text>
                            <TextInput
                                placeholder="New Password"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                style={styles.input}
                                autoCapitalize="none"
                                secureTextEntry={false}
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setIsPasswordModalOpen(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handlePasswordChange}
                                >
                                    <Text style={styles.submitBtnText}>Update Password</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#4CAF50' }, // Green theme

    // Header
    headerBackground: {
        backgroundColor: '#4CAF50', // Main Green Color
        paddingBottom: 25,
        paddingTop: isIpad ? 10 : (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 0)
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        justifyContent: 'space-between',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    backButton: {
        padding: 5,
    },

    // Main Card Wrapper - The white card look
    mainCardWrapper: {
        flex: 1,
        backgroundColor: '#f2f4f8',
        marginHorizontal: 20,
        marginBottom: 30, // space at bottom
        marginTop: 5,
        borderRadius: 24,
        overflow: 'hidden',
        // elevation: 5, // Optional shadow
    },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#f1f3f5', // Light grey container
        padding: 4,
        margin: 20,
        borderRadius: 16,
        marginBottom: 10,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    activeTabButton: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        color: '#888',
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
        color: '#4CAF50', // Active Green
        fontWeight: 'bold',
    },

    // Content Area
    contentArea: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
        paddingHorizontal: 20,
    },

    // Overview Styles
    mainActionButton: {
        backgroundColor: '#4CAF50', // Green button color
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
        elevation: 3,
        shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
    },
    mainActionText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },

    // Info Cards
    infoSection: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    detailTextBox: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 13,
        color: '#888',
        marginBottom: 3,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    sitesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    siteChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    siteChipText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
        fontSize: 13,
    },
    deleteButtonOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FF5252',
        backgroundColor: '#FFEBEE',
        marginTop: 5,
    },
    deleteButtonText: {
        color: '#D32F2F',
        fontWeight: 'bold',
        fontSize: 15,
    },

    // Attendance & Messages Common
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    emptyListText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 40,
    },

    // Attendance Log Styles
    logItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    logBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    logBadgeText: { fontSize: 12, fontWeight: 'bold' },
    logTime: { color: '#666', fontSize: 12 },
    logLocation: { color: '#444', fontSize: 13, marginBottom: 8 },
    viewPhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#4CAF50',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    viewPhotoText: { color: '#4CAF50', fontSize: 12 },

    // Message Item Styles
    messageItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    messageSite: { fontWeight: 'bold', color: '#333', fontSize: 14 },
    messageTime: { color: '#888', fontSize: 11 },
    messageContent: { color: '#555', fontSize: 14, lineHeight: 20 },
    viewVideoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        marginTop: 8,
    },
    viewVideoText: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCloseArea: {
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    modalBody: { padding: 16 },
    modalImage: { width: '100%', height: 300, borderRadius: 8, marginBottom: 16, backgroundColor: '#f0f0f0' },
    modalMeta: {},
    modalLabel: { fontWeight: 'bold', color: '#555', marginBottom: 4 },
    modalValue: { fontWeight: 'normal' },

    // Password Change Modal
    input: {
        width: '100%',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: '#fff',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
    },
    cancelBtnText: {
        color: '#333',
        fontWeight: '600',
    },
    submitBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
    },
    submitBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default SupervisorDetailScreen;
