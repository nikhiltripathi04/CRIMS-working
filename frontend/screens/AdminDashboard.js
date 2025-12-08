import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
    Dimensions,
    StatusBar,
    SafeAreaView,
    ScrollView,
    RefreshControl
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
    const [counts, setCounts] = useState({
        sites: 0,
        warehouses: 0,
        staff: 0,
        supervisors: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();
    const { user, API_BASE_URL, logout, token } = useAuth();

    const fetchCounts = useCallback(async () => {
        if (!user || !user.id) return;
        try {
            // We can optimize this by creating a dedicated stats endpoint in backend later.
            // For now, parallel fetch is fine for small scale.
            const [sitesRes, warehousesRes, staffRes, supervisorsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/sites?adminId=${user.id}`),
                axios.get(`${API_BASE_URL}/api/warehouses?adminId=${user.id}`),
                axios.get(`${API_BASE_URL}/api/staff`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`)
            ]);

            setCounts({
                sites: sitesRes.data.success ? sitesRes.data.data.length : 0,
                warehouses: warehousesRes.data.success ? warehousesRes.data.data.length : 0,
                staff: staffRes.data.success ? (staffRes.data.data ? staffRes.data.data.length : 0) : 0,
                supervisors: supervisorsRes.data.success ? (supervisorsRes.data.data ? supervisorsRes.data.data.length : 0) : 0
            });

        } catch (error) {
            console.error('Error fetching dashboard counts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, API_BASE_URL, token]);

    useEffect(() => {
        if (user) {
            fetchCounts();
            const unsubscribe = navigation.addListener('focus', () => {
                fetchCounts();
            });
            return unsubscribe;
        }
    }, [navigation, user, fetchCounts]);

    const handleLogout = () => {
        logout();
    };

    const DashboardCard = ({ title, count, icon, color, route, secondaryIcon }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate(route)}
            activeOpacity={0.9}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={28} color={color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{title}</Text>
                {count !== undefined && (
                    <Text style={styles.cardCount}>{count} {count === 1 ? title.slice(0, -1) : title}</Text> // Very rough singularization
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
    );

    if (!user) {
        return (
            <LinearGradient colors={["#2094F3", "#0B7DDA"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            </LinearGradient>
        );
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
                                <Text style={styles.greeting}>Welcome back,</Text>
                                <Text style={styles.username}>{user.username}</Text>
                            </View>
                            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                                <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <View style={styles.contentArea}>
                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCounts(); }} />}
                                showsVerticalScrollIndicator={false}
                            >
                                <Text style={styles.sectionTitle}>Overview</Text>

                                <View style={styles.grid}>
                                    <DashboardCard
                                        title="Sites"
                                        count={counts.sites}
                                        icon="business"
                                        color="#2094F3"
                                        route="GlobalSites"
                                    />
                                    <DashboardCard
                                        title="Warehouses"
                                        count={counts.warehouses}
                                        icon="storefront"
                                        color="#E69138"
                                        route="GlobalWarehouses"
                                    />
                                    <DashboardCard
                                        title="Staff"
                                        count={counts.staff}
                                        icon="people"
                                        color="#10B981"
                                        route="GlobalStaff"
                                    />
                                    <DashboardCard
                                        title="Supervisors"
                                        count={counts.supervisors}
                                        icon="briefcase"
                                        color="#6610f2"
                                        route="GlobalSupervisors"
                                    />
                                </View>

                                <Text style={styles.sectionTitle}>Communication & Logs</Text>
                                <View style={styles.grid}>
                                    <DashboardCard
                                        title="Messages"
                                        // count={5} // Placeholder
                                        icon="chatbubbles"
                                        color="#F59E0B" // Amber
                                        route="AdminMessages"
                                    />
                                    <DashboardCard
                                        title="Activity Log"
                                        // count={null}
                                        icon="list"
                                        color="#607D8B" // Blue Grey
                                        route="ActivityLogs"
                                    />
                                </View>

                            </ScrollView>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 30 },
    greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
    username: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
    logoutButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    contentArea: { flex: 1, backgroundColor: '#F3F4F6', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 20 },
    scrollContent: { paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15, marginTop: 10 },
    grid: { gap: 15 },

    // Card Styles
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: 4
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
    cardCount: { fontSize: 13, color: '#6B7280' },
});

export default AdminDashboard;