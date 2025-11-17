import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    StatusBar,
    SafeAreaView,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const SupplyRequestStatusScreen = ({ route, navigation }) => {
    const { site } = route.params;
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const { API_BASE_URL, user } = useAuth();

    useEffect(() => {
        fetchSupplyRequests();
    }, []);

    const fetchSupplyRequests = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}/supply-requests?supervisorId=${user.id}`);
            if (response.data.success) {
                setRequests(response.data.data);
            }
        } catch (error) {
            console.error('Fetch supply requests error:', error);
            // Mock data for demonstration
            setRequests([
                {
                    _id: '1',
                    itemName: 'Cement',
                    requestedQuantity: 50,
                    unit: 'bags',
                    status: 'pending',
                    warehouseId: { warehouseName: 'Main Warehouse' },
                    createdAt: new Date().toISOString(),
                },
                {
                    _id: '2',
                    itemName: 'Steel Rods',
                    requestedQuantity: 100,
                    unit: 'pcs',
                    status: 'approved',
                    transferredQuantity: 100,
                    warehouseId: { warehouseName: 'Storage Facility B' },
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    handledAt: new Date().toISOString(),
                },
                {
                    _id: '3',
                    itemName: 'Paint',
                    requestedQuantity: 20,
                    unit: 'liters',
                    status: 'rejected',
                    reason: 'Item not available',
                    warehouseId: { warehouseName: 'Main Warehouse' },
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    handledAt: new Date(Date.now() - 86400000).toISOString(),
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#ffc107';
            case 'approved': return '#28a745';
            case 'rejected': return '#dc3545';
            default: return '#6c757d';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return 'time-outline';
            case 'approved': return 'checkmark-circle-outline';
            case 'rejected': return 'close-circle-outline';
            default: return 'help-circle-outline';
        }
    };

    const renderRequestItem = ({ item }) => (
        <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Ionicons name={getStatusIcon(item.status)} size={16} color="#fff" />
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.requestDetails}>
                <Text style={styles.detailText}>
                    Requested: {item.requestedQuantity} {item.unit}
                </Text>
                {item.transferredQuantity && (
                    <Text style={styles.detailText}>
                        Transferred: {item.transferredQuantity} {item.unit}
                    </Text>
                )}
                <Text style={styles.detailText}>
                    From: {item.warehouseId?.warehouseName || 'Unknown Warehouse'}
                </Text>
                <Text style={styles.dateText}>
                    Requested: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                {item.handledAt && (
                    <Text style={styles.dateText}>
                        {item.status === 'approved' ? 'Approved' : 'Rejected'}: {new Date(item.handledAt).toLocaleDateString()}
                    </Text>
                )}
            </View>

            {item.status === 'rejected' && item.reason && (
                <View style={styles.reasonContainer}>
                    <Text style={styles.reasonLabel}>Reason:</Text>
                    <Text style={styles.reasonText}>{item.reason}</Text>
                </View>
            )}
        </View>
    );

    const getStatusCounts = () => {
        const counts = { pending: 0, approved: 0, rejected: 0 };
        requests.forEach(request => {
            counts[request.status] = (counts[request.status] || 0) + 1;
        });
        return counts;
    };

    const statusCounts = getStatusCounts();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={isIpad ? 28 : 24} color="#FFFFFF" />
                        </TouchableOpacity>
                        
                        <View style={styles.headerContent}>
                            <Text style={styles.title}>Supply Requests</Text>
                            <Text style={styles.subtitle}>
                                {requests.length} total requests
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => navigation.navigate('CreateSupplyRequest', { site })}
                        >
                            <Ionicons name="add" size={isIpad ? 28 : 24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.contentArea}>
                        {/* Status Summary */}
                        <View style={styles.statusSummary}>
                            <View style={[styles.summaryCard, { borderLeftColor: '#ffc107' }]}>
                                <Text style={styles.summaryNumber}>{statusCounts.pending}</Text>
                                <Text style={styles.summaryLabel}>Pending</Text>
                            </View>
                            <View style={[styles.summaryCard, { borderLeftColor: '#28a745' }]}>
                                <Text style={styles.summaryNumber}>{statusCounts.approved}</Text>
                                <Text style={styles.summaryLabel}>Approved</Text>
                            </View>
                            <View style={[styles.summaryCard, { borderLeftColor: '#dc3545' }]}>
                                <Text style={styles.summaryNumber}>{statusCounts.rejected}</Text>
                                <Text style={styles.summaryLabel}>Rejected</Text>
                            </View>
                        </View>

                        <FlatList
                            data={requests}
                            renderItem={renderRequestItem}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.listContainer}
                            refreshControl={
                                <RefreshControl
                                    refreshing={loading}
                                    onRefresh={fetchSupplyRequests}
                                    colors={["#2094F3"]}
                                    tintColor="#2094F3"
                                />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Ionicons name="paper-plane-outline" size={isIpad ? 80 : 64} color="#9CA3AF" />
                                    <Text style={styles.emptyText}>No supply requests yet</Text>
                                    <Text style={styles.emptySubtext}>Tap the + button to create your first request</Text>
                                </View>
                            }
                        />
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: screenWidth * 0.05,
        paddingTop: screenHeight * 0.02,
        paddingBottom: screenHeight * 0.03,
    },
    backButton: {
        marginRight: screenWidth * 0.04,
        padding: screenWidth * 0.02,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: isIpad ? screenWidth * 0.035 : screenWidth * 0.055,
        fontWeight: 'bold',
        marginBottom: screenHeight * 0.005,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        fontWeight: '400',
    },
    addButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 25,
        padding: screenWidth * 0.02,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: screenWidth * 0.08,
        borderTopRightRadius: screenWidth * 0.08,
        paddingTop: screenHeight * 0.02,
    },
    statusSummary: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: screenWidth * 0.05,
        marginBottom: screenHeight * 0.02,
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 4,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryNumber: {
        fontSize: isIpad ? 24 : 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        textAlign: 'center',
    },
    listContainer: {
        paddingHorizontal: screenWidth * 0.05,
        paddingBottom: screenHeight * 0.05,
    },
    requestCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
        marginBottom: 12,
    },
    itemName: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontSize: isIpad ? 12 : 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    requestDetails: {
        marginBottom: 8,
    },
    detailText: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        marginBottom: 4,
    },
    dateText: {
        fontSize: isIpad ? 12 : 10,
        color: '#999',
        marginBottom: 2,
    },
    reasonContainer: {
        backgroundColor: '#fff5f5',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#dc3545',
    },
    reasonLabel: {
        fontSize: isIpad ? 14 : 12,
        fontWeight: 'bold',
        color: '#dc3545',
        marginBottom: 4,
    },
    reasonText: {
        fontSize: isIpad ? 14 : 12,
        color: '#721c24',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: screenWidth * 0.1,
        marginTop: screenHeight * 0.12,
    },
    emptyText: {
        fontSize: isIpad ? screenWidth * 0.028 : screenWidth * 0.045,
        color: '#666',
        marginTop: screenHeight * 0.025,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        color: '#888',
        marginTop: screenHeight * 0.012,
        textAlign: 'center',
    },
});

export default SupplyRequestStatusScreen;