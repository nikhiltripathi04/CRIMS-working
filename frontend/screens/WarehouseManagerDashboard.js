import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    Dimensions,
    Modal,
    TextInput,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const WarehouseManagerDashboard = ({ navigation }) => {
    const { user, logout, API_BASE_URL } = useAuth();
    const [warehouse, setWarehouse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
    const [showSupplyRequestsModal, setShowSupplyRequestsModal] = useState(false);
    const [supplyRequests, setSupplyRequests] = useState([]);
    const [currencyUnit, setCurrencyUnit] = useState('₹');

    // Add Supply Form State
    const [newSupply, setNewSupply] = useState({
        itemName: '',
        quantity: '',
        unit: '',
        entryPrice: '',
        currency: '₹'
    });

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setWarehouse(null);
                            await logout();
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Failed to logout');
                        }
                    }
                }
            ]
        );
    };

    const loadCurrencyPreference = async () => {
        try {
            const savedCurrency = await AsyncStorage.getItem('supplyCurrency');
            if (savedCurrency) {
                setCurrencyUnit(savedCurrency);
                setNewSupply(prev => ({ ...prev, currency: savedCurrency }));
            }
        } catch (error) {
            console.log('Error loading currency preference:', error);
        }
    };

    const fetchWarehouseData = async () => {
        if (user?.warehouseId) {
            try {
                setLoading(true);
                const warehouseId = user.warehouseId._id || user.warehouseId;

                // Fetch warehouse details
                const response = await axios.get(
                    `${API_BASE_URL}/api/warehouses/${warehouseId}?userId=${user.id}`
                );

                if (response.data.success) {
                    setWarehouse(response.data.data);
                }

                // Fetch supply requests from sites
                await fetchSupplyRequests();
            } catch (error) {
                console.error('Fetch warehouse details error:', error);
                Alert.alert('Error', 'Failed to fetch warehouse details');
            } finally {
                setLoading(false);
            }
        }
    };

    const fetchSupplyRequests = async () => {
        try {
            const warehouseId = user.warehouseId._id || user.warehouseId;
            const managerId = user.id;

            console.log('Fetching supply requests with:', {
                warehouseId,
                managerId,
                userRole: user.role
            });

            // Use the correct endpoint path
            const response = await axios.get(
                `${API_BASE_URL}/api/warehouses/supply-requests?warehouseId=${warehouseId}&managerId=${managerId}`
            );

            console.log('Supply requests response:', response.data);

            if (response.data.success) {
                setSupplyRequests(response.data.data || []);
            }
        } catch (error) {
            console.error('Fetch supply requests error:', error);
            console.error('Error response:', error.response?.data);

            // Set empty array to prevent UI issues
            setSupplyRequests([]);

            // Only show alert if it's not a 404
            if (error.response?.status !== 404) {
                Alert.alert('Error', `Failed to fetch supply requests: ${error.response?.data?.message || error.message}`);
            }
        }
    };

    const addSupply = async () => {
        if (!newSupply.itemName || !newSupply.quantity || !newSupply.unit || !newSupply.entryPrice) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            setLoading(true);
            const warehouseId = user.warehouseId._id || user.warehouseId;

            const response = await axios.post(
                `${API_BASE_URL}/api/warehouses/${warehouseId}/supplies`,
                {
                    ...newSupply,
                    quantity: parseFloat(newSupply.quantity),
                    entryPrice: parseFloat(newSupply.entryPrice),
                    userId: user.id
                }
            );

            if (response.data.success) {
                Alert.alert('Success', 'Supply added successfully');
                setNewSupply({
                    itemName: '',
                    quantity: '',
                    unit: '',
                    entryPrice: '',
                    currency: currencyUnit
                });
                setShowAddSupplyModal(false);
                fetchWarehouseData();
            }
        } catch (error) {
            console.error('Add supply error:', error);
            Alert.alert('Error', 'Failed to add supply');
        } finally {
            setLoading(false);
        }
    };

    const handleSupplyRequest = async (requestId, action, transferQuantity) => {
        console.log('=== handleSupplyRequest called ===');
        console.log('requestId:', requestId);
        console.log('action:', action);
        console.log('transferQuantity:', transferQuantity);
        console.log('user.id:', user.id);

        try {
            setLoading(true);

            const requestData = {
                managerId: user.id,
                transferQuantity: transferQuantity,
            };

            console.log('Request URL:', `${API_BASE_URL}/api/warehouses/supply-requests/${requestId}/${action}`);
            console.log('Request Data:', requestData);

            // Use the correct endpoint structure
            const response = await axios.post(
                `${API_BASE_URL}/api/warehouses/supply-requests/${requestId}/${action}`,
                requestData
            );

            console.log('Response:', response.data);

            if (response.data.success) {
                Alert.alert('Success', response.data.message || `Supply request ${action}d successfully`);
                fetchSupplyRequests();
                fetchWarehouseData();
            } else {
                Alert.alert('Error', response.data.message || `Failed to ${action} supply request`);
            }
        } catch (error) {
            console.error('handleSupplyRequest error:', error);
            console.error('Error response:', error.response?.data);

            const errorMessage = error.response?.data?.message || error.message || `Failed to ${action} supply request`;
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            await loadCurrencyPreference();
            if (user?.warehouseId && mounted) {
                await fetchWarehouseData();
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [user]);

    const getSuppliesStats = () => {
        if (!warehouse || !warehouse.supplies) return { items: 0, totalValue: 0 };

        const totalValue = warehouse.supplies.reduce((sum, supply) => {
            const price = parseFloat(supply.entryPrice) || 0;
            const quantity = parseFloat(supply.quantity) || 0;
            return sum + (price * quantity);
        }, 0);

        return {
            items: warehouse.supplies.length,
            totalValue: isNaN(totalValue) ? 0 : totalValue
        };
    };

    const renderAddSupplyModal = () => (
        <Modal
            visible={showAddSupplyModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowAddSupplyModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add New Supply</Text>
                        <TouchableOpacity
                            onPress={() => setShowAddSupplyModal(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Item Name *</Text>
                            <TextInput
                                style={styles.textInput}
                                value={newSupply.itemName}
                                onChangeText={(text) => setNewSupply(prev => ({ ...prev, itemName: text }))}
                                placeholder="Enter item name"
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.inputLabel}>Quantity *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={newSupply.quantity}
                                    onChangeText={(text) => setNewSupply(prev => ({ ...prev, quantity: text }))}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                                <Text style={styles.inputLabel}>Unit *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={newSupply.unit}
                                    onChangeText={(text) => setNewSupply(prev => ({ ...prev, unit: text }))}
                                    placeholder="kg, pcs, etc."
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.inputLabel}>Entry Price *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={newSupply.entryPrice}
                                    onChangeText={(text) => setNewSupply(prev => ({ ...prev, entryPrice: text }))}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={[styles.inputGroup, { flex: 0.6, marginLeft: 10 }]}>
                                <Text style={styles.inputLabel}>Currency</Text>
                                <View style={styles.currencyDisplay}>
                                    <Text style={styles.currencyText}>{currencyUnit}</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={addSupply}
                            disabled={loading}
                        >
                            <Text style={styles.addButtonText}>
                                {loading ? 'Adding...' : 'Add Supply'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderSupplyRequest = ({ item }) => (
        <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
                <Text style={styles.requestSite}>{item.siteName}</Text>
                <Text style={styles.requestDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>

            <Text style={styles.requestItem}>{item.itemName}</Text>
            <Text style={styles.requestQuantity}>Requested: {item.requestedQuantity} {item.unit}</Text>

            {item.status === 'pending' && (
                <View style={styles.requestActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => {
                            console.log('=== Approve button pressed ===');
                            console.log('Item:', item);

                            const requestedQty = item.requestedQuantity;
                            const unit = item.unit;

                            Alert.alert(
                                'Approve Transfer',
                                `Transfer ${item.itemName} to ${item.siteName}?\n\nRequested: ${requestedQty} ${unit}`,
                                [
                                    {
                                        text: 'Cancel',
                                        style: 'cancel',
                                        onPress: () => console.log('Transfer cancelled')
                                    },
                                    {
                                        text: `Transfer Full Amount (${requestedQty} ${unit})`,
                                        onPress: () => {
                                            console.log('=== Full transfer approved ===');
                                            console.log('Transferring quantity:', requestedQty);
                                            handleSupplyRequest(item._id, 'approve', requestedQty);
                                        }
                                    },
                                    // Add partial transfer option if quantity > 1
                                    ...(requestedQty > 1 ? [{
                                        text: `Transfer Half (${Math.floor(requestedQty / 2)} ${unit})`,
                                        onPress: () => {
                                            const halfQty = Math.floor(requestedQty / 2);
                                            console.log('=== Half transfer approved ===');
                                            console.log('Transferring quantity:', halfQty);
                                            handleSupplyRequest(item._id, 'approve', halfQty);
                                        }
                                    }] : [])
                                ]
                            );
                        }}
                    >
                        <Text style={styles.actionButtonText}>Approve & Transfer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleSupplyRequest(item._id, 'reject', 0)}
                    >
                        <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}

            {item.status !== 'pending' && (
                <View style={[styles.statusBadge,
                item.status === 'approved' ? styles.approvedBadge : styles.rejectedBadge
                ]}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
            )}
        </View>
    );

    const renderSupplyRequestsModal = () => (
        <Modal
            visible={showSupplyRequestsModal}
            animationType="slide"
            transparent={false}
        >
            <View style={styles.fullModalContainer}>
                <View style={styles.fullModalHeader}>
                    <Text style={styles.fullModalTitle}>Supply Requests</Text>
                    <TouchableOpacity
                        onPress={() => setShowSupplyRequestsModal(false)}
                        style={styles.closeButton}
                    >
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={supplyRequests}
                    renderItem={renderSupplyRequest}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.requestsList}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={fetchSupplyRequests} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyRequestsContainer}>
                            <Ionicons name="document-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyRequestsText}>No supply requests</Text>
                            <Text style={styles.emptyRequestsSubtext}>
                                Site supervisors can request supplies from your warehouse
                            </Text>
                        </View>
                    }
                />
            </View>
        </Modal>
    );

    // Move the user check here, after all hooks are declared
    if (!user) {
        return null;
    }

    if (!warehouse) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>Warehouse Manager</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={isIpad ? 28 : 24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading warehouse details...</Text>
                </View>
            </View>
        );
    }

    const suppliesStats = getSuppliesStats();
    const pendingRequests = supplyRequests.filter(req => req.status === 'pending').length;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Warehouse Manager</Text>
                    <Text style={styles.subtitle}>{warehouse.warehouseName}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={isIpad ? 28 : 24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchWarehouseData} />
                }
            >
                <View style={styles.welcomeContainer}>
                    <View style={styles.warehouseInfoCard}>
                        <Text style={styles.warehouseName}>{warehouse.warehouseName}</Text>
                        <Text style={styles.warehouseLocation}>📍 {warehouse.location}</Text>
                    </View>
                </View>

                {/* Stats Container */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Ionicons name="cube-outline" size={isIpad ? 40 : 32} color="#E69138" />
                        <Text style={styles.statNumber}>{suppliesStats.items}</Text>
                        <Text style={styles.statLabel}>Supply Items</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Ionicons name="cash-outline" size={isIpad ? 40 : 32} color="#28a745" />
                        <Text style={styles.statNumber}>{currencyUnit}{suppliesStats.totalValue.toFixed(2)}</Text>
                        <Text style={styles.statLabel}>Inventory Value</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Ionicons name="paper-plane-outline" size={isIpad ? 40 : 32} color="#dc3545" />
                        <Text style={styles.statNumber}>{pendingRequests}</Text>
                        <Text style={styles.statLabel}>Pending Requests</Text>
                    </View>
                </View>

                <View style={styles.actionsContainer}>
                    {/* <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => setShowAddSupplyModal(true)}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="add-circle-outline" size={isIpad ? 28 : 24} color="#28a745" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Add Supply</Text>
                            <Text style={styles.actionSubtitle}>Add new items to warehouse inventory</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
                    </TouchableOpacity> */}

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('WarehouseSupplies', {
                            warehouse,
                            canEdit: true,
                            currencyUnit
                        })}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="cube-outline" size={isIpad ? 28 : 24} color="#E69138" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Manage Inventory</Text>
                            <Text style={styles.actionSubtitle}>View and edit warehouse inventory</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('WarehouseReports', {
                            warehouse,
                            managerId: user.id
                        })}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="bar-chart-outline" size={isIpad ? 28 : 24} color="#6f42c1" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Reports & Analytics</Text>
                            <Text style={styles.actionSubtitle}>View inventory reports and transfer history</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => setShowSupplyRequestsModal(true)}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="paper-plane-outline" size={isIpad ? 28 : 24} color="#007bff" />
                            {pendingRequests > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{pendingRequests}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Supply Requests</Text>
                            <Text style={styles.actionSubtitle}>
                                Handle supply requests from site supervisors
                                {pendingRequests > 0 && ` (${pendingRequests} pending)`}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
                    </TouchableOpacity>

                    {/* <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => navigation.navigate('WarehouseReports', {
                            warehouse,
                            managerId: user.id
                        })}
                    >
                        <View style={styles.actionIcon}>
                            <Ionicons name="bar-chart-outline" size={isIpad ? 28 : 24} color="#6f42c1" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Reports & Analytics</Text>
                            <Text style={styles.actionSubtitle}>View inventory reports and transfer history</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
                    </TouchableOpacity> */}
                </View>
            </ScrollView>

            {/* Modals */}
            {renderAddSupplyModal()}
            {renderSupplyRequestsModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E69138',
    },
    header: {
        backgroundColor: '#E69138',
        paddingTop: 60,
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
    subtitle: {
        fontSize: isIpad ? 16 : 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    logoutButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 25,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        fontSize: isIpad ? 18 : 16,
        color: '#666'
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
    warehouseInfoCard: {
        backgroundColor: '#FFFFFF',
        padding: isIpad ? 24 : 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    warehouseName: {
        fontSize: isIpad ? 22 : 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    warehouseLocation: {
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
        fontSize: isIpad ? 18 : 14,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
        marginBottom: 4,
        textAlign: 'center',
    },
    statLabel: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
    },
    actionsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    actionCard: {
        backgroundColor: '#FFFFFF',
        padding: isIpad ? 24 : 20,
        marginBottom: 15,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionIcon: {
        marginRight: 16,
        position: 'relative',
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    actionSubtitle: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        lineHeight: 20,
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#ff4444',
        borderRadius: 12,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: isIpad ? 12 : 10,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: isIpad ? '80%' : '90%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: isIpad ? 22 : 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    modalBody: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: isIpad ? 16 : 12,
        fontSize: isIpad ? 16 : 14,
        backgroundColor: '#f9f9f9',
        color: '#333',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    currencyDisplay: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: isIpad ? 16 : 12,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    currencyText: {
        fontSize: isIpad ? 16 : 14,
        fontWeight: 'bold',
        color: '#E69138',
    },
    addButton: {
        backgroundColor: '#E69138',
        borderRadius: 10,
        padding: isIpad ? 18 : 15,
        alignItems: 'center',
        marginTop: 20,
    },
    addButtonText: {
        color: '#fff',
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
    },
    // Full Modal Styles
    fullModalContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    fullModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: isIpad ? 60 : 50,
    },
    fullModalTitle: {
        fontSize: isIpad ? 24 : 20,
        fontWeight: 'bold',
        color: '#333',
    },
    requestsList: {
        padding: 20,
    },
    requestCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    requestSite: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
        color: '#333',
    },
    requestDate: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
    },
    requestItem: {
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
        color: '#E69138',
        marginBottom: 5,
    },
    requestQuantity: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        marginBottom: 15,
    },
    requestActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    approveButton: {
        backgroundColor: '#28a745',
    },
    rejectButton: {
        backgroundColor: '#dc3545',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: isIpad ? 16 : 14,
        fontWeight: 'bold',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    approvedBadge: {
        backgroundColor: '#d4edda',
    },
    rejectedBadge: {
        backgroundColor: '#f8d7da',
    },
    statusText: {
        fontSize: isIpad ? 12 : 10,
        fontWeight: 'bold',
        color: '#333',
    },
    emptyRequestsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyRequestsText: {
        fontSize: isIpad ? 20 : 18,
        color: '#999',
        marginTop: 20,
        textAlign: 'center',
    },
    emptyRequestsSubtext: {
        fontSize: isIpad ? 16 : 14,
        color: '#bbb',
        marginTop: 10,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});

export default WarehouseManagerDashboard;