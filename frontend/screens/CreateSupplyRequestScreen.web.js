import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    FlatList,
    Modal,
    Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

// --- Web Conversions ---
// 1. Removed platform-specific imports: StatusBar, SafeAreaView, Dimensions, Platform.
// 2. Replaced Alert with window.alert for web compatibility.
// 3. Replaced TouchableOpacity with Pressable for the modal overlay for better web interaction.
// 4. Added useNavigation for a standard web navigation hook.
// 5. Simplified styling by removing dynamic sizing based on Dimensions.

const CreateSupplyRequestScreen = ({ route }) => {
    const navigation = useNavigation(); // Added for web navigation
    const { site } = route.params;
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [availableSupplies, setAvailableSupplies] = useState([]);
    const [selectedSupply, setSelectedSupply] = useState(null);
    const [supplyModalVisible, setSupplyModalVisible] = useState(false);
    const [requestedQuantity, setRequestedQuantity] = useState('');
    const [loading, setLoading] = useState(false);
    const [suppliesLoading, setSuppliesLoading] = useState(false);
    const { API_BASE_URL, user } = useAuth();

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/warehouses/for-requests?userId=${user.id}`);
            if (response.data.success) {
                setWarehouses(response.data.data);
            } else {
                window.alert('Error: ' + (response.data.message || 'Failed to load warehouses'));
                setWarehouses([]);
            }
        } catch (error) {
            let errorMessage = 'Unable to load warehouses. ';
            if (error.response?.status === 403) {
                errorMessage += 'You do not have permission to view warehouses.';
            } else if (error.response?.status === 500) {
                errorMessage += 'Server error occurred.';
            } else if (error.response?.data?.message) {
                errorMessage += error.response.data.message;
            } else {
                errorMessage += 'Please check your connection and try again.';
            }
            window.alert('Error: ' + errorMessage);
            setWarehouses([]);
        }
    };

    const fetchWarehouseSupplies = async (warehouseId) => {
        setSuppliesLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/warehouses/${warehouseId}?userId=${user.id}`);
            if (response.data.success && response.data.data) {
                const supplies = response.data.data.supplies || [];
                setAvailableSupplies(supplies);
            } else {
                setAvailableSupplies([]);
            }
        } catch (error) {
            console.error('Error fetching warehouse supplies:', error);
            setAvailableSupplies([]);
        } finally {
            setSuppliesLoading(false);
        }
    };

    const selectWarehouse = (warehouse) => {
        if (!warehouse.supplies || warehouse.supplies.length === 0) {
            window.alert('No Supplies Available: This warehouse currently has no supplies available for request.');
            return;
        }

        setSelectedWarehouse(warehouse);
        setSelectedSupply(null);
        setRequestedQuantity('');
        setAvailableSupplies(warehouse.supplies || []);
    };

    const selectSupply = (supply) => {
        setSelectedSupply(supply);
        setSupplyModalVisible(false);
        setRequestedQuantity('');
    };

    const createSupplyRequest = async () => {
        if (!selectedWarehouse || !selectedSupply || !requestedQuantity) {
            window.alert('Error: Please fill in all fields');
            return;
        }
        if (parseFloat(requestedQuantity) <= 0) {
            window.alert('Error: Quantity must be greater than 0');
            return;
        }
        if (parseFloat(requestedQuantity) > selectedSupply.quantity) {
            window.alert(`Error: Only ${selectedSupply.quantity} ${selectedSupply.unit} available in warehouse`);
            return;
        }
        try {
            setLoading(true);
            const response = await axios.post(
                `${API_BASE_URL}/api/sites/${site._id}/supply-requests?supervisorId=${user.id}`,
                {
                    warehouseId: selectedWarehouse._id,
                    itemName: selectedSupply.itemName,
                    requestedQuantity: parseFloat(requestedQuantity),
                    unit: selectedSupply.unit
                }
            );

            if (response.data.success) {
                window.alert('Success: Supply request created successfully');
                navigation.goBack();
            }
        } catch (error) {
            window.alert('Error: Failed to create supply request');
        } finally {
            setLoading(false);
        }
    };

    const renderWarehouseItem = ({ item }) => {
        const isSelected = selectedWarehouse?._id === item._id;
        const hasSupplies = item.supplies && item.supplies.length > 0;

        return (
            <TouchableOpacity
                style={[
                    styles.warehouseCard,
                    isSelected && styles.warehouseCardSelected,
                    !hasSupplies && styles.warehouseCardDisabled
                ]}
                onPress={() => hasSupplies ? selectWarehouse(item) : null}
                activeOpacity={hasSupplies ? 0.85 : 1}
                disabled={!hasSupplies}
            >
                <View style={styles.radioContainer}>
                    <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={24}
                        color={!hasSupplies ? '#ccc' : isSelected ? '#2094F3' : '#ccc'}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, !hasSupplies && styles.disabledText]}>
                        {item.warehouseName}
                    </Text>
                    <Text style={[styles.cardSubtitle, !hasSupplies && styles.disabledText]}>
                        {item.location}
                    </Text>
                    <Text style={[
                        styles.cardSubtitle,
                        !hasSupplies && styles.noSuppliesText
                    ]}>
                        {item.supplies?.length || 0} supplies available
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSupplyItem = ({ item }) => (
        <TouchableOpacity
            style={styles.listItem}
            onPress={() => selectSupply(item)}
            disabled={item.quantity <= 0}
        >
            <View style={styles.supplyItemContent}>
                <Text style={[styles.listItemTitle, item.quantity <= 0 && styles.disabledText]}>
                    {item.itemName}
                </Text>
                <Text style={[styles.listItemSubtitle, item.quantity <= 0 && styles.disabledText]}>
                    Available: {item.quantity} {item.unit}
                </Text>
            </View>
            {item.quantity <= 0 && <Text style={styles.outOfStockText}>Out of Stock</Text>}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.headerContent}>
                            <Text style={styles.title}>Request Supplies</Text>
                            <Text style={styles.subtitle}>From Warehouse</Text>
                        </View>
                    </View>
                    <ScrollView style={styles.scrollView}>
                        <View style={styles.form}>
                            <Text style={styles.label}>Choose a Warehouse *</Text>
                            <FlatList
                                data={warehouses}
                                renderItem={renderWarehouseItem}
                                keyExtractor={item => item._id}
                                ListEmptyComponent={
                                    <Text style={{ marginVertical: 20, color: '#888', textAlign: 'center' }}>
                                        No warehouses found
                                    </Text>
                                }
                                ListHeaderComponent={
                                    warehouses.length > 0 && !warehouses.some(w => w.supplies?.length > 0) ? (
                                        <View style={styles.warningContainer}>
                                            <Ionicons name="information-circle" size={20} color="#ff4444" />
                                            <Text style={styles.warningText}>
                                                There are currently no warehouses with available supplies to request from
                                            </Text>
                                        </View>
                                    ) : null
                                }
                            />
                            {selectedWarehouse && (
                                <>
                                    <Text style={styles.label}>Select Supply Item *</Text>
                                    <TouchableOpacity
                                        style={styles.selector}
                                        onPress={() => !suppliesLoading && setSupplyModalVisible(true)}
                                        disabled={suppliesLoading}
                                    >
                                        <Text style={[styles.selectorText, !selectedSupply && styles.placeholderText]}>
                                            {suppliesLoading ? 'Loading supplies...' :
                                                selectedSupply ? selectedSupply.itemName : 'Choose supply item'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color="#666" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {selectedSupply && (
                                <>
                                    <Text style={styles.label}>Requested Quantity *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={`Enter quantity (${selectedSupply.unit})`}
                                        value={requestedQuantity}
                                        onChangeText={setRequestedQuantity}
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.availableText}>
                                        Available: {selectedSupply.quantity} {selectedSupply.unit}
                                    </Text>
                                </>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (!selectedWarehouse || !selectedSupply || !requestedQuantity) && styles.disabledButton
                                ]}
                                onPress={createSupplyRequest}
                                disabled={!selectedWarehouse || !selectedSupply || !requestedQuantity || loading}
                            >
                                <Text style={styles.submitButtonText}>
                                    {loading ? 'Creating Request...' : 'Create Supply Request'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    <Modal
                        visible={supplyModalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setSupplyModalVisible(false)}
                    >
                        <Pressable style={styles.modalOverlay} onPress={() => setSupplyModalVisible(false)}>
                            <Pressable style={styles.modalContent} onPress={() => {}}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Select Supply Item</Text>
                                    <TouchableOpacity onPress={() => setSupplyModalVisible(false)}>
                                        <Ionicons name="close" size={24} color="#333" />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={availableSupplies}
                                    renderItem={renderSupplyItem}
                                    keyExtractor={(item) => item._id}
                                    style={styles.modalList}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <Text style={styles.emptyText}>No supplies available in this warehouse</Text>
                                        </View>
                                    }
                                />
                            </Pressable>
                        </Pressable>
                    </Modal>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    warehouseCardDisabled: {
        opacity: 0.6,
        backgroundColor: '#f8f8f8',
        cursor: 'not-allowed',
    },
    noSuppliesText: {
        color: '#ff4444',
        fontWeight: '500',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f5',
        padding: 12,
        marginHorizontal: 10,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffcccc',
    },
    warningText: {
        color: '#ff4444',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    container: { 
        height: '100vh', // Ensure it fills the viewport on web
    },
    gradient: { flex: 1 },
    safeArea: { 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: '5%',
        paddingTop: 40,
        paddingBottom: 30,
        flexShrink: 0,
    },
    backButton: {
        marginRight: 15,
        padding: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        cursor: 'pointer',
    },
    headerContent: { flex: 1 },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        fontWeight: '400',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflowY: 'auto', // Web scroll
    },
    form: { 
        padding: '5%',
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        marginTop: 20,
    },
    warehouseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FAFAFA',
        borderRadius: 14,
        marginVertical: 8,
        marginHorizontal: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        borderWidth: 1,
        borderColor: '#eee',
        cursor: 'pointer',
    },
    warehouseCardSelected: {
        borderColor: '#2094F3',
        backgroundColor: '#E5F1FB',
    },
    radioContainer: {
        marginRight: 16,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#666',
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
    },
    selectorText: {
        fontSize: 16,
        color: '#333',
    },
    placeholderText: { color: '#999' },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        fontSize: 16,
        color: '#333',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        outlineStyle: 'none', // Web-specific
    },
    availableText: {
        fontSize: 14,
        color: '#28a745',
        marginTop: 8,
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: '#2094F3',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 30,
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        cursor: 'pointer',
    },
    disabledButton: { 
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed', // Web-specific
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: '95%',
        maxWidth: 400,
        maxHeight: '80vh',
        minHeight: 200,
        alignSelf: 'center',
        padding: 0,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalList: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        overflowY: 'auto',
    },
    listItem: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        cursor: 'pointer',
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    listItemSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    supplyItemContent: { flex: 1 },
    disabledText: { color: '#ccc' },
    outOfStockText: {
        fontSize: 12,
        color: '#ff4444',
        fontWeight: 'bold',
        marginTop: 4,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
});

export default CreateSupplyRequestScreen;