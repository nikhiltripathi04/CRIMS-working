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
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const GlobalSupervisorsScreen = () => {
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation();
    const { user, API_BASE_URL } = useAuth();

    const fetchSupervisors = useCallback(async () => {
        if (!user || !user.id) return;
        try {
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

    // Note: Deleting a Global Supervisor usually requires more complex logic (removing from sites etc),
    // but here we can just show the card and let them navigate to details.
    // If we want to delete, we should probably check if they are assigned to sites.
    // For now, I'll align with the AdminDashboard logic which didn't strictly have a global delete but redirected to Manage.
    // However, the user wants listing. Global listing usually implies management too.

    const renderSupervisorCard = ({ item }) => (
        <View style={styles.supervisorCard}>
            <TouchableOpacity
                style={styles.supervisorContent}
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

    const filteredSupervisors = supervisors.filter(s =>
        s.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient colors={["#2094F3", "#0B7DDA"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.title}>All Supervisors</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={styles.contentArea}>
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
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="briefcase-outline" size={64} color="#ccc" />
                                        <Text style={styles.emptyText}>No supervisors found</Text>
                                    </View>
                                )}
                            />

                            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateSupervisor')}>
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

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, marginBottom: 20, height: 48, elevation: 2 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, color: '#1f2937' },

    supervisorCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#6610f2', padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    supervisorContent: { flex: 1 },
    supervisorHeader: { flexDirection: 'row', alignItems: 'center' },
    supervisorIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3e5f5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    supervisorInfo: { flex: 1 },
    supervisorName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    supervisorSites: { fontSize: 12, color: '#666', marginTop: 2 },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { color: '#888', marginTop: 10 },
    addButton: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#2094F3', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
});

export default GlobalSupervisorsScreen;
