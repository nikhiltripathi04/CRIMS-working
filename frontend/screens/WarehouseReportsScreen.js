import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    SafeAreaView,
    RefreshControl,
    FlatList,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const WarehouseReportsScreen = ({ route, navigation }) => {
    const { warehouse, managerId } = route.params;
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState({
        totalSupplies: 0,
        totalValue: 0,
        totalTransfers: 0,
        recentTransfers: [],
        supplySummary: [],
        monthlyTransfers: []
    });
    const [currencyUnit, setCurrencyUnit] = useState('₹');
    const { API_BASE_URL, user } = useAuth();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${API_BASE_URL}/api/warehouses/${warehouse._id}/reports?managerId=${managerId}`
            );

            if (response.data.success) {
                setReports(response.data.data);
            }
        } catch (error) {
            console.error('Fetch reports error:', error);
            // For now, use mock data
            setReports({
                totalSupplies: warehouse.supplies?.length || 0,
                totalValue: warehouse.supplies?.reduce((sum, s) => sum + (s.quantity * (s.currentPrice || s.entryPrice || 0)), 0) || 0,
                totalTransfers: 15,
                recentTransfers: [
                    {
                        id: 1,
                        itemName: 'Cement',
                        quantity: 50,
                        unit: 'bags',
                        transferredTo: 'Construction Site A',
                        date: new Date().toISOString(),
                        value: 2500
                    },
                    {
                        id: 2,
                        itemName: 'Steel Rods',
                        quantity: 100,
                        unit: 'pcs',
                        transferredTo: 'Building Project B',
                        date: new Date(Date.now() - 86400000).toISOString(),
                        value: 5000
                    }
                ],
                supplySummary: warehouse.supplies || [],
                monthlyTransfers: [
                    { month: 'Jan', transfers: 12, value: 15000 },
                    { month: 'Feb', transfers: 18, value: 22000 },
                    { month: 'Mar', transfers: 15, value: 18500 }
                ]
            });
        } finally {
            setLoading(false);
        }
    };

    const renderRecentTransfer = ({ item }) => (
        <View style={styles.transferCard}>
            <View style={styles.transferHeader}>
                <Text style={styles.transferItem}>{item.itemName}</Text>
                <Text style={styles.transferValue}>{currencyUnit}{item.value}</Text>
            </View>
            <Text style={styles.transferDetails}>
                {item.quantity} {item.unit} → {item.transferredTo}
            </Text>
            <Text style={styles.transferDate}>
                {new Date(item.date).toLocaleDateString()}
            </Text>
        </View>
    );

    const renderSupplySummary = ({ item }) => (
        <View style={styles.supplyRow}>
            <Text style={styles.supplyName}>{item.itemName}</Text>
            <Text style={styles.supplyQuantity}>{item.quantity} {item.unit}</Text>
            <Text style={styles.supplyValue}>
                {currencyUnit}{((item.currentPrice || item.entryPrice || 0) * item.quantity).toFixed(2)}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#E69138" />
            <LinearGradient
                colors={["#E69138", "#D48806"]}
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
                            <Text style={styles.title}>Warehouse Reports</Text>
                            <Text style={styles.subtitle}>{warehouse.warehouseName}</Text>
                        </View>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        refreshControl={
                            <RefreshControl
                                refreshing={loading}
                                onRefresh={fetchReports}
                                colors={["#E69138"]}
                                tintColor="#E69138"
                            />
                        }
                    >
                        {/* Stats Cards */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <Ionicons name="cube-outline" size={isIpad ? 40 : 32} color="#E69138" />
                                <Text style={styles.statNumber}>{reports.totalSupplies}</Text>
                                <Text style={styles.statLabel}>Total Supplies</Text>
                            </View>

                            <View style={styles.statCard}>
                                <Ionicons name="cash-outline" size={isIpad ? 40 : 32} color="#28a745" />
                                <Text style={styles.statNumber}>{currencyUnit}{reports.totalValue.toFixed(2)}</Text>
                                <Text style={styles.statLabel}>Total Value</Text>
                            </View>

                            <View style={styles.statCard}>
                                <Ionicons name="swap-horizontal-outline" size={isIpad ? 40 : 32} color="#1976D2" />
                                <Text style={styles.statNumber}>{reports.totalTransfers}</Text>
                                <Text style={styles.statLabel}>Total Transfers</Text>
                            </View>
                        </View>

                        {/* Recent Transfers */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Recent Transfers</Text>
                            <FlatList
                                data={reports.recentTransfers}
                                renderItem={renderRecentTransfer}
                                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.transfersList}
                            />
                        </View>

                        {/* Supply Summary */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Supply Summary</Text>
                            <View style={styles.summaryTable}>
                                <View style={styles.tableHeader}>
                                    <Text style={styles.headerText}>Item</Text>
                                    <Text style={styles.headerText}>Quantity</Text>
                                    <Text style={styles.headerText}>Value</Text>
                                </View>
                                <FlatList
                                    data={reports.supplySummary}
                                    renderItem={renderSupplySummary}
                                    keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                                    scrollEnabled={false}
                                />
                            </View>
                        </View>

                        {/* Monthly Transfer Chart */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Monthly Transfer Trend</Text>
                            <View style={styles.chartContainer}>
                                {reports.monthlyTransfers.map((month, index) => (
                                    <View key={index} style={styles.chartBar}>
                                        <View style={[styles.bar, { height: (month.transfers / 20) * 100 }]} />
                                        <Text style={styles.chartLabel}>{month.month}</Text>
                                        <Text style={styles.chartValue}>{month.transfers}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
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
        marginTop: 60,
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
    scrollView: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: screenWidth * 0.08,
        borderTopRightRadius: screenWidth * 0.08,
        paddingTop: screenHeight * 0.02,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: screenWidth * 0.05,
        marginBottom: screenHeight * 0.03,
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
    section: {
        marginBottom: screenHeight * 0.03,
        paddingHorizontal: screenWidth * 0.05,
    },
    sectionTitle: {
        fontSize: isIpad ? 22 : 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: screenHeight * 0.015,
    },
    transfersList: {
        paddingVertical: 10,
    },
    transferCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginRight: 12,
        width: screenWidth * 0.7,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    transferHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    transferItem: {
        fontSize: isIpad ? 16 : 14,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    transferValue: {
        fontSize: isIpad ? 16 : 14,
        fontWeight: 'bold',
        color: '#28a745',
    },
    transferDetails: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        marginBottom: 4,
    },
    transferDate: {
        fontSize: isIpad ? 12 : 10,
        color: '#999',
    },
    summaryTable: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    headerText: {
        flex: 1,
        fontSize: isIpad ? 14 : 12,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    supplyRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    supplyName: {
        flex: 1,
        fontSize: isIpad ? 14 : 12,
        color: '#333',
        textAlign: 'center',
    },
    supplyQuantity: {
        flex: 1,
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        textAlign: 'center',
    },
    supplyValue: {
        flex: 1,
        fontSize: isIpad ? 14 : 12,
        color: '#28a745',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    chartContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    chartBar: {
        alignItems: 'center',
    },
    bar: {
        width: 30,
        backgroundColor: '#E69138',
        borderRadius: 4,
        marginBottom: 8,
    },
    chartLabel: {
        fontSize: isIpad ? 12 : 10,
        color: '#666',
        marginBottom: 4,
    },
    chartValue: {
        fontSize: isIpad ? 14 : 12,
        fontWeight: 'bold',
        color: '#333',
    },
});

export default WarehouseReportsScreen;