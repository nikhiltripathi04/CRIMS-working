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

const GlobalWarehousesScreen = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigation = useNavigation();
    const { user, API_BASE_URL } = useAuth();

    const fetchWarehouses = useCallback(async () => {
        if (!user || !user.id) {
            setLoading(false);
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
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, API_BASE_URL]);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWarehouses();
    };

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

    const filteredWarehouses = warehouses.filter(w =>
        w.warehouseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.location?.toLowerCase().includes(searchQuery.toLowerCase())
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
                            <Text style={styles.title}>All Warehouses</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={styles.contentArea}>
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search warehouses..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#9CA3AF"
                                    clearButtonMode="while-editing"
                                />
                            </View>

                            <FlatList
                                data={filteredWarehouses}
                                keyExtractor={(item) => item._id}
                                renderItem={renderWarehouseCard}
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                contentContainerStyle={styles.listContainer}
                                ListEmptyComponent={() => (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="storefront-outline" size={64} color="#ccc" />
                                        <Text style={styles.emptyText}>No warehouses found</Text>
                                    </View>
                                )}
                            />

                            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('CreateWarehouse')}>
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

    warehouseCard: { backgroundColor: '#FEF8F0', borderRadius: 16, marginBottom: 16, elevation: 4, minHeight: 120, position: 'relative' },
    warehouseCardContent: { flex: 1, padding: 16 },
    siteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    siteMainInfo: { flex: 1 },
    siteName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    siteLocation: { fontSize: 14, color: '#666' },
    siteStats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, backgroundColor: '#fff', borderRadius: 8, marginTop: 10 },
    statItem: { alignItems: 'center', flex: 1 },
    statText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 4, marginBottom: 2 },
    statLabel: { fontSize: 12, color: '#666' },
    warehousedeleteButton: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255, 0, 0, 0.08)', padding: 8, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { color: '#888', marginTop: 10 },
    addButton: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#2094F3', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 8 },
});

export default GlobalWarehousesScreen;
