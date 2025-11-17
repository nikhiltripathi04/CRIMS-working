import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    FlatList,
    StatusBar,
    SafeAreaView,
    Dimensions,
    Platform, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const CreateSupplyRequestScreen = ({ route, navigation }) => {
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
            console.log("Warehouses initial fetch:", response.data.data); // Move inside try block

            if (response.data.success) {
                setWarehouses(response.data.data);
                // Remove the alert - we'll show the message differently
            } else {
                Alert.alert('Error', response.data.message || 'Failed to load warehouses');
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
            Alert.alert('Error', errorMessage);
            setWarehouses([]);
        }
    };

    const fetchWarehouseSupplies = async (warehouseId) => {
        setSuppliesLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/warehouses/${warehouseId}?userId=${user.id}`);
            console.log(`Warehouse ${warehouseId} detail fetch:`, response.data);

            if (response.data.success && response.data.data) {
                const supplies = response.data.data.supplies || [];
                console.log('Supplies found:', supplies);
                setAvailableSupplies(supplies);
            } else {
                console.log('No supplies in response');
                setAvailableSupplies([]);
            }
        } catch (error) {
            console.error('Error fetching warehouse supplies:', error);
            setAvailableSupplies([]);
        } finally {
            setSuppliesLoading(false);
        }
    };

    // Update the supply selector to show loading state
    {
        selectedWarehouse && (
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
        )
    }

    const selectWarehouse = (warehouse) => {
        // Check if warehouse has supplies
        if (!warehouse.supplies || warehouse.supplies.length === 0) {
            Alert.alert(
                'No Supplies Available',
                'This warehouse currently has no supplies available for request.'
            );
            return;
        }

        setSelectedWarehouse(warehouse);
        setSelectedSupply(null);
        setRequestedQuantity('');
        setAvailableSupplies(warehouse.supplies || []);
        console.log("Selected warehouse supplies:", warehouse.supplies);
    };

    const selectSupply = (supply) => {
        setSelectedSupply(supply);
        setSupplyModalVisible(false);
        setRequestedQuantity('');
    };

    const createSupplyRequest = async () => {
        if (!selectedWarehouse || !selectedSupply || !requestedQuantity) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (parseFloat(requestedQuantity) <= 0) {
            Alert.alert('Error', 'Quantity must be greater than 0');
            return;
        }
        if (parseFloat(requestedQuantity) > selectedSupply.quantity) {
            Alert.alert('Error', `Only ${selectedSupply.quantity} ${selectedSupply.unit} available in warehouse`);
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
                Alert.alert('Success', 'Supply request created successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create supply request');
        } finally {
            setLoading(false);
        }
    };

    // -- CARD+RADIO ITEM for warehouse selection
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

    // Card dropdown for supplies (show as dropdown, or as a modal if you want)
    // We'll keep it as a dropdown for this sample. 
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
                            <Text style={styles.title}>Request Supplies</Text>
                            <Text style={styles.subtitle}>From Warehouse</Text>
                        </View>
                    </View>
                    <ScrollView style={styles.scrollView}>
                        <View style={styles.form}>
                            {/* Warehouse Selection */}
                            <Text style={styles.label}>Choose a Warehouse *</Text>
                            <FlatList
                                data={warehouses}
                                renderItem={renderWarehouseItem}
                                keyExtractor={item => item._id}
                                horizontal={false}
                                showsVerticalScrollIndicator={false}
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
                            {/* Supply Selection */}
                            {selectedWarehouse && (
                                <>
                                    <Text style={styles.label}>Select Supply Item *</Text>
                                    <TouchableOpacity
                                        style={styles.selector}
                                        onPress={() => setSupplyModalVisible(true)}
                                    >
                                        <Text style={[styles.selectorText, !selectedSupply && styles.placeholderText]}>
                                            {selectedSupply ? selectedSupply.itemName : 'Choose supply item'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color="#666" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Quantity Input */}
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

                            {/* Submit Button */}
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

                    {/* Supply selection modal/dropdown */}
                    <Modal
                        visible={supplyModalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setSupplyModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
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
                            </View>
                        </View>
                    </Modal>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    warehouseCardDisabled: {
        opacity: 0.6,
        backgroundColor: '#f8f8f8',
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
        fontSize: isIpad ? 14 : 12,
        marginLeft: 8,
        flex: 1,
    },
    container: { flex: 1 },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
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
        marginTop: 60
    },
    headerContent: { flex: 1, marginTop: 60 },
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
    },
    form: { padding: screenWidth * 0.05 },
    label: {
        fontSize: isIpad ? 18 : 16,
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
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#eee',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    selectorText: {
        fontSize: isIpad ? 16 : 14,
        color: '#333',
    },
    placeholderText: { color: '#999' },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        fontSize: isIpad ? 16 : 14,
        color: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    availableText: {
        fontSize: isIpad ? 14 : 12,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    disabledButton: { backgroundColor: '#ccc' },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
    },

    // Modal for Supply Selection
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: '95%',
        maxWidth: 400,
        maxHeight: '80%',
        minHeight: 200,
        alignSelf: 'center',
        padding: 0,
        overflow: 'hidden',
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
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    modalTitle: {
        fontSize: isIpad ? 20 : 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalList: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // List item styles (used for supplies in modal)
    listItem: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 0,
    },
    listItemTitle: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    listItemSubtitle: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        marginBottom: 2,
    },
    supplyItemContent: { flex: 1 },
    disabledText: { color: '#ccc' },
    outOfStockText: {
        fontSize: isIpad ? 12 : 10,
        color: '#ff4444',
        fontWeight: 'bold',
        marginTop: 4,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    emptyText: {
        fontSize: isIpad ? 16 : 14,
        color: '#999',
        textAlign: 'center',
    },
});

export default CreateSupplyRequestScreen;