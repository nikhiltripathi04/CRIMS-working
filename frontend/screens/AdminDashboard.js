import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Platform,
    Dimensions,
    StatusBar,
    SafeAreaView,
    SectionList
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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();
    const [showAddOptions, setShowAddOptions] = useState(false);
    const { user, API_BASE_URL, logout } = useAuth();

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
            Alert.alert('Error', 'Failed to fetch warehouses.');
        }
    }, [user, API_BASE_URL]);

    const fetchSites = useCallback(async () => {
        if (!user || !user.id) {
            console.log('User not available, skipping fetchSites');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log(`Fetching sites for admin: ${user.username} (ID: ${user.id})`);
            console.log('API URL:', `${API_BASE_URL}/api/sites?adminId=${user.id}`);

            const response = await axios.get(`${API_BASE_URL}/api/sites?adminId=${user.id}`);
            console.log('API Response:', response.data);

            if (response.data.success) {
                setSites(response.data.data);
                console.log(`Retrieved ${response.data.data.length} sites for this admin`);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to fetch sites');
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
            console.error('Error details:', error.response?.data || 'No detailed error');
            Alert.alert('Error', 'Failed to fetch sites. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user, API_BASE_URL]);

    const fetchAllData = useCallback(async () => {
        if (!user) return;

        setRefreshing(true);
        await Promise.all([fetchSites(), fetchWarehouses()]);
        setRefreshing(false);
    }, [fetchSites, fetchWarehouses, user]);



    const handleLogout = useCallback(() => {
        // Just call logout, don't navigate
        logout();
    }, [logout]);

    const deleteSite = useCallback(async (siteId) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this site?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log(`Deleting site ${siteId} with adminId=${user.id}`);
                            await axios.delete(`${API_BASE_URL}/api/sites/${siteId}?adminId=${user.id}`);
                            fetchSites();
                            Alert.alert('Success', 'Site deleted successfully');
                        } catch (error) {
                            console.error('Delete site error:', error);
                            console.error('Error response:', error.response?.data);
                            Alert.alert('Error', 'Failed to delete site');
                        }
                    }
                }
            ]
        );
    }, [API_BASE_URL, fetchSites, user]);

    const deleteWarehouse = useCallback(async (warehouseId) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this warehouse? This will also remove all associated managers.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log(`Deleting warehouse ${warehouseId} with adminId=${user.id}`);
                            await axios.delete(`${API_BASE_URL}/api/warehouses/${warehouseId}?adminId=${user.id}`);
                            fetchWarehouses();
                            Alert.alert('Success', 'Warehouse deleted successfully');
                        } catch (error) {
                            console.error('Delete warehouse error:', error);
                            console.error('Error response:', error.response?.data);
                            Alert.alert('Error', 'Failed to delete warehouse');
                        }
                    }
                }
            ]
        );
    }, [API_BASE_URL, fetchWarehouses, user]);

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
            const sortedAttendance = worker.attendance?.sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            ) || [];

            const todayAttendance = sortedAttendance.find(
                att => new Date(att.date).toDateString() === today
            );

            if (todayAttendance) {
                if (todayAttendance.status === 'present') {
                    presentCount++;
                } else if (todayAttendance.status === 'absent') {
                    absentCount++;
                }
            } else {
                notMarkedCount++;
            }
        });

        const percentage = totalWorkers > 0 ? Math.round((presentCount / totalWorkers) * 100) : 0;

        return {
            present: presentCount,
            absent: absentCount,
            notMarked: notMarkedCount,
            total: totalWorkers,
            percentage
        };
    }, []);

    const getSiteActivitySummary = useCallback((site) => {
        const recentLogs = site.recentActivityLogs || [];
        const todayLogs = recentLogs.filter(log => {
            const logDate = new Date(log.timestamp).toDateString();
            const today = new Date().toDateString();
            return logDate === today;
        });

        return {
            totalLogs: recentLogs.length,
            todayLogs: todayLogs.length,
            lastActivity: recentLogs.length > 0 ? recentLogs[0] : null
        };
    }, []);


    useEffect(() => {
        if (user) {
            fetchAllData();

            const unsubscribe = navigation.addListener('focus', () => {
                if (user) fetchAllData();
            });

            return unsubscribe;
        }
    }, [navigation, user, fetchAllData]);
    if (!user) {
        return (
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={{ marginTop: 20, color: '#FFFFFF', fontSize: 16 }}>Loading user data...</Text>
                </View>
            </LinearGradient>
        );
    }


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
                        <Text style={styles.statLabel}>Manager{wh.managers?.length !== 1 ? 's' : ''}</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Add delete button here */}
            <TouchableOpacity
                style={styles.warehousedeleteButton}
                onPress={() => deleteWarehouse(wh._id)}
            >
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
                    onPress={() => navigation.navigate('SiteDetails', {
                        site: item,
                        siteName: item.siteName
                    })}
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
                        {attendance.notMarked > 0 && (
                            <View style={styles.attendanceItem}>
                                <View style={[styles.attendanceDot, { backgroundColor: '#ffc107' }]} />
                                <Text style={styles.attendanceText}>{attendance.notMarked} Not Marked</Text>
                            </View>
                        )}
                    </View>

                    {activity.todayLogs > 0 && (
                        <View style={styles.activitySummary}>
                            <Ionicons name="pulse-outline" size={isIpad ? 14 : 12} color="#17a2b8" />
                            <Text style={styles.activityText}>
                                {activity.todayLogs} activities today
                            </Text>
                        </View>
                    )}

                    {activity.lastActivity && (
                        <View style={styles.lastActivity}>
                            <Text style={styles.lastActivityText} numberOfLines={1}>
                                Latest: {activity.lastActivity.description}
                            </Text>
                            <Text style={styles.lastActivityTime}>
                                {new Date(activity.lastActivity.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteSite(item._id)}
                >
                    <Ionicons name="trash-outline" size={isIpad ? 22 : 20} color="#ff4444" />
                </TouchableOpacity>
            </View>
        );
    };

    const renderSectionHeader = ({ section: { title, icon, count } }) => (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
                <Ionicons name={icon} size={isIpad ? 24 : 20} color="#2094F3" />
                <Text style={styles.sectionHeaderTitle}>{title}</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                </View>
            </View>
        </View>
    );

    // Prepare sections data
    const sections = [];

    if (warehouses.length > 0) {
        sections.push({
            title: 'Warehouses',
            icon: 'storefront-outline',
            count: warehouses.length,
            data: warehouses,
            renderItem: renderWarehouseCard,
        });
    }

    if (sites.length > 0) {
        sections.push({
            title: 'Sites',
            icon: 'business-outline',
            count: sites.length,
            data: sites,
            renderItem: renderSiteCard,
        });
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>
                                    {user.username}'s Dashboard
                                </Text>
                                <Text style={styles.subtitle}>
                                    {warehouses.length} warehouse{warehouses.length !== 1 ? 's' : ''} • {sites.length} site{sites.length !== 1 ? 's' : ''} • Admin Dashboard
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                                <Ionicons name="log-out-outline" size={isIpad ? 26 : 24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Content Area */}
                        <View style={styles.contentArea}>
                            {sections.length > 0 ? (
                                <SectionList
                                    sections={sections}
                                    keyExtractor={(item, index) => item._id || index.toString()}
                                    renderItem={({ item, section }) => section.renderItem({ item })}
                                    renderSectionHeader={renderSectionHeader}
                                    refreshControl={
                                        <RefreshControl refreshing={refreshing} onRefresh={fetchAllData} />
                                    }
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.listContainer}
                                    stickySectionHeadersEnabled={false}
                                />
                            ) : (
                                <View style={styles.emptyState}>
                                    <Ionicons name="business-outline" size={isIpad ? 80 : 64} color="#9CA3AF" />
                                    <Text style={styles.emptyText}>No warehouses or sites created yet</Text>
                                    <Text style={styles.emptySubtext}>
                                        Tap the + button to create your first warehouse or site
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => setShowAddOptions(true)}
                            >
                                <Ionicons name="add" size={isIpad ? 40 : 24} color="#fff" />
                            </TouchableOpacity>

                            {showAddOptions && (
                                <View style={styles.modalOverlay}>
                                    <View style={styles.modalCard}>
                                        <TouchableOpacity
                                            style={styles.modalOption}
                                            onPress={() => {
                                                setShowAddOptions(false);
                                                navigation.navigate('CreateSite');
                                            }}
                                        >
                                            <Text style={styles.modalOptionText}>Create Site</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.modalOption}
                                            onPress={() => {
                                                setShowAddOptions(false);
                                                navigation.navigate('CreateWarehouse');
                                            }}
                                        >
                                            <Text style={styles.modalOptionText}>Create Warehouse</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.modalCancel}
                                            onPress={() => setShowAddOptions(false)}
                                        >
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
    warehouseCard: {
        backgroundColor: '#FEF8F0',
        borderRadius: screenWidth * 0.04,
        marginBottom: screenHeight * 0.02,
        shadowColor: '#E69138',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
        minHeight: screenHeight * 0.15,
        overflow: 'hidden',
        position: 'relative',  // Add this to enable absolute positioning
    },
    warehouseCardContent: {
        flex: 1,
        padding: screenWidth * 0.04,
    },
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    mainContainer: {
        flex: 1,
        width: isIpad ? '85%' : '100%',
        alignSelf: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: screenWidth * 0.05,
        paddingTop: screenHeight * 0.06,
        paddingBottom: screenHeight * 0.03,
    },
    title: {
        color: '#FFFFFF',
        fontSize: isIpad ? screenWidth * 0.035 : screenWidth * 0.06,
        fontWeight: 'bold',
        marginBottom: screenHeight * 0.006,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        fontWeight: '400',
    },
    logoutButton: {
        padding: screenWidth * 0.015,
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderTopLeftRadius: screenWidth * 0.08,
        borderTopRightRadius: screenWidth * 0.08,
        paddingHorizontal: screenWidth * 0.04,
        paddingTop: screenHeight * 0.03,
        paddingBottom: screenHeight * 0.04,
        minHeight: '85%',
    },
    listContainer: {
        paddingBottom: screenHeight * 0.1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: screenHeight * 0.015,
        marginTop: screenHeight * 0.02,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionHeaderTitle: {
        fontSize: isIpad ? screenWidth * 0.032 : screenWidth * 0.05,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: screenWidth * 0.02,
    },
    countBadge: {
        backgroundColor: '#2094F3',
        borderRadius: screenWidth * 0.03,
        paddingHorizontal: screenWidth * 0.02,
        paddingVertical: screenHeight * 0.005,
        marginLeft: screenWidth * 0.02,
        minWidth: screenWidth * 0.06,
        alignItems: 'center',
    },
    countText: {
        color: '#FFFFFF',
        fontSize: isIpad ? screenWidth * 0.018 : screenWidth * 0.028,
        fontWeight: 'bold',
    },
    siteCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: screenWidth * 0.04,
        marginBottom: screenHeight * 0.02,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    siteContent: {
        flex: 1,
        padding: screenWidth * 0.04,
    },
    siteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: screenHeight * 0.015,
    },
    siteMainInfo: {
        flex: 1,
    },
    siteName: {
        fontSize: isIpad ? screenWidth * 0.028 : screenWidth * 0.045,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: screenHeight * 0.006,
    },
    siteLocation: {
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        color: '#666',
    },
    attendanceBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: screenWidth * 0.03,
        paddingVertical: screenHeight * 0.008,
        borderRadius: screenWidth * 0.05,
        alignItems: 'center',
        minWidth: screenWidth * 0.15,
    },
    attendancePercentage: {
        fontSize: isIpad ? screenWidth * 0.022 : screenWidth * 0.04,
        fontWeight: 'bold',
        color: '#1976d2',
    },
    attendanceLabel: {
        fontSize: isIpad ? screenWidth * 0.014 : screenWidth * 0.025,
        color: '#1976d2',
        marginTop: screenHeight * 0.003,
    },
    siteStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: screenHeight * 0.025,
        paddingVertical: screenHeight * 0.012,
        backgroundColor: '#f8f9fa',
        borderRadius: screenWidth * 0.02,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statText: {
        fontSize: isIpad ? screenWidth * 0.022 : screenWidth * 0.04,
        fontWeight: 'bold',
        color: '#333',
        marginTop: screenHeight * 0.005,
        marginBottom: screenHeight * 0.003,
    },
    statLabel: {
        fontSize: isIpad ? screenWidth * 0.016 : screenWidth * 0.028,
        color: '#666',
    },
    attendanceDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: screenHeight * 0.01,
    },
    attendanceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: screenWidth * 0.04,
        marginBottom: screenHeight * 0.006,
    },
    attendanceDot: {
        width: screenWidth * 0.02,
        height: screenWidth * 0.02,
        borderRadius: screenWidth * 0.01,
        marginRight: screenWidth * 0.015,
    },
    attendanceText: {
        fontSize: isIpad ? screenWidth * 0.018 : screenWidth * 0.03,
        color: '#666',
    },
    activitySummary: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: screenHeight * 0.01,
    },
    activityText: {
        fontSize: isIpad ? screenWidth * 0.018 : screenWidth * 0.03,
        color: '#17a2b8',
        marginLeft: screenWidth * 0.01,
        fontWeight: '500',
    },
    lastActivity: {
        backgroundColor: '#f8f9fa',
        padding: screenWidth * 0.03,
        borderRadius: screenWidth * 0.015,
        borderLeftWidth: screenWidth * 0.008,
        borderLeftColor: '#007bff',
        marginBottom: screenHeight * 0.015,
    },
    lastActivityText: {
        fontSize: isIpad ? screenWidth * 0.018 : screenWidth * 0.03,
        color: '#333',
        marginBottom: screenHeight * 0.003,
    },
    lastActivityTime: {
        fontSize: isIpad ? screenWidth * 0.016 : screenWidth * 0.028,
        color: '#888',
    },
    deleteButton: {
        position: 'absolute',
        bottom: screenHeight * 0.02,
        right: screenWidth * 0.04,
        backgroundColor: 'rgba(255, 0, 0, 0.08)',
        padding: screenWidth * 0.02,
        borderRadius: screenWidth * 0.05,
        width: screenWidth * 0.09,
        height: screenWidth * 0.09,
        alignItems: 'center',
        justifyContent: 'center',
    },
    warehousedeleteButton:{
        position: 'absolute',
        bottom: screenHeight * 0.02,
        right: screenWidth * 0.04,
        backgroundColor: 'rgba(255, 0, 0, 0.08)',
        padding: screenWidth * 0.02,
        borderRadius: screenWidth * 0.05,
        width: screenWidth * 0.09,
        height: screenWidth * 0.09,
        alignItems: 'center',
        justifyContent: 'center',
        top: screenHeight * 0.02,
    },
    addButton: {
        position: 'absolute',
        bottom: screenHeight * 0.03,
        right: screenWidth * 0.05,
        backgroundColor: '#2094F3',
        width: screenWidth * 0.14,
        height: screenWidth * 0.14,
        borderRadius: screenWidth * 0.07,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: screenWidth * 0.1,
        marginTop: screenHeight * 0.12,
    },
    emptyText: {
        fontSize: isIpad ? screenWidth * 0.028 : screenWidth * 0.045,
        color: '#666',
        marginTop: screenHeight * 0.025,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        color: '#888',
        marginTop: screenHeight * 0.012,
        textAlign: 'center',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    modalCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        minWidth: 240,
        alignItems: 'center',
        elevation: 12,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    modalOption: {
        paddingVertical: 15,
        paddingHorizontal: 32,
        width: '100%',
        alignItems: 'center',
    },
    modalOptionText: {
        fontSize: isIpad ? 22 : 16,
        color: '#2094F3',
        fontWeight: '700'
    },
    modalCancel: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    modalCancelText: {
        fontSize: isIpad ? 20 : 15,
        color: '#888'
    },
});

export default AdminDashboard;