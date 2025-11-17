import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Platform,
    Dimensions,
    StatusBar,
    SafeAreaView,
    Modal,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const WarehouseDetailsScreen = ({ route }) => {
    const { warehouse: initialWarehouse } = route.params;
    const [warehouse, setWarehouse] = useState(initialWarehouse);
    const [loading, setLoading] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [logFilter, setLogFilter] = useState('all');
    const [currencyUnit, setCurrencyUnit] = useState('₹');
    const { API_BASE_URL, user } = useAuth();
    const navigation = useNavigation();

    useEffect(() => {
        loadCurrencyPreference();
        if (user && user.id) {
            fetchWarehouseDetails();
        }
    }, [user]);

    const loadCurrencyPreference = async () => {
        try {
            const savedCurrency = await AsyncStorage.getItem('supplyCurrency');
            if (savedCurrency) {
                setCurrencyUnit(savedCurrency);
            }
        } catch (error) {
            console.log('Error loading currency preference:', error);
        }
    };

    const fetchWarehouseDetails = async () => {
        if (!user || !user.id) {
            console.log('User not available, skipping fetchWarehouseDetails');
            return;
        }

        try {
            setLoading(true);
            console.log(`Fetching warehouse details for warehouse ${warehouse._id}`);
            console.log('User role:', user.role, 'User ID:', user.id);

            // Pass userId in query parameters
            const url = `${API_BASE_URL}/api/warehouses/${warehouse._id}?userId=${user.id}`;

            console.log('Request URL:', url);

            const response = await axios.get(url);
            console.log('Warehouse details response:', response.data);

            if (response.data.success) {
                setWarehouse(response.data.data);

                if (response.data.data.activityLogs) {
                    // Sort logs by timestamp in descending order (newest first)
                    const sortedLogs = [...response.data.data.activityLogs].sort((a, b) =>
                        new Date(b.timestamp) - new Date(a.timestamp)
                    );
                    setActivityLogs(sortedLogs.slice(0, 10));
                }
            } else {
                Alert.alert('Error', 'Failed to fetch warehouse details');
            }
        } catch (error) {
            console.error('Fetch warehouse details error:', error);
            console.error('Error response:', error.response?.data);
            Alert.alert('Error', 'Failed to fetch warehouse details');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllLogs = async (filter = 'all') => {
        if (!user || !user.id) {
            console.log('User not available, skipping fetchAllLogs');
            return;
        }

        try {
            setLoading(true);
            // Filter from existing logs since we don't have a dedicated endpoint yet
            let filteredLogs = warehouse.activityLogs?.filter(log =>
                filter === 'all' || log.action === filter
            ) || [];

            // Sort filtered logs by timestamp in descending order (newest first)
            filteredLogs = [...filteredLogs].sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            );

            setActivityLogs(filteredLogs);
            setLogFilter(filter);
        } catch (error) {
            console.error('Fetch logs error:', error);
            let filteredLogs = warehouse.activityLogs?.filter(log =>
                filter === 'all' || log.action === filter
            ) || [];

            // Sort even in error case
            filteredLogs = [...filteredLogs].sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            );

            setActivityLogs(filteredLogs);
            setLogFilter(filter);
        } finally {
            setLoading(false);
        }
    };

    const getSuppliesStats = () => {
        if (!warehouse || !warehouse.supplies) return { items: 0, totalValue: 0 };

        const totalValue = warehouse.supplies
            .filter(supply => supply.entryPrice) // Only count priced items
            .reduce((sum, supply) => {
                const price = parseFloat(supply.entryPrice) || 0;
                const quantity = parseFloat(supply.quantity) || 0;
                return sum + (price * quantity);
            }, 0);

        return {
            items: warehouse.supplies.length,
            totalValue: isNaN(totalValue) ? 0 : totalValue
        };
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    const getLogIcon = (action) => {
        switch (action) {
            case 'supply_added':
                return { name: 'add-circle', color: '#28a745' };
            case 'supply_updated':
                return { name: 'create', color: '#ffc107' };
            case 'supply_deleted':
                return { name: 'trash', color: '#dc3545' };
            case 'manager_added':
                return { name: 'person-add', color: '#28a745' };
            case 'manager_updated':
                return { name: 'person', color: '#ffc107' };
            case 'manager_password_reset':
                return { name: 'key', color: '#17a2b8' };
            case 'warehouse_created':
                return { name: 'storefront', color: '#007bff' };
            case 'warehouse_updated':
                return { name: 'create', color: '#ffc107' };
            default:
                return { name: 'information-circle', color: '#6c757d' };
        }
    };

    const renderActivityLogItem = ({ item }) => {
        const iconInfo = getLogIcon(item.action);

        return (
            <View style={styles.logItemModal}>
                <View style={[styles.logIconContainerModal, { backgroundColor: iconInfo.color }]}>
                    <Ionicons
                        name={iconInfo.name}
                        size={18}
                        color="#fff"
                    />
                </View>
                <View style={styles.logContentModal}>
                    <Text style={styles.logDescriptionModal}>{item.description}</Text>
                    <Text style={styles.logTimestampModal}>
                        {formatTimestamp(item.timestamp)} • {item.performedByName}
                    </Text>
                </View>
            </View>
        );
    };

    const renderLogFilterButtons = () => {
        const filters = [
            { key: 'all', label: 'All', icon: 'list' },
            { key: 'supply_added', label: 'Supplies Added', icon: 'add-circle' },
            { key: 'supply_updated', label: 'Supplies Updated', icon: 'create' },
            { key: 'supply_deleted', label: 'Supplies Deleted', icon: 'trash' },
            { key: 'manager_added', label: 'Manager Added', icon: 'person-add' },
            { key: 'manager_password_reset', label: 'Password Reset', icon: 'key' },
        ];

        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContainerContent}
            >
                {filters.map((filter) => (
                    <TouchableOpacity
                        key={filter.key}
                        style={[
                            styles.filterButtonModal,
                            logFilter === filter.key && styles.filterButtonActiveModal
                        ]}
                        onPress={() => fetchAllLogs(filter.key)}
                    >
                        <Ionicons
                            name={filter.icon}
                            size={16}
                            color={logFilter === filter.key ? '#fff' : '#007bff'}
                            style={{ marginRight: 5 }}
                        />
                        <Text style={[
                            styles.filterTextModal,
                            logFilter === filter.key && styles.filterTextActiveModal
                        ]}>
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    const renderLogsModal = () => (
        <Modal
            visible={showLogsModal}
            animationType="slide"
            transparent={false}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Activity Logs</Text>
                    <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowLogsModal(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {renderLogFilterButtons()}

                <FlatList
                    data={activityLogs}
                    renderItem={renderActivityLogItem}
                    keyExtractor={(item, index) => item._id || index.toString()}
                    style={styles.logsList}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={() => fetchAllLogs(logFilter)}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyLogsContainer}>
                            <Ionicons name="document-text-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyLogsText}>No activity logs found</Text>
                        </View>
                    }
                />
            </View>
        </Modal>
    );

    const renderSuppliesCard = () => {
        const suppliesStats = getSuppliesStats();

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Supplies</Text>
                <View style={styles.cardContent}>
                    {warehouse.supplies && warehouse.supplies.length > 0 ? (
                        <>
                            {warehouse.supplies.slice(0, 3).map((supply, index) => (
                                <View key={index} style={[
                                    styles.listItem,
                                    index === warehouse.supplies.slice(0, 3).length - 1 && { borderBottomWidth: 0 }
                                ]}>
                                    <Text style={styles.itemName}>{supply.itemName}</Text>
                                    <Text style={styles.itemDetails}>
                                        Qty: {supply.quantity} {supply.unit} | Price: {supply.entryPrice ? `${supply.currency || currencyUnit}${supply.entryPrice}` : 'Pending'}
                                    </Text>
                                </View>
                            ))}
                        </>
                    ) : (
                        <Text style={styles.emptyText}>No supplies added yet</Text>
                    )}

                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('WarehouseSupplies', {
                            warehouse,
                            canEdit: user.role === 'warehouse_manager' && user.warehouseId?.toString() === warehouse._id?.toString(),
                            currencyUnit: currencyUnit
                        })}
                    >
                        <Text style={styles.viewAllText}>
                            {user.role === 'warehouse_manager' ? 'Manage Supplies' : 'View Supplies'}
                        </Text>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderManagerCard = () => {
        if (user.role !== 'admin') return null;

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Warehouse Manager{warehouse.managers?.length > 1 ? 's' : ''}</Text>
                <View style={styles.cardContent}>
                    {warehouse.managers && warehouse.managers.length > 0 ? (
                        <>
                            {warehouse.managers.map((mgr, index) => (
                                <View key={mgr._id || index} style={[
                                    styles.listItem,
                                    index === warehouse.managers.length - 1 && { borderBottomWidth: 0 }
                                ]}>
                                    <Text style={styles.itemName}>{mgr.username || 'Manager'}</Text>
                                    <Text style={styles.itemDetails}>Warehouse Manager</Text>
                                </View>
                            ))}
                        </>
                    ) : (
                        <Text style={styles.emptyText}>No manager assigned</Text>
                    )}

                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('ManageWarehouseManagers', {
                            warehouse,
                            adminId: user.id
                        })}
                    >
                        <Text style={styles.viewAllText}>Manage Warehouse Managers</Text>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderActivityLogsCard = () => {
        // Ensure logs are sorted when displaying in the card
        const sortedLogs = [...activityLogs].sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Recent Activity</Text>
                <View style={styles.cardContent}>
                    {sortedLogs && sortedLogs.length > 0 ? (
                        <>
                            {sortedLogs.slice(0, 3).map((log, index) => (
                                <View key={index} style={[
                                    styles.logItem,
                                    index === sortedLogs.slice(0, 3).length - 1 && { borderBottomWidth: 0 }
                                ]}>
                                    <View style={styles.logIconContainer}>
                                        <Ionicons
                                            name={getLogIcon(log.action).name}
                                            size={16}
                                            color={getLogIcon(log.action).color}
                                        />
                                    </View>
                                    <View style={styles.logContent}>
                                        <Text style={styles.logDescription} numberOfLines={2}>
                                            {log.description}
                                        </Text>
                                        <Text style={styles.logTimestamp}>
                                            {formatTimestamp(log.timestamp)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    ) : (
                        <Text style={styles.emptyText}>No activity logged yet</Text>
                    )}

                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => {
                            fetchAllLogs('all');
                            setShowLogsModal(true);
                        }}
                    >
                        <Text style={styles.viewAllText}>
                            View All Activity ({warehouse.activityLogs?.length || 0} total)
                        </Text>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderStatsContainer = () => {
        const suppliesStats = getSuppliesStats();
        const totalValue = suppliesStats.totalValue || 0;

        // Count managers from the array
        const managerCount = warehouse.managers?.length || 0;

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Ionicons name="cube-outline" size={isIpad ? 40 : 32} color="#E69138" />
                    <Text style={styles.statNumber}>{suppliesStats.items}</Text>
                    <Text style={styles.statLabel}>Supply Items</Text>
                </View>

                <View style={styles.statCard}>
                    <Ionicons name="cash-outline" size={isIpad ? 40 : 32} color="#28a745" />
                    <Text style={styles.statNumber}>{currencyUnit}{totalValue.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Total Inventory Value</Text>
                </View>

                <View style={styles.statCard}>
                    <Ionicons name="person-outline" size={isIpad ? 40 : 32} color="#795548" />
                    <Text style={styles.statNumber}>{managerCount}</Text>
                    <Text style={styles.statLabel}>Manager{managerCount !== 1 ? 's' : ''}</Text>
                </View>
            </View>
        );
    };

    // Show a loading indicator if user isn't available yet
    if (!user) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#E69138" />
                <Text style={{ marginTop: 20, color: '#E69138', fontSize: 16 }}>Loading user data...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#E69138" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={isIpad ? 28 : 24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Warehouse Details</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={fetchWarehouseDetails}
                        colors={['#E69138']}
                        tintColor="#E69138"
                    />
                }
            >
                {/* Warehouse Info Card */}
                <View style={styles.welcomeContainer}>
                    <View style={styles.siteInfoCard}>
                        <Text style={styles.siteName}>{warehouse.warehouseName}</Text>
                        <Text style={styles.siteLocation}>
                            📍 {warehouse.location}
                        </Text>
                    </View>
                </View>

                {/* Stats Cards */}
                {renderStatsContainer()}

                {/* Main Content Cards */}
                {renderSuppliesCard()}
                {renderManagerCard()}
                {renderActivityLogsCard()}

                {/* Modals */}
                {renderLogsModal()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#E69138',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
    },
    container: {
        flex: 1,
        backgroundColor: '#E69138',
    },
    header: {
        backgroundColor: '#E69138',
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1
    },
    title: {
        fontSize: isIpad ? 28 : 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    backButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 25,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        marginRight: 15,
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#E69138',
    },
    welcomeContainer: {
        padding: 20,
        backgroundColor: '#E69138',
        marginBottom: 20,
    },
    siteInfoCard: {
        backgroundColor: '#FFFFFF',
        padding: isIpad ? 24 : 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    siteName: {
        fontSize: isIpad ? 22 : 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    siteLocation: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        marginBottom: 10,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        padding: isIpad ? 20 : 16,
        borderRadius: 15,
        alignItems: 'center',
        width: (screenWidth - 80) / 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statNumber: {
        fontSize: isIpad ? 20 : 14,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
        marginBottom: 4,
        textAlign: 'center',
        numberOfLines: 1,
    },
    statLabel: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        margin: 20,
        marginTop: 0,
        marginBottom: 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden'
    },
    cardTitle: {
        fontSize: isIpad ? 20 : 18,
        fontWeight: 'bold',
        color: '#333',
        padding: isIpad ? 24 : 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    cardContent: {
        padding: isIpad ? 20 : 16,
        paddingTop: 10
    },
    listItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    itemName: {
        fontSize: isIpad ? 16 : 15,
        fontWeight: '500',
        color: '#000',
        marginBottom: 4
    },
    itemDetails: {
        fontSize: isIpad ? 14 : 13,
        color: '#666',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        marginTop: 10
    },
    viewAllText: {
        color: '#007bff',
        fontSize: isIpad ? 16 : 14,
        fontWeight: '500'
    },
    emptyText: {
        fontSize: isIpad ? 16 : 14,
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 20,
    },
    // Activity Logs Styles
    logItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    logIconContainer: {
        marginRight: 12,
        marginTop: 2
    },
    logContent: {
        flex: 1
    },
    logDescription: {
        fontSize: isIpad ? 15 : 13,
        color: '#333',
        lineHeight: isIpad ? 22 : 20
    },
    logTimestamp: {
        fontSize: isIpad ? 13 : 11,
        color: '#888',
        marginTop: 4
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isIpad ? 24 : 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingTop: Platform.OS === 'ios' ? (isIpad ? 36 : 50) : 20
    },
    modalTitle: {
        fontSize: isIpad ? 22 : 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeModalButton: {
        padding: 8,
    },
    filterContainer: {
        backgroundColor: '#f5f5f5',
        paddingVertical: isIpad ? 16 : 12,
        maxHeight: isIpad ? 80 : 70,
    },
    filterContainerContent: {
        paddingHorizontal: isIpad ? 16 : 12,
    },
    filterButtonModal: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: isIpad ? 18 : 15,
        paddingVertical: isIpad ? 10 : 8,
        marginRight: isIpad ? 12 : 8,
        borderRadius: 30,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterButtonActiveModal: {
        backgroundColor: '#E69138',
        borderColor: '#E69138',
    },
    filterTextModal: {
        fontSize: isIpad ? 15 : 13,
        color: '#333',
        fontWeight: '500',
    },
    filterTextActiveModal: {
        color: '#fff',
    },
    // Log Item Styles
    logItemModal: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: isIpad ? 16 : 12,
        paddingHorizontal: isIpad ? 20 : 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    logIconContainerModal: {
        width: isIpad ? 36 : 32,
        height: isIpad ? 36 : 32,
        borderRadius: isIpad ? 18 : 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: isIpad ? 16 : 12,
        marginTop: 2,
    },
    logContentModal: {
        flex: 1,
    },
    logDescriptionModal: {
        fontSize: isIpad ? 16 : 14,
        color: '#333',
        lineHeight: isIpad ? 22 : 20,
        marginBottom: 4,
    },
    logTimestampModal: {
        fontSize: isIpad ? 14 : 12,
        color: '#888',
    },
    // List Styles
    logsList: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 1
    },
    emptyLogsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 100
    },
    emptyLogsText: {
        fontSize: isIpad ? 18 : 16,
        color: '#888',
        marginTop: 15,
        textAlign: 'center'
    },
});

export default WarehouseDetailsScreen;