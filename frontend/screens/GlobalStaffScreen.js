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
import { useSocket } from '../context/SocketContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const GlobalStaffScreen = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation();
    const { user, API_BASE_URL, token } = useAuth();
    const socket = useSocket();

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

    useEffect(() => {
        if (socket) {
            socket.on('staff:updated', (data) => {
                console.log('Received staff update:', data);
                fetchStaff();
            });

            return () => {
                socket.off('staff:updated');
            };
        }
    }, [socket, fetchStaff]);

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
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{item.role || 'Staff'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.staffDetails}>
                    <View style={styles.detailItem}>
                        <Ionicons name="call-outline" size={14} color="#666" style={{ marginRight: 4 }} />
                        <Text style={styles.detailText}>{item.phone || 'No Phone'}</Text>
                    </View>
                    {item.siteName && (
                        <View style={styles.detailItem}>
                            <Ionicons name="business-outline" size={14} color="#666" style={{ marginRight: 4 }} />
                            <Text style={styles.detailText}>{item.siteName}</Text>
                        </View>
                    )}
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
            <StatusBar barStyle="light-content" backgroundColor="#AF52DE" />

            {/* Header Section */}
            <View style={styles.headerWrapper}>
                <ImageBackground
                    // source={{ uri: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop' }}
                    style={styles.headerBackground}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['#AF52DE99', '#AF52DE99']}
                        style={styles.headerGradient}
                    >
                        <SafeAreaView style={styles.safeArea}>
                            <View style={styles.headerContent}>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <Ionicons name="arrow-back" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>All Staff</Text>
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
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={64} color="#ccc" />
                                <Text style={styles.emptyText}>No staff found</Text>
                            </View>
                        )}
                    />
                </View>

                <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateStaff')}>
                    <Ionicons name="add" size={isIpad ? 40 : 28} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#AF52DE',
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

    // Staff Card
    staffCard: {
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
    staffContent: {
        padding: 20,
    },
    staffHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    staffAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3E5F5', // Light Purple
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#E1BEE7'
    },
    staffAvatarText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#AF52DE'
    },
    staffInfo: {
        flex: 1,
    },
    staffName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2
    },
    staffUsername: {
        fontSize: 14,
        color: '#888',
        marginBottom: 6
    },
    roleBadge: {
        backgroundColor: '#F3E5F5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start'
    },
    roleText: {
        fontSize: 11,
        color: '#AF52DE',
        fontWeight: '700',
        textTransform: 'uppercase'
    },
    staffDetails: {
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
    staffDeleteButton: {
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
        backgroundColor: '#AF52DE', // Purple
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#AF52DE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
});

export default GlobalStaffScreen;
