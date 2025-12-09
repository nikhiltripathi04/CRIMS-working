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
    RefreshControl,
    Alert,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

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

    const DashboardCard = ({ title, count, subtitle, onPress, route, iconName, iconColor, iconBgColor }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress || (() => navigation.navigate(route))}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                <View style={[styles.iconContainer, { backgroundColor: iconBgColor || '#F0F8FF' }]}>
                    <Ionicons name={iconName} size={24} color={iconColor || '#007ADC'} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    {/* Simplified subtitle to just show count if available, or subtitle otherwise, prevents redundancy like "Sites 5 Sites" */}
                    <Text style={styles.cardSubtitle}>
                        {count !== undefined ? count : subtitle}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (!user) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#007ADC' }]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#007ADC" />

            {/* Header Section */}
            <View style={styles.headerBackground}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.welcomeText}>Welcome back,</Text>
                            <Text style={styles.headerTitle}>{user.username}</Text>
                        </View>
                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {/* Main Content Section */}
            <View style={styles.contentContainer}>
                <View style={styles.gridContainer}>
                    {/* Overview Section */}
                    <Text style={styles.sectionTitle}>Overview</Text>

                    <View style={styles.row}>
                        <DashboardCard
                            title="Sites"
                            count={counts.sites}
                            route="GlobalSites"
                            iconName="business"
                            iconColor="#007ADC"
                            iconBgColor="#E6F2FF"
                        />
                        <DashboardCard
                            title="Warehouses"
                            count={counts.warehouses}
                            route="GlobalWarehouses"
                            onPress={() => Alert.alert("Coming Soon", "This feature is currently under development.")}
                            iconName="cube"
                            iconColor="#FF9500"
                            iconBgColor="#FFF5E6"
                        />
                    </View>

                    <View style={styles.row}>
                        <DashboardCard
                            title="Staff"
                            count={counts.staff}
                            route="GlobalStaff"
                            iconName="people"
                            iconColor="#AF52DE"
                            iconBgColor="#F6E6FF"
                        />
                        <DashboardCard
                            title="Supervisors"
                            count={counts.supervisors}
                            route="GlobalSupervisors"
                            iconName="person-circle"
                            iconColor="#34C759"
                            iconBgColor="#E6F9E9"
                        />
                    </View>

                    {/* Communication & Logs Section */}
                    <Text style={styles.sectionTitle}>Communication & Logs</Text>

                    <View style={styles.row}>
                        <DashboardCard
                            title="Messages"
                            subtitle="View"
                            route="AdminMessages"
                            iconName="chatbubbles"
                            iconColor="#FF2D55"
                            iconBgColor="#FFE6EA"
                        />
                        <DashboardCard
                            title="Activity"
                            subtitle="View"
                            route="ActivityLogs"
                            iconName="time"
                            iconColor="#5856D6"
                            iconBgColor="#EFEEFA"
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#007ADC', // Primary Blue matches test.js
    },
    headerBackground: {
        height: height * 0.22, // Occupies top part of screen matches test.js
        backgroundColor: '#007ADC',
        paddingHorizontal: 24,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTextContainer: {
        alignItems: 'flex-start',
    },
    welcomeText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
    },
    logoutButton: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#F2F4F8', // Very light lavender/grey matches test.js
        borderTopLeftRadius: 30, // Large rounded corners matches test.js
        borderTopRightRadius: 30,
        marginTop: -30, // Negative margin to overlap matches test.js
        overflow: 'hidden',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#F2F4F8',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        overflow: 'hidden',
    },
    gridContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        marginBottom: 12,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 16,
        width: '48%',
        // Soft Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardContent: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 0,
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
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
    },
});

export default AdminDashboard;