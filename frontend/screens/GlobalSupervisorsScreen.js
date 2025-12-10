import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    FlatList,
    TextInput,
    Platform,
    Dimensions,
    StatusBar,
    SafeAreaView,
    ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const GlobalSupervisorsScreen = () => {
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation();
    const { user, API_BASE_URL, token } = useAuth();

    const fetchSupervisors = useCallback(async () => {
        if (!user || !user.id) return;
        try {
            // Note: API endpoint consistency check
            const response = await axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`);
            if (response.data.success) {
                setSupervisors(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching supervisors:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, API_BASE_URL]);

    useEffect(() => {
        fetchSupervisors();
    }, [fetchSupervisors]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSupervisors();
    };

    const deleteSupervisor = useCallback(async (supervisorId) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to remove this supervisor?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    // Placeholder for delete logic. 
                    // If backend supports DELETE /api/auth/supervisors/:id, implement here.
                    // For now, we will just show an alert as this feature might be sensitive.
                    Alert.alert('Info', 'To delete a supervisor, please contact system administrator or use the web dashboard.');
                }
            }
        ]);
    }, []);

    const renderSupervisorCard = ({ item }) => (
        <View style={styles.supervisorCard}>
            <TouchableOpacity
                style={styles.supervisorContent}
                onPress={() => navigation.navigate('SupervisorDetail', { supervisor: item })}
            >
                <View style={styles.supervisorHeader}>
                    <View style={styles.supervisorAvatar}>
                        <Text style={styles.supervisorAvatarText}>
                            {item.username ? item.username.charAt(0).toUpperCase() : 'S'}
                        </Text>
                    </View>
                    <View style={styles.supervisorInfo}>
                        <Text style={styles.supervisorName}>{item.fullName || item.username}</Text>
                        <Text style={styles.supervisorUsername}>@{item.username}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>Supervisor</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.supervisorDetails}>
                    <View style={styles.detailItem}>
                        <Ionicons name="location-outline" size={14} color="#666" style={{ marginRight: 4 }} />
                        <Text style={styles.detailText}>
                            {item.assignedSites?.length === 1
                                ? (item.assignedSites[0]?.siteName || '1 Site Assigned')
                                : `${item.assignedSites?.length || 0} Sites Assigned`}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supervisorDeleteButton} onPress={() => deleteSupervisor(item._id)}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </TouchableOpacity>
        </View>
    );

    const filteredSupervisors = supervisors.filter(s =>
        s.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.fullName && s.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

            {/* Header Section */}
            <View style={styles.headerWrapper}>
                <ImageBackground
                    style={styles.headerBackground}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['#4CAF50CC', '#2E7D32CC']} // Green Gradient
                        style={styles.headerGradient}
                    >
                        <SafeAreaView style={styles.safeArea}>
                            <View style={styles.headerContent}>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <Ionicons name="arrow-back" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>All Supervisors</Text>
                                <View style={{ width: 40 }} />
                            </View>
                        </SafeAreaView>
                    </LinearGradient>
                </ImageBackground>
            </View>

            {/* Content Area */}
            <View style={styles.contentContainer}>
                <View style={styles.mainContainer}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search supervisors..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#9CA3AF"
                            clearButtonMode="while-editing"
                        />
                    </View>

                    <FlatList
                        data={filteredSupervisors}
                        keyExtractor={(item) => item._id}
                        renderItem={renderSupervisorCard}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={64} color="#ccc" />
                                <Text style={styles.emptyText}>No supervisors found</Text>
                            </View>
                        )}
                    />
                </View>

                {/* FAB to create new supervisor */}
                <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateSupervisor')}>
                    <Ionicons name="add" size={isIpad ? 40 : 28} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#4CAF50',
    },
    headerWrapper: {
        height: screenHeight * 0.22,
        width: '100%',
    },
    headerBackground: {
        flex: 1,
        width: '100%',
    },
    headerGradient: {
        flex: 1,
        justifyContent: 'center',
    },
    safeArea: {
        flex: 1,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },

    // Content Area
    contentContainer: {
        flex: 1,
        backgroundColor: '#F2F4F8',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        overflow: 'hidden',
    },
    mainContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
        width: isIpad ? '85%' : '100%',
        alignSelf: 'center',
    },
    listContainer: {
        paddingBottom: 100
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 20,
        height: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    searchIcon: { marginRight: 12 },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },

    // Card Styles
    supervisorCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        position: 'relative',
        overflow: 'hidden',
    },
    supervisorContent: {
        padding: 20,
    },
    supervisorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    supervisorAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E8F5E9', // Light Green
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#C8E6C9'
    },
    supervisorAvatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4CAF50'
    },
    supervisorInfo: {
        flex: 1,
    },
    supervisorName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2
    },
    supervisorUsername: {
        fontSize: 14,
        color: '#888',
        marginBottom: 6
    },
    roleBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    roleText: {
        fontSize: 11,
        color: '#4CAF50',
        fontWeight: '700',
        textTransform: 'uppercase'
    },
    supervisorDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        flexWrap: 'wrap',
        gap: 16
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 13,
        color: '#666'
    },
    supervisorDeleteButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: '#FFF0F0',
        padding: 10,
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFE6E6'
    },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { color: '#888', marginTop: 16, fontSize: 16 },

    addButton: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: '#4CAF50',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});

export default GlobalSupervisorsScreen;
