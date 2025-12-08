import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    FlatList,
    ActivityIndicator,
    Platform,
    Dimensions,
    StatusBar,
    SafeAreaView,
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

const GlobalSitesScreen = () => {
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation();
    const { user, API_BASE_URL } = useAuth();

    const fetchSites = useCallback(async () => {
        if (!user || !user.id) {
            setLoading(false);
            return;
        }
        try {
            // setLoading(true); // Don't set loading on refresh to avoid flicker
            const response = await axios.get(`${API_BASE_URL}/api/sites?adminId=${user.id}`);
            if (response.data.success) {
                setSites(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
            Alert.alert('Error', 'Failed to fetch sites');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, API_BASE_URL]);

    useEffect(() => {
        fetchSites();
    }, [fetchSites]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSites();
    };

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
        // const todayLogs = recentLogs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString());
        return { lastActivity: recentLogs.length > 0 ? recentLogs[0] : null };
    }, []);


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

    const filteredSites = sites.filter(s =>
        s.siteName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient colors={["#2094F3", "#0B7DDA"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.title}>All Sites</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        {/* Content Area */}
                        <View style={styles.contentArea}>
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search sites..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#9CA3AF"
                                    clearButtonMode="while-editing"
                                />
                            </View>

                            <FlatList
                                data={filteredSites}
                                keyExtractor={(item) => item._id}
                                renderItem={renderSiteCard}
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                contentContainerStyle={styles.listContainer}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="business-outline" size={64} color="#ccc" />
                                        <Text style={styles.emptyText}>No sites found</Text>
                                    </View>
                                )}
                            />

                            {/* FAB to create new site */}
                            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateSite')}>
                                <Ionicons name="add" size={isIpad ? 40 : 24} color="#fff" />
                            </TouchableOpacity>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    backButton: { padding: 8 },
    title: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    contentArea: { flex: 1, backgroundColor: '#E5E7EB', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 20 },
    listContainer: { paddingBottom: 100 },

    // Search
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, marginBottom: 20, height: 48, elevation: 2 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, color: '#1f2937' },

    // Card Styles
    siteCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, elevation: 3, position: 'relative' },
    siteContent: { padding: 16 },
    siteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    siteMainInfo: { flex: 1 },
    siteName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
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
    deleteButton: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(255, 0, 0, 0.08)', padding: 8, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { color: '#888', marginTop: 10 },
    addButton: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#2094F3', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
});

export default GlobalSitesScreen;
