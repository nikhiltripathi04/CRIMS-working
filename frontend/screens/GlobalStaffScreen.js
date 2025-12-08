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

const GlobalStaffScreen = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation();
    const { user, API_BASE_URL, token } = useAuth();

    const fetchStaff = useCallback(async () => {
        if (!user || !user.id) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_BASE_URL}/api/staff`, config);
            if (response.data.success) {
                setStaff(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching staff:', error);
            // Alert.alert('Error', 'Failed to fetch staff');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, API_BASE_URL, token]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStaff();
    };

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

    const filteredStaff = staff.filter(s =>
        s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                            <Text style={styles.title}>All Staff</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={styles.contentArea}>
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search staff..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#9CA3AF"
                                    clearButtonMode="while-editing"
                                />
                            </View>

                            <FlatList
                                data={filteredStaff}
                                keyExtractor={(item) => item._id}
                                renderItem={renderStaffCard}
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                contentContainerStyle={styles.listContainer}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={64} color="#ccc" />
                                        <Text style={styles.emptyText}>No staff found</Text>
                                    </View>
                                )}
                            />

                            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateStaff')}>
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

    staffCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, elevation: 2, position: 'relative' },
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

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { color: '#888', marginTop: 10 },
    addButton: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#2094F3', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
});

export default GlobalStaffScreen;
