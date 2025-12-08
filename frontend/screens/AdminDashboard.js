import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Platform,
    Dimensions,
    StatusBar,
    SafeAreaView,
    SectionList,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const AdminDashboard = () => {
    const [sites, setSites] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [staff, setStaff] = useState([]);
    const [supervisors, setSupervisors] = useState([]); // NEW: Supervisors State
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState(''); // NEW: Search Query
    const navigation = useNavigation();
    const [showAddOptions, setShowAddOptions] = useState(false);
    const { user, API_BASE_URL, logout, token } = useAuth(); // Destructure token

    // --- Data Fetching ---

    const fetchWarehouses = useCallback(async () => {
        if (!user || !user.id) {
            setWarehouses([]);
            return;
        }
        try {
            const response = await axios.get(`${API_BASE_URL}/api/warehouses?adminId=${user.id}`);
            if (response.data.success) {
                setWarehouses(response.data.data);
            }
        } catch (error) {
            setWarehouses([]);
            console.log('Error fetching warehouses:', error);
        }
    }, [user, API_BASE_URL]);

    const fetchSites = useCallback(async () => {
        if (!user || !user.id) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/sites?adminId=${user.id}`);
            if (response.data.success) {
                setSites(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
        } finally {
            setLoading(false);
        }
    }, [user, API_BASE_URL]);

    // NEW: Fetch Staff
    const fetchStaff = useCallback(async () => {
        if (!user || !user.id) {
            setStaff([]);
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_BASE_URL}/api/staff`, config);
            if (response.data.success) {
                setStaff(response.data.data || []);
            }
        } catch (error) {
            console.log('Error fetching staff:', error);
            // Don't alert here to avoid spamming if permissions are weird on load
        }
    }, [user, API_BASE_URL, token]);

    // NEW: Fetch Supervisors
    const fetchSupervisors = useCallback(async () => {
        if (!user || !user.id) {
            setSupervisors([]);
            return;
        }
        try {
            const response = await axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`);
            if (response.data.success) {
                setSupervisors(response.data.data || []);
            }
        } catch (error) {
            console.log('Error fetching supervisors:', error);
        }
    }, [user, API_BASE_URL]);

    const fetchAllData = useCallback(async () => {
        if (!user) return;
        setRefreshing(true);
        await Promise.all([fetchSites(), fetchWarehouses(), fetchStaff(), fetchSupervisors()]);
        setRefreshing(false);
    }, [fetchSites, fetchWarehouses, fetchStaff, fetchSupervisors, user]);

    useEffect(() => {
        if (user) {
            fetchAllData();
            const unsubscribe = navigation.addListener('focus', () => {
                if (user) fetchAllData();
            });
            return unsubscribe;
        }
    }, [navigation, user, fetchAllData]);

    // --- Action Handlers ---

    const handleLogout = useCallback(() => {
        logout();
    }, [logout]);

    const deleteSite = useCallback(async (siteId) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this site?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await axios.delete(`${API_BASE_URL}/api/sites/${siteId}?adminId=${user.id}`);
                        fetchSites();
                        Alert.alert('Success', 'Site deleted successfully');
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete site');
                    }
                }
            }
        ]);
    }, [API_BASE_URL, fetchSites, user]);

    const deleteWarehouse = useCallback(async (warehouseId) => {
        Alert.alert('Confirm Delete', 'Delete warehouse and all associated managers?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await axios.delete(`${API_BASE_URL}/api/warehouses/${warehouseId}?adminId=${user.id}`);
                        fetchWarehouses();
                        Alert.alert('Success', 'Warehouse deleted successfully');
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete warehouse');
                    }
                }
            }
        ]);
    }, [API_BASE_URL, fetchWarehouses, user]);

    // NEW: Delete Staff
    const deleteStaff = useCallback(async (staffId) => {
        Alert.alert('Confirm Delete', 'Delete this staff member?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const config = { headers: { Authorization: `Bearer ${token}` } };
                        await axios.delete(`${API_BASE_URL}/api/staff/${staffId}`, config);
                        fetchStaff();
                        Alert.alert('Success', 'Staff member deleted');
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete staff member');
                    }
                }
            }
        ]);
    }, [API_BASE_URL, fetchStaff, token]);

    // NEW: Delete Supervisor (Mostly handled in ManageSupervisors, but good to have)
    // const deleteSupervisor = ... (Skipping simple delete here as web redirects to Global List, but we can add if needed. For now sticking to parity with "Manage Global List" link pattern)


    // --- Helpers ---

    const getSiteAttendance = useCallback((site) => {
        if (!site.workers || site.workers.length === 0) {
            return { present: 0, total: 0, percentage: 0, absent: 0, notMarked: 0 };
        }
        const today = new Date().toDateString();
        let presentCount = 0;
        let absentCount = 0;
        let notMarkedCount = 0;
        const totalWorkers = site.workers.length;

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
        const percentage = totalWorkers > 0 ? Math.round((presentCount / totalWorkers) * 100) : 0;
        return { present: presentCount, absent: absentCount, notMarked: notMarkedCount, total: totalWorkers, percentage };
    }, []);

    const getSiteActivitySummary = useCallback((site) => {
        const recentLogs = site.recentActivityLogs || [];
        const todayLogs = recentLogs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString());
        return { totalLogs: recentLogs.length, todayLogs: todayLogs.length, lastActivity: recentLogs.length > 0 ? recentLogs[0] : null };
    }, []);

    // --- Loading State ---
    if (!user) {
        return (
            <LinearGradient colors={["#2094F3", "#0B7DDA"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={{ marginTop: 20, color: '#FFFFFF', fontSize: 16 }}>Loading user data...</Text>
                </View>
            </LinearGradient>
        );
    }

    // --- Filtering Logic ---
    const lowerQuery = searchQuery.toLowerCase();

    const filteredWarehouses = warehouses.filter(w =>
        w.warehouseName?.toLowerCase().includes(lowerQuery) ||
        w.location?.toLowerCase().includes(lowerQuery)
    );

    const filteredSites = sites.filter(s =>
        s.siteName?.toLowerCase().includes(lowerQuery) ||
        s.location?.toLowerCase().includes(lowerQuery)
    );

    const filteredStaff = staff.filter(s =>
        s.fullName?.toLowerCase().includes(lowerQuery) ||
        s.username?.toLowerCase().includes(lowerQuery)
    );

    const filteredSupervisors = supervisors.filter(s =>
        s.username?.toLowerCase().includes(lowerQuery)
    );

    // --- Render Items ---

    const renderWarehouseCard = ({ item: wh }) => (
        <View style={styles.warehouseCard}>
            <TouchableOpacity
                style={styles.warehouseCardContent}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('WarehouseDetails', { warehouse: wh })}
            >
                <View style={styles.siteHeader}>
                    <View style={styles.siteMainInfo}>
                        <Text style={styles.siteName}>{wh.warehouseName}</Text>
                        <Text style={styles.siteLocation}>
                            <Ionicons name="location-outline" color="#be9c6e" size={15} /> {wh.location}
                        </Text>
                    </View>
                </View>
                <View style={styles.siteStats}>
                    <View style={styles.statItem}>
                        <Ionicons name="cube-outline" size={isIpad ? 20 : 16} color="#E69138" />
                        <Text style={styles.statText}>{wh.supplies?.length || 0}</Text>
                        <Text style={styles.statLabel}>Supplies</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="people-outline" size={isIpad ? 20 : 16} color="#795548" />
                        <Text style={styles.statText}>{wh.managers?.length || 0}</Text>
                        <Text style={styles.statLabel}>Managers</Text>
                    </View>
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.warehousedeleteButton} onPress={() => deleteWarehouse(wh._id)}>
                <Ionicons name="trash-outline" size={isIpad ? 22 : 20} color="#ff4444" />
            </TouchableOpacity>
        </View>
    );

    const renderSiteCard = ({ item }) => {
        const attendance = getSiteAttendance(item);
        const activity = getSiteActivitySummary(item);

        return (
            <View style={styles.siteCard}>
                <TouchableOpacity
                    style={styles.siteContent}
                    onPress={() => navigation.navigate('SiteDetails', { site: item, siteName: item.siteName })}
                >
                    <View style={styles.siteHeader}>
                        <View style={styles.siteMainInfo}>
                            <Text style={styles.siteName}>{item.siteName}</Text>
                            <Text style={styles.siteLocation}>📍 {item.location}</Text>
                        </View>
                        <View style={styles.attendanceBadge}>
                            <Text style={styles.attendancePercentage}>{attendance.percentage}%</Text>
                            <Text style={styles.attendanceLabel}>Present</Text>
                        </View>
                    </View>

                    <View style={styles.siteStats}>
                        <View style={styles.statItem}>
                            <Ionicons name="cube-outline" size={isIpad ? 18 : 14} color="#007bff" />
                            <Text style={styles.statText}>{item.supplies?.length || 0}</Text>
                            <Text style={styles.statLabel}>Supplies</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="people-outline" size={isIpad ? 18 : 14} color="#28a745" />
                            <Text style={styles.statText}>{item.workers?.length || 0}</Text>
                            <Text style={styles.statLabel}>Workers</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="person-outline" size={isIpad ? 18 : 14} color="#6f42c1" />
                            <Text style={styles.statText}>{item.supervisors?.length || 0}</Text>
                            <Text style={styles.statLabel}>Supervisors</Text>
                        </View>
                    </View>

                    <View style={styles.attendanceDetails}>
                        <View style={styles.attendanceItem}>
                            <View style={[styles.attendanceDot, { backgroundColor: '#28a745' }]} />
                            <Text style={styles.attendanceText}>{attendance.present} Present</Text>
                        </View>
                        <View style={styles.attendanceItem}>
                            <View style={[styles.attendanceDot, { backgroundColor: '#dc3545' }]} />
                            <Text style={styles.attendanceText}>{attendance.absent} Absent</Text>
                        </View>
                    </View>

                    {activity.lastActivity && (
                        <View style={styles.lastActivity}>
                            <Text style={styles.lastActivityText} numberOfLines={1}>Latest: {activity.lastActivity.description}</Text>
                            <Text style={styles.lastActivityTime}>
                                {new Date(activity.lastActivity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteSite(item._id)}>
                    <Ionicons name="trash-outline" size={isIpad ? 22 : 20} color="#ff4444" />
                </TouchableOpacity>
            </View>
        );
    };

    // NEW: Staff Card Renderer
    const renderStaffCard = ({ item }) => (
        <View style={styles.staffCard}>
            <TouchableOpacity
                style={styles.staffContent}
                onPress={() => navigation.navigate('StaffDetails', { staff: item })}
            >
                <View style={styles.staffHeader}>
                    <View style={styles.staffAvatar}>
                        <Text style={styles.staffAvatarText}>
                            {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    </View>
                    <View style={styles.staffInfo}>
                        <Text style={styles.staffName}>{item.fullName}</Text>
                        <Text style={styles.staffUsername}>@{item.username}</Text>
                    </View>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{item.role || 'Staff'}</Text>
                    </View>
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.staffDeleteButton} onPress={() => deleteStaff(item._id)}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </TouchableOpacity>
        </View>
    );

    // NEW: Supervisor Card Renderer
    const renderSupervisorCard = ({ item }) => (
        <View style={styles.supervisorCard}>
            <TouchableOpacity
                style={styles.supervisorContent}
                // Supervisors are better managed in the detailed list, but we can open simplified detail or the management screen
                onPress={() => navigation.navigate('SupervisorDetail', { supervisor: item })}
            >
                <View style={styles.supervisorHeader}>
                    <View style={styles.supervisorIcon}>
                        <Ionicons name="briefcase-outline" size={24} color="#6610f2" />
                    </View>
                    <View style={styles.supervisorInfo}>
                        <Text style={styles.supervisorName}>{item.username}</Text>
                        <Text style={styles.supervisorSites}>
                            {item.assignedSites?.length ? `${item.assignedSites.length} Sites Assigned` : 'No Sites Assigned'}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderSectionHeader = ({ section: { title, icon, count, action } }) => (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
                <Ionicons name={icon} size={isIpad ? 24 : 20} color="#2094F3" />
                <Text style={styles.sectionHeaderTitle}>{title}</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                </View>
            </View>
            {action && (
                <TouchableOpacity onPress={action.onPress} style={styles.sectionHeaderAction}>
                    <Text style={styles.sectionHeaderActionText}>{action.label}</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    // Prepare sections data
    const sections = [];

    if (filteredWarehouses.length > 0) {
        sections.push({
            title: 'Warehouses',
            icon: 'storefront-outline',
            count: filteredWarehouses.length,
            data: filteredWarehouses,
            renderItem: renderWarehouseCard,
        });
    }

    if (filteredSites.length > 0) {
        sections.push({
            title: 'Sites',
            icon: 'business-outline',
            count: filteredSites.length,
            data: filteredSites,
            renderItem: renderSiteCard,
        });
    }

    if (filteredStaff.length > 0) {
        sections.push({
            title: 'Staff Members',
            icon: 'people-outline',
            count: filteredStaff.length,
            data: filteredStaff,
            renderItem: renderStaffCard,
        });
    }

    if (filteredSupervisors.length > 0) {
        sections.push({
            title: 'Supervisors',
            icon: 'briefcase-outline',
            count: filteredSupervisors.length,
            data: filteredSupervisors,
            renderItem: renderSupervisorCard,
            action: {
                label: 'Manage Global List',
                onPress: () => navigation.navigate('ManageSupervisors')
            }
        });
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient colors={["#2094F3", "#0B7DDA"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>{user.username}'s Dashboard</Text>
                                <Text style={styles.subtitle}>
                                    {warehouses.length} warehouse(s) • {sites.length} site(s) • {staff.length} staff • {supervisors.length} supervisors
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                                <Ionicons name="log-out-outline" size={isIpad ? 26 : 24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Content Area */}
                        <View style={styles.contentArea}>
                            {/* NEW: Search Bar */}
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search sites, warehouses, or staff..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#9CA3AF"
                                    clearButtonMode="while-editing"
                                />
                            </View>

                            {/* NEW: Quick Actions Row */}
                            <View style={styles.quickActionsRow}>
                                <TouchableOpacity
                                    style={[styles.quickActionButton, { backgroundColor: '#6f42c1' }]}
                                    onPress={() => Alert.alert('Coming Soon', 'Site Messages screen is under construction for mobile.')}
                                >
                                    <Ionicons name="videocam-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.quickActionText}>Messages</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.quickActionButton, { backgroundColor: '#fd7e14' }]}
                                    onPress={() => Alert.alert('Coming Soon', 'Activity Logs screen is under construction for mobile.')}
                                >
                                    <Ionicons name="list-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.quickActionText}>Logs</Text>
                                </TouchableOpacity>
                            </View>

                            {sections.length > 0 ? (
                                <SectionList
                                    sections={sections}
                                    keyExtractor={(item, index) => item._id || index.toString()}
                                    renderItem={({ item, section }) => section.renderItem({ item })}
                                    renderSectionHeader={renderSectionHeader}
                                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAllData} />}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.listContainer}
                                    stickySectionHeadersEnabled={false}
                                />
                            ) : (
                                <View style={styles.emptyState}>
                                    <Ionicons name={searchQuery ? "search-outline" : "business-outline"} size={isIpad ? 80 : 64} color="#9CA3AF" />
                                    <Text style={styles.emptyText}>
                                        {searchQuery ? 'No results found matching your search' : 'No warehouses, sites or staff created yet'}
                                    </Text>
                                    {!searchQuery && (
                                        <Text style={styles.emptySubtext}>Tap the + button to create resources</Text>
                                    )}
                                </View>
                            )}

                            {/* Add Button */}
                            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddOptions(true)}>
                                <Ionicons name="add" size={isIpad ? 40 : 24} color="#fff" />
                            </TouchableOpacity>

                            {/* Add Options Modal */}
                            {showAddOptions && (
                                <View style={styles.modalOverlay}>
                                    <View style={styles.modalCard}>
                                        <TouchableOpacity style={styles.modalOption} onPress={() => { setShowAddOptions(false); navigation.navigate('CreateSite'); }}>
                                            <Ionicons name="business-outline" size={22} color="#2094F3" style={{ marginRight: 10 }} />
                                            <Text style={styles.modalOptionText}>Create Site</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.modalOption} onPress={() => { setShowAddOptions(false); navigation.navigate('CreateWarehouse'); }}>
                                            <Ionicons name="storefront-outline" size={22} color="#E69138" style={{ marginRight: 10 }} />
                                            <Text style={styles.modalOptionText}>Create Warehouse</Text>
                                        </TouchableOpacity>

                                        {/* NEW: Create Staff Option */}
                                        <TouchableOpacity style={styles.modalOption} onPress={() => { setShowAddOptions(false); navigation.navigate('CreateStaff'); }}>
                                            <Ionicons name="people-outline" size={22} color="#10B981" style={{ marginRight: 10 }} />
                                            <Text style={styles.modalOptionText}>Create Staff</Text>
                                        </TouchableOpacity>

                                        {/* NEW: Create Supervisor Option */}
                                        <TouchableOpacity style={styles.modalOption} onPress={() => { setShowAddOptions(false); navigation.navigate('CreateSupervisor'); }}>
                                            <Ionicons name="briefcase-outline" size={22} color="#6610f2" style={{ marginRight: 10 }} />
                                            <Text style={styles.modalOptionText}>Create Supervisor</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddOptions(false)}>
                                            <Text style={styles.modalCancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    mainContainer: { flex: 1, width: isIpad ? '85%' : '100%', alignSelf: 'center' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: screenWidth * 0.05, paddingTop: screenHeight * 0.06, paddingBottom: screenHeight * 0.03 },
    title: { color: '#FFFFFF', fontSize: isIpad ? screenWidth * 0.035 : screenWidth * 0.06, fontWeight: 'bold', marginBottom: screenHeight * 0.006 },
    subtitle: { color: 'rgba(255, 255, 255, 0.8)', fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035, fontWeight: '400' },
    logoutButton: { padding: screenWidth * 0.015 },

    // Content
    contentArea: { flex: 1, backgroundColor: '#E5E7EB', borderTopLeftRadius: screenWidth * 0.08, borderTopRightRadius: screenWidth * 0.08, paddingHorizontal: screenWidth * 0.04, paddingTop: 20, paddingBottom: screenHeight * 0.04 },
    listContainer: { paddingBottom: screenHeight * 0.1 },

    // Search Bar
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, marginBottom: 20, height: 48, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, color: '#1f2937' },

    // Section Headers
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 16 },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    sectionHeaderTitle: { fontSize: isIpad ? 20 : 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
    countBadge: { backgroundColor: '#2094F3', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8, minWidth: 24, alignItems: 'center' },
    countText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

    // Cards General
    deleteButton: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(255, 0, 0, 0.08)', padding: 8, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    warehousedeleteButton: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255, 0, 0, 0.08)', padding: 8, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    // Warehouse Card
    warehouseCard: { backgroundColor: '#FEF8F0', borderRadius: 16, marginBottom: 16, shadowColor: '#E69138', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4, minHeight: 120, position: 'relative' },
    warehouseCardContent: { flex: 1, padding: 16 },

    // Site Card
    siteCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4, position: 'relative' },
    siteContent: { flex: 1, padding: 16 },
    siteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    siteMainInfo: { flex: 1 },
    siteName: { fontSize: isIpad ? 20 : 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    siteLocation: { fontSize: 14, color: '#666' },
    attendanceBadge: { backgroundColor: '#e3f2fd', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center', minWidth: 60 },
    attendancePercentage: { fontSize: 16, fontWeight: 'bold', color: '#1976d2' },
    attendanceLabel: { fontSize: 10, color: '#1976d2', marginTop: 2 },
    siteStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingVertical: 10, backgroundColor: '#f8f9fa', borderRadius: 8 },
    statItem: { alignItems: 'center', flex: 1 },
    statText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 4, marginBottom: 2 },
    statLabel: { fontSize: 12, color: '#666' },
    attendanceDetails: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    attendanceItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 },
    attendanceDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    attendanceText: { fontSize: 12, color: '#666' },
    lastActivity: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#007bff', marginTop: 8 },
    lastActivityText: { fontSize: 12, color: '#333', marginBottom: 2 },
    lastActivityTime: { fontSize: 11, color: '#888' },

    // Staff Card (NEW)
    staffCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, position: 'relative' },
    staffContent: { padding: 16, flexDirection: 'row', alignItems: 'center' },
    staffHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    staffAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    staffAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#0369A1' },
    staffInfo: { flex: 1 },
    staffName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    staffUsername: { fontSize: 14, color: '#6B7280' },
    roleBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 40 },
    roleText: { fontSize: 10, color: '#374151', fontWeight: '600', textTransform: 'uppercase' },
    staffDeleteButton: { position: 'absolute', right: 16, top: '50%', marginTop: -18, backgroundColor: 'rgba(255, 0, 0, 0.08)', padding: 8, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    // Empty State
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
    emptyText: { fontSize: 18, color: '#666', marginTop: 16, textAlign: 'center' },
    emptySubtext: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center' },

    // Quick Actions
    quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    quickActionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    quickActionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

    // Supervisor Card
    supervisorCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#6610f2', padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    supervisorContent: { flex: 1 },
    supervisorHeader: { flexDirection: 'row', alignItems: 'center' },
    supervisorIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3e5f5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    supervisorInfo: { flex: 1 },
    supervisorName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    supervisorSites: { fontSize: 12, color: '#666', marginTop: 2 },

    // Section Header Action
    sectionHeaderAction: { marginRight: 8 },
    sectionHeaderActionText: { color: '#007bff', fontSize: 12, fontWeight: '600' },

    // Add Button & Modal
    addButton: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#2094F3', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modalCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, minWidth: 260, alignItems: 'center', elevation: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
    modalOption: { paddingVertical: 15, paddingHorizontal: 20, width: '100%', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    modalOptionText: { fontSize: 16, color: '#333', fontWeight: '600' },
    modalCancel: { marginTop: 10, width: '100%', alignItems: 'center', paddingVertical: 10 },
    modalCancelText: { fontSize: 16, color: '#888' },
});

export default AdminDashboard;