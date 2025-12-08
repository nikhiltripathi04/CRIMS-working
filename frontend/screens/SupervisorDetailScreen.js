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
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get('window');
const isIpad = screenWidth >= 768;

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
                            // Note: Web used query param adminId, verify if needed. 
                            // Usually DELETE /api/auth/supervisors/:id checks auth header.
                            // Adding adminId just in case backend expects it.
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
            {/* Credentials Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="key-outline" size={20} color="#2094f3" />
                    <Text style={styles.cardTitle}>Credentials</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Username:</Text>
                    <Text style={styles.value}>{supervisor.username}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Role:</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Supervisor</Text>
                    </View>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>ID:</Text>
                    <Text style={[styles.value, { fontSize: 12, color: '#999' }]}>{supervisor._id}</Text>
                </View>
            </View>

            {/* Assigned Sites Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Ionicons name="briefcase-outline" size={20} color="#2094f3" />
                    <Text style={styles.cardTitle}>Assigned Sites</Text>
                </View>
                {supervisor.assignedSites && supervisor.assignedSites.length > 0 ? (
                    <View>
                        {supervisor.assignedSites.map((site, index) => (
                            <View key={index} style={styles.siteItem}>
                                <Ionicons name="location-outline" size={16} color="#007bff" style={{ marginRight: 8 }} />
                                <Text style={styles.siteName}>{site.siteName || site.name || 'Unknown Site'}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.emptyText}>No sites assigned.</Text>
                )}
            </View>
        </ScrollView>
    );

    const renderAttendance = () => {
        if (loading && attendance.length === 0) {
            return <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#2094f3" />;
        }

        return (
            <FlatList
                data={attendance}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyListText}>No attendance records found.</Text>}
                renderItem={({ item }) => (
                    <View style={styles.logItem}>
                        <View style={styles.logHeader}>
                            <View style={[styles.logBadge, { backgroundColor: item.type === 'login' ? '#d4edda' : '#f8d7da' }]}>
                                <Text style={[styles.logBadgeText, { color: item.type === 'login' ? '#155724' : '#721c24' }]}>
                                    {item.type === 'login' ? 'IN' : 'OUT'}
                                </Text>
                            </View>
                            <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                        </View>
                        <Text style={styles.logLocation}>📍 {item.location?.displayText || 'Unknown Location'}</Text>
                        {item.photo && (
                            <TouchableOpacity style={styles.viewPhotoBtn} onPress={() => setSelectedAttendance(item)}>
                                <Ionicons name="image-outline" size={16} color="#007bff" style={{ marginRight: 5 }} />
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
            return <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#2094f3" />;
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
                            <View style={styles.videoBadge}>
                                <Text style={styles.videoBadgeText}>📹 Video Attached</Text>
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
            <StatusBar barStyle="light-content" backgroundColor="#2094f3" />
            <LinearGradient colors={["#2094F3", "#0B7DDA"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <SafeAreaView style={styles.safeArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>{supervisor.username}</Text>
                            <Text style={styles.headerSubtitle}>Supervisor Details</Text>
                        </View>
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={22} color="#ffcccc" />
                        </TouchableOpacity>
                    </View>

                    {/* Content Container */}
                    <View style={styles.contentContainer}>
                        {/* Tabs */}
                        <View style={styles.tabBar}>
                            {renderTabButton('overview', 'Overview')}
                            {renderTabButton('attendance', 'Attendance')}
                            {renderTabButton('messages', 'Messages')}
                        </View>

                        {/* Active Tab Content */}
                        <View style={styles.tabBody}>
                            {activeTab === 'overview' && renderOverview()}
                            {activeTab === 'attendance' && renderAttendance()}
                            {activeTab === 'messages' && renderMessages()}
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

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
                                    resizeMode="contain" // or cover
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: isIpad ? 20 : 10,
        paddingBottom: 20,
        justifyContent: 'space-between'
    },
    backButton: { padding: 5 },
    headerTitleContainer: { alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    deleteButton: { padding: 5 },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 10,
        borderRadius: 12,
        padding: 4,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8
    },
    activeTabButton: {
        backgroundColor: '#e3f2fd'
    },
    tabText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 13
    },
    activeTabText: {
        color: '#2094f3',
        fontWeight: 'bold'
    },

    // Content
    contentContainer: {
        flex: 1,
        backgroundColor: '#f4f6f9',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: 10,
        overflow: 'hidden'
    },
    tabBody: {
        flex: 1,
        paddingTop: 10
    },
    tabContent: {
        padding: 20
    },
    listContent: {
        padding: 20,
        paddingBottom: 40
    },

    // Card Styles
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 8
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9'
    },
    label: { color: '#666', fontSize: 14 },
    value: { color: '#333', fontWeight: '600', fontSize: 14 },
    badge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4
    },
    badgeText: { color: '#007bff', fontSize: 12, fontWeight: 'bold' },
    emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },

    // Site Item
    siteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 8
    },
    siteName: { color: '#333', fontWeight: '500' },

    // Attendance Log Styles
    logItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 1
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    logBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    logBadgeText: { fontSize: 12, fontWeight: 'bold' },
    logTime: { color: '#666', fontSize: 12 },
    logLocation: { color: '#444', fontSize: 13, marginBottom: 8 },
    viewPhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#007bff',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4
    },
    viewPhotoText: { color: '#007bff', fontSize: 12 },
    emptyListText: { textAlign: 'center', color: '#999', marginTop: 40 },

    // Message Item Styles
    messageItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#007bff',
        elevation: 1
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    messageSite: { fontWeight: 'bold', color: '#333', fontSize: 14 },
    messageTime: { color: '#888', fontSize: 11 },
    messageContent: { color: '#555', fontSize: 14, lineHeight: 20 },
    videoBadge: {
        backgroundColor: '#e2e6ea',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 8
    },
    videoBadgeText: { fontSize: 11, color: '#333' },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalCloseArea: {
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        maxHeight: '80%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    modalBody: { padding: 16 },
    modalImage: { width: '100%', height: 300, borderRadius: 8, marginBottom: 16, backgroundColor: '#f0f0f0' },
    modalMeta: {},
    modalLabel: { fontWeight: 'bold', color: '#555', marginBottom: 4 },
    modalValue: { fontWeight: 'normal' }
});

export default SupervisorDetailScreen;
