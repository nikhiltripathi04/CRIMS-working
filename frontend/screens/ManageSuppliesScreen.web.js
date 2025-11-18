import React, { useState, useEffect } from 'react';
import { useNavigation } from "@react-navigation/native"; // Import useNavigation for web compatible navigation
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
    Pressable,
    ActivityIndicator,
    Dimensions // Still useful, but static sizing preferred for web/desktop look
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
// The following are technically incorrect imports for a standard web environment but kept for build compatibility if running through Expo Web
import * as FileSystem from 'expo-file-system'; 
import XLSX from 'xlsx';

// Utility to parse OCR invoice text.
function parseInvoiceItems(ocrText) {
    const lines = ocrText.split(/\r?\n/);
    const items = [];
    const regex = /^\s*\d+\.\s*\|?\s*(.+?)\s*\|.*?\|\s*([\d.]+)\s*(Metre|Pcs|Pkt|Box|Kg|Meter|Piece)?\b/i;
    for (let line of lines) {
        const match = line.match(regex);
        if (match) {
            items.push({
                itemName: match[1].trim(),
                quantity: match[2].trim(),
                unit: match[3]?.trim() || ''
            });
        }
    }
    return items;
}

// Fixed dimensions for web compatibility
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const isIpad = screenWidth >= 768; // Use static breakpoint for consistency

const ManageSuppliesScreen = ({ route }) => {
    const navigation = useNavigation();
    const { site, canEdit = false } = route.params;
    const [supplies, setSupplies] = useState(site.supplies || []);
    const [filteredSupplies, setFilteredSupplies] = useState(site.supplies || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [pricingModalVisible, setPricingModalVisible] = useState(false);
    const [unitDropdownVisible, setUnitDropdownVisible] = useState(false);
    const [editingSupply, setEditingSupply] = useState(null);
    const [pricingSupply, setPricingSupply] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCustomUnit, setShowCustomUnit] = useState(false);
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [currencyUnit, setCurrencyUnit] = useState('₹');
    const [customCurrency, setCustomCurrency] = useState('');
    const [showCustomCurrency, setShowCustomCurrency] = useState(false);
    const [currencySearchQuery, setCurrencySearchQuery] = useState('');
    const [formData, setFormData] = useState({
        itemName: '',
        quantity: '',
        unit: '',
        cost: ''
    });
    const { API_BASE_URL, user } = useAuth();
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importedData, setImportedData] = useState([]);
    const [importProgress, setImportProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);

    const currencyOptions = [
        { label: 'Indian Rupee (₹)', value: '₹' },
        { label: 'US Dollar ($)', value: '$' },
        { label: 'Euro (€)', value: '€' },
        { label: 'British Pound (£)', value: '£' },
        { label: 'Japanese Yen (¥)', value: '¥' },
        { label: 'UAE Dirham (د.إ)', value: 'د.إ' },
        { label: 'Chinese Yuan (¥)', value: '¥' },
        { label: 'Canadian Dollar (C$)', value: 'C$' },
        { label: 'Australian Dollar (A$)', value: 'A$' },
        { label: 'Singapore Dollar (S$)', value: 'S$' },
        { label: 'Custom', value: 'custom' }
    ];

    const normalizeItemName = (name) => {
        if (!name) return '';
        let normalized = name.toLowerCase().trim();
        normalized = normalized
            .replace(/\s+/g, ' ')
            .replace(/[-_]/g, ' ')
            .replace(/['"]/g, '');

        if (normalized.endsWith('oes')) {
            normalized = normalized.slice(0, -3) + 'o';
        } else if (normalized.endsWith('oe')) {
            normalized = normalized.slice(0, -1) + 'o';
        } else if (normalized.endsWith('ies')) {
            normalized = normalized.slice(0, -3) + 'y';
        } else if (normalized.endsWith('ves')) {
            normalized = normalized.slice(0, -3) + 'f';
        } else if (normalized.endsWith('es')) {
            normalized = normalized.slice(0, -2);
        } else if (normalized.endsWith('s') && !normalized.endsWith('ss') && !normalized.endsWith('us')) {
            normalized = normalized.slice(0, -1);
        }

        return normalized;
    };

    // --- Web-Specific Import Handlers (keeping simplified implementation for brevity) ---
    const handleWebFileSelect = () => {
        const formatMessage = 'Your file should have these columns:\n\n' +
            '• itemName (or Item Name, Item, Product)\n' +
            '• quantity (or Quantity, Qty, Amount)\n' +
            '• unit (or Unit, Units, UOM)\n\n' +
            'Note: Duplicate items will be merged automatically.';

        window.alert(`Import Format:\n\n${formatMessage}`);

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv, .xlsx, .xls';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                processWebFile(file);
            }
        };
        input.click();
    };

    const processWebFile = async (file) => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
            window.alert('Invalid File', 'Please select a CSV or Excel file (.csv, .xlsx, .xls)');
            return;
        }

        setIsImporting(true);

        try {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const worksheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[worksheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    if (!jsonData || jsonData.length === 0) {
                        window.alert('Invalid File', 'The file appears to be empty or has no data rows.');
                        setIsImporting(false);
                        return;
                    }

                    const validItemNameColumns = ['itemName', 'Item Name', 'item_name', 'Item', 'Name', 'Product'];
                    const validQuantityColumns = ['quantity', 'Quantity', 'Qty', 'qty', 'Amount'];
                    const validUnitColumns = ['unit', 'Unit', 'Units', 'UOM'];

                    const headers = Object.keys(jsonData[0]);

                    const hasRequiredColumns = validItemNameColumns.some(header => headers.includes(header)) &&
                        validQuantityColumns.some(header => headers.includes(header)) &&
                        validUnitColumns.some(header => headers.includes(header));

                    if (!hasRequiredColumns) {
                        window.alert('Invalid File Format', 'Missing required columns.');
                        setIsImporting(false);
                        return;
                    }

                    // Processing logic (simplified for web example)
                    const itemMap = new Map();
                    jsonData.forEach((row) => {
                        let itemName = validItemNameColumns.map(col => row[col]).find(val => val)?.toString().trim() || '';
                        let quantity = parseFloat(validQuantityColumns.map(col => row[col]).find(val => val !== undefined && val !== null && val !== '') || 0);
                        let unit = validUnitColumns.map(col => row[col]).find(val => val)?.toString().trim() || 'pcs';
                        
                        if (!itemName || isNaN(quantity) || quantity <= 0) return;

                        const normalizedName = normalizeItemName(itemName);

                        if (itemMap.has(normalizedName)) {
                            const existing = itemMap.get(normalizedName);
                            existing.quantity += quantity;
                            existing.mergedFromFile = true;
                        } else {
                            itemMap.set(normalizedName, {
                                itemName,
                                quantity,
                                unit,
                                normalizedName
                            });
                        }
                    });

                    const processedData = Array.from(itemMap.values()).map(item => {
                        const existingSupply = supplies.find(supply =>
                            supply.itemName.toLowerCase().trim() === item.itemName.toLowerCase().trim()
                        );
                        return {
                            ...item,
                            isExisting: !!existingSupply,
                            existingQuantity: existingSupply?.quantity || 0,
                            newTotalQuantity: existingSupply ? existingSupply.quantity + item.quantity : item.quantity,
                            action: existingSupply ? 'update' : 'create',
                            nameVariation: existingSupply && existingSupply.itemName.toLowerCase().trim() !== item.itemName.toLowerCase().trim() ?
                                `Will update "${existingSupply.itemName}"` : null
                        };
                    });

                    if (processedData.length === 0) {
                        window.alert('No Valid Data', 'No valid items found in the file.');
                        setIsImporting(false);
                        return;
                    }

                    setImportedData(processedData);
                    setImportModalVisible(true);
                    setIsImporting(false);

                } catch (parseError) {
                    console.error('File parsing error:', parseError);
                    setIsImporting(false);
                    window.alert('File Read Error', 'Unable to read the file. Please ensure it\'s a valid CSV or Excel file.');
                }
            };

            reader.readAsBinaryString(file);

        } catch (error) {
            setIsImporting(false);
            console.error('Import process error:', error);
            window.alert('Import Error', 'Failed to initiate file import. Please try again.');
        }
    };
    
    const handleImportFile = handleWebFileSelect;
    // --- End of Web-Specific Import Handlers ---

    const downloadTemplate = async () => {
        try {
            const templateData = [
                { 'Item Name': 'Cement Bags', 'Quantity': 100, 'Unit': 'pcs' },
                { 'Item Name': 'Steel Rods', 'Quantity': 500, 'Unit': 'kg' },
                { 'Item Name': 'Sand', 'Quantity': 10, 'Unit': 'tons' },
            ];
            const csvHeader = 'Item Name,Quantity,Unit\n';
            const csvContent = templateData.map(row => `${row['Item Name']},${row['Quantity']},${row['Unit']}`).join('\n');
            const fullCsvContent = csvHeader + csvContent;

            const blob = new Blob([fullCsvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'supplies_template.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            window.alert('Template Ready', 'The template CSV file download should have started.');

        } catch (error) {
            console.error('Template download error:', error);
            window.alert('Error', 'Failed to create template file');
        }
    };
    
    const saveImportedSupplies = async () => {
        try {
            setIsImporting(true);
            setImportProgress(0);

            const authId = user.id;
            const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';

            const bulkData = importedData.map(item => ({
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit
            }));

            // Simulate progress for web UX
            const totalSteps = 10;
            for (let i = 1; i <= totalSteps; i++) {
                setImportProgress((i / totalSteps) * 99);
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            const response = await axios.post(
                `${API_BASE_URL}/api/sites/${site._id}/supplies/bulk-import?${authParam}=${authId}`,
                { supplies: bulkData }
            );

            if (response.data.success) {
                setImportProgress(100);
                const importResults = response.data.importResults;

                setSupplies(response.data.data.supplies);
                if (searchQuery.trim() === '') {
                    setFilteredSupplies(response.data.data.supplies);
                } else {
                    handleSearch(searchQuery);
                }

                setImportModalVisible(false);
                setImportedData([]);
                setImportProgress(0);
                setIsImporting(false);

                const message =
                    `Import completed successfully!\n\n` +
                    `✓ ${importResults.created.length} new items added\n` +
                    `✓ ${importResults.updated.length} existing items updated\n` +
                    `${importResults.errors.length > 0 ? `✗ ${importResults.errors.length} items failed\n` : ''}\n` +
                    `${user.role === 'supervisor' ? 'New items sent for pricing approval.' : ''}`;

                window.alert('Import Complete', message);
            }
        } catch (error) {
            setIsImporting(false);
            setImportProgress(0);
            console.error('Save import error:', error);
            window.alert('Error', 'Failed to import supplies. Please try again.');
        }
    };
    
    const getCurrencyName = (symbol) => {
        const currency = currencyOptions.find(opt => opt.value === symbol);
        if (currency && currency.value !== 'custom') {
            return currency.label.split(' (')[0];
        }
        return 'Custom Currency';
    };

    const unitOptions = [
        { label: 'Pieces', value: 'pcs' },
        { label: 'Kilograms', value: 'kg' },
        { label: 'Meters', value: 'm' },
        { label: 'Custom', value: 'custom' }
    ];
    
    useEffect(() => {
        loadCurrencyPreference();
    }, []);

    const loadCurrencyPreference = async () => {
        try {
            const siteSpecificCurrency = await AsyncStorage.getItem(`supplyCurrency_${site._id}`);
            if (siteSpecificCurrency) {
                setCurrencyUnit(siteSpecificCurrency);
            } else {
                const globalCurrency = await AsyncStorage.getItem('supplyCurrency');
                if (globalCurrency) {
                    setCurrencyUnit(globalCurrency);
                }
            }
        } catch (error) {
            console.log('Error loading currency preference:', error);
        }
    };

    const saveCurrencyPreference = async (currency) => {
        try {
            await AsyncStorage.setItem(`supplyCurrency_${site._id}`, currency);
            setCurrencyUnit(currency);
        } catch (error) {
            console.log('Error saving currency preference:', error);
        }
    };

    const handleCurrencySelect = (selectedCurrency) => {
        if (selectedCurrency === 'custom') {
            setShowCustomCurrency(true);
            setCustomCurrency('');
        } else {
            setShowCustomCurrency(false);
            saveCurrencyPreference(selectedCurrency);
            setCurrencyModalVisible(false);
        }
    };

    const saveCustomCurrency = () => {
        if (!customCurrency.trim()) {
            window.alert('Error', 'Please enter a currency symbol');
            return;
        }
        saveCurrencyPreference(customCurrency.trim());
        setCurrencyModalVisible(false);
        setShowCustomCurrency(false);
        setCustomCurrency('');
    };

    const handleSearch = (query) => {
        setSearchQuery(query);

        if (query.trim() === '') {
            setFilteredSupplies(supplies);
        } else {
            const filtered = supplies.filter(supply =>
                supply.itemName.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredSupplies(filtered);
        }
    };
    
    const sortSupplies = (suppliesArray) => {
        if (user.role === 'admin') {
            return suppliesArray.sort((a, b) => {
                const aIsPending = !a.cost || a.status === 'pending_pricing';
                const bIsPending = !b.cost || b.status === 'pending_pricing';

                if (aIsPending && !bIsPending) return -1;
                if (!aIsPending && bIsPending) return 1;
                return 0;
            });
        } else {
            return suppliesArray;
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setFilteredSupplies(supplies);
    };

    const resetForm = () => {
        setFormData({
            itemName: '',
            quantity: '',
            unit: '',
            cost: ''
        });
        setEditingSupply(null);
        setPricingSupply(null);
        setShowCustomUnit(false);
        setUnitDropdownVisible(false);
    };

    const openModal = (supply = null) => {
        if (supply) {
            const isCustomUnit = !unitOptions.find(option => option.value === supply.unit && option.value !== 'custom');
            setFormData({
                itemName: supply.itemName,
                quantity: supply.quantity.toString(),
                unit: isCustomUnit ? supply.unit : supply.unit,
                cost: supply.cost ? supply.cost.toString() : ''
            });
            setEditingSupply(supply);
            setShowCustomUnit(isCustomUnit);
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const openPricingModal = (supply) => {
        setPricingSupply(supply);
        setFormData({
            ...formData,
            cost: supply.cost ? supply.cost.toString() : ''
        });
        setPricingModalVisible(true);
    };

    const handleUnitSelect = (selectedUnit) => {
        if (selectedUnit === 'custom') {
            setShowCustomUnit(true);
            setFormData({ ...formData, unit: '' });
        } else {
            setShowCustomUnit(false);
            setFormData({ ...formData, unit: selectedUnit });
        }
        setUnitDropdownVisible(false);
    };

    const saveSupply = async () => {
        if (!formData.itemName || !formData.quantity || !formData.unit) {
            window.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            const authId = user.id;
            const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';
            const newSupply = {
                itemName: formData.itemName,
                quantity: parseFloat(formData.quantity),
                unit: formData.unit
            };

            if (user.role === 'admin' && formData.cost) {
                newSupply.cost = parseFloat(formData.cost);
            }

            let response;
            if (editingSupply) {
                response = await axios.put(
                    `${API_BASE_URL}/api/sites/${site._id}/supplies/${editingSupply._id}?${authParam}=${authId}`,
                    newSupply
                );
            } else {
                response = await axios.post(
                    `${API_BASE_URL}/api/sites/${site._id}/supplies?${authParam}=${authId}`,
                    newSupply
                );
            }

            if (response.data.success) {
                setSupplies(response.data.data.supplies);
                if (searchQuery.trim() === '') {
                    setFilteredSupplies(response.data.data.supplies);
                } else {
                    handleSearch(searchQuery);
                }
                setModalVisible(false);
                resetForm();

                const message = editingSupply ?
                    'Supply updated successfully' :
                    (user.role === 'supervisor' ? 'Supply added successfully and sent for pricing approval' : 'Supply added successfully');

                window.alert('Success', message);
            }
        } catch (error) {
            console.error('Save supply error:', error);
            window.alert('Error', 'Failed to save supply');
        }
    };

    const savePricing = async () => {
        if (!formData.cost) {
            window.alert('Error', 'Please enter the cost');
            return;
        }

        try {
            const response = await axios.put(
                `${API_BASE_URL}/api/sites/${site._id}/supplies/${pricingSupply._id}/pricing?adminId=${user.id}`,
                { cost: parseFloat(formData.cost) }
            );

            if (response.data.success) {
                setSupplies(response.data.data.supplies);
                if (searchQuery.trim() === '') {
                    setFilteredSupplies(response.data.data.supplies);
                } else {
                    handleSearch(searchQuery);
                }
                setPricingModalVisible(false);
                resetForm();
                window.alert('Success', 'Pricing set successfully');
            }
        } catch (error) {
            console.error('Set pricing error:', error);
            window.alert('Error', 'Failed to set pricing');
        }
    };

    const deleteSupply = async (supplyId) => {
        if (user.role !== 'admin') {
            window.alert('Error', 'Only admins can delete supplies');
            return;
        }

        const confirmed = window.confirm('Are you sure you want to delete this supply?');
        
        if (!confirmed) return;

        try {
            const response = await axios.delete(
                `${API_BASE_URL}/api/sites/${site._id}/supplies/${supplyId}?adminId=${user.id}`
            );

            if (response.data.success) {
                setSupplies(response.data.data.supplies);
                if (searchQuery.trim() === '') {
                    setFilteredSupplies(response.data.data.supplies);
                } else {
                    handleSearch(searchQuery);
                }
                window.alert('Success', 'Supply deleted successfully');
            }
        } catch (error) {
            console.error('Delete supply error:', error);
            window.alert('Error', 'Failed to delete supply');
        }
    };

    const fetchSupplies = async () => {
        try {
            setLoading(true);
            const paramName = user.role === 'admin' ? 'adminId' : 'supervisorId';
            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}?${paramName}=${user.id}`);

            if (response.data.success) {
                const sortedSupplies = sortSupplies(response.data.data.supplies);
                setSupplies(sortedSupplies);

                if (searchQuery.trim() === '') {
                    setFilteredSupplies(sortedSupplies);
                } else {
                    const filtered = sortedSupplies.filter(supply =>
                        supply.itemName.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    setFilteredSupplies(filtered);
                }
            }
        } catch (error) {
            console.error('Fetch supplies error:', error);
            window.alert('Error', 'Failed to fetch supplies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSupplies();
    }, []);

    useEffect(() => {
        const sortedSupplies = sortSupplies(supplies);
        if (searchQuery.trim() === '') {
            setFilteredSupplies(sortedSupplies);
        } else {
            const filtered = sortedSupplies.filter(supply =>
                supply.itemName.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredSupplies(filtered);
        }
    }, [supplies, user.role]);

    const getTotalValue = () => {
        return supplies
            .filter(supply => supply.status === 'priced' || supply.cost)
            .reduce((total, supply) => total + (supply.quantity * (supply.cost || 0)), 0);
    };

    const getPendingCount = () => {
        return supplies.filter(supply => supply.status === 'pending_pricing' || !supply.cost).length;
    };

    const renderSupplyItem = ({ item }) => {
        if (!item) {
            return null;
        }

        const quantity = parseFloat(item.quantity) || 0;
        const cost = parseFloat(item.cost) || 0;
        const totalValue = quantity * cost;

        return (
            <View style={styles.supplyCard}>
                <View style={styles.supplyContent}>
                    <View style={styles.supplyHeader}>
                        <View style={styles.supplyMainInfo}>
                            <Text style={styles.itemName}>{item.itemName || 'Unknown Item'}</Text>
                            <Text style={styles.itemDetails}>
                                Quantity: {quantity} {item.unit || ''}
                            </Text>
                        </View>

                        {user?.role === 'admin' && (
                            <>
                                {(item.status === 'priced' || item.cost) ? (
                                    <View style={styles.priceBadge}>
                                        <Text style={styles.priceValue}>
                                            {currencyUnit || '₹'}{cost}
                                        </Text>
                                        <Text style={styles.priceLabel}>per {item.unit || 'unit'}</Text>
                                    </View>
                                ) : (
                                    <View style={styles.pendingBadge}>
                                        <Text style={styles.pendingText}>Pending</Text>
                                        <Text style={styles.pendingSubtext}>Pricing</Text>
                                    </View>
                                )}
                            </>
                        )}

                        {user?.role === 'supervisor' && (
                            <View style={styles.statusBadge}>
                                <Ionicons name="checkmark-circle-outline" size={18} color="#28a745" />
                                <Text style={styles.statusText}>Added</Text>
                            </View>
                        )}
                    </View>

                    {user?.role === 'admin' && (item.status === 'priced' || item.cost) && (
                        <View style={styles.valueBadge}>
                            <Text style={styles.valueLabel}>Total Value:</Text>
                            <Text style={styles.valueAmount}>
                                {currencyUnit || '₹'}{totalValue.toFixed(2)}
                            </Text>
                        </View>
                    )}

                    {canEdit && (
                        <View style={styles.actionButtons}>
                            {user?.role === 'supervisor' && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => openModal(item)}
                                >
                                    <Ionicons name="pencil-outline" size={18} color="#2094F3" />
                                    <Text style={styles.actionButtonText}>Edit Details</Text>
                                </TouchableOpacity>
                            )}

                            {user?.role === 'admin' && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#FFF3CD' }]}
                                    onPress={() => openPricingModal(item)}
                                >
                                    <Ionicons name="pricetag-outline" size={18} color="#856404" />
                                    <Text style={[styles.actionButtonText, { color: '#856404' }]}>
                                        {item.cost ? 'Update Price' : 'Set Price'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {canEdit && user?.role === 'admin' && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteSupply(item._id)}
                    >
                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* 2. Web Back Button: Use navigation.goBack() directly */}
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.webBackButton}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
                <Text style={styles.webBackButtonText}>Back</Text>
            </TouchableOpacity>

            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                {/* SafeAreaView is usually not needed in web, replaced with simple View */}
                <View style={styles.safeAreaWeb}>
                    <View style={styles.mainContainer}>
                        <View style={styles.header}>
                            <View style={styles.headerContent}>
                                <Text style={styles.title}>Supplies Management</Text>
                                <Text style={styles.subtitle}>
                                    {user.role === 'admin' ? (
                                        `Total Items: ${supplies.length} • Pending: ${getPendingCount()} • Total Value: ${currencyUnit}${getTotalValue().toFixed(2)}`
                                    ) : (
                                        `Total Items: ${supplies.length} supplies added`
                                    )}
                                </Text>
                            </View>

                            {user.role === 'admin' && (
                                <TouchableOpacity
                                    style={styles.currencyButtonEnhanced}
                                    onPress={() => setCurrencyModalVisible(true)}
                                >
                                    <Text style={styles.currencyButtonTextEnhanced}>
                                        Current Currency Unit: {currencyUnit} ({getCurrencyName(currencyUnit)})
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.contentArea}>
                            {/* Search Bar */}
                            <View style={styles.searchContainer}>
                                <View style={styles.searchBar}>
                                    <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search supplies..."
                                        placeholderTextColor="#9CA3AF"
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Search Results Info */}
                                {searchQuery.length > 0 && (
                                    <View style={styles.searchResultsInfo}>
                                        <Text style={styles.searchResultsText}>
                                            {filteredSupplies.length} result{filteredSupplies.length !== 1 ? 's' : ''} found
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <FlatList
                                data={filteredSupplies}
                                renderItem={renderSupplyItem}
                                keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                                contentContainerStyle={styles.listContainer}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
                                        <Text style={styles.emptyText}>
                                            {searchQuery.length > 0 ? 'No supplies found matching your search' : 'No supplies added yet'}
                                        </Text>
                                        {canEdit && user.role === 'supervisor' && searchQuery.length === 0 && (
                                            <Text style={styles.emptySubtext}>
                                                Tap the + button to add your first supply
                                            </Text>
                                        )}
                                    </View>
                                }
                            />

                            {/* Floating Add Button */}
                            {canEdit && user.role === 'supervisor' && (
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => {
                                        const choice = window.prompt('Add Supplies: Choose how you want to add supplies.\n1. Enter Manually\n2. Import CSV/Excel\n\nEnter 1 or 2:', '1');

                                        if (choice === '1') {
                                            openModal();
                                        } else if (choice === '2') {
                                            const confirmFormat = window.confirm(
                                                'Import Format:\nYour file should have these columns:\n\n' +
                                                '• itemName (or Item Name, Item, Product)\n' +
                                                '• quantity (or Quantity, Qty, Amount)\n' +
                                                '• unit (or Unit, Units, UOM)\n\n' +
                                                'Click OK to select file, or Cancel.'
                                            );
                                            if (confirmFormat) {
                                                handleImportFile();
                                            }
                                        }
                                    }}
                                >
                                    <Ionicons name="add" size={24} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Add/Edit Supply Modal - SUPERVISOR ONLY */}
            {user.role === 'supervisor' && (
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => {
                        setModalVisible(false);
                        resetForm();
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalTitle}>
                                    {editingSupply ? 'Edit Supply Details' : 'Add New Supply'}
                                </Text>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Item Name *"
                                    value={formData.itemName}
                                    onChangeText={(text) => setFormData({ ...formData, itemName: text })}
                                />

                                <TextInput
                                    style={styles.input}
                                    placeholder="Quantity *"
                                    value={formData.quantity}
                                    onChangeText={(text) => setFormData({ ...formData, quantity: text.replace(/[^0-9.]/g, '') })}
                                    keyboardType="numeric"
                                />

                                {/* Unit Selection */}
                                <View style={styles.radioGroupContainer}>
                                    <Text style={styles.radioGroupTitle}>Select Unit *</Text>
                                    {unitOptions.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={styles.radioButtonContainer}
                                            onPress={() => handleUnitSelect(option.value)}
                                        >
                                            <View style={[
                                                styles.radioOuter,
                                                formData.unit === option.value && styles.radioOuterSelected
                                            ]}>
                                                {formData.unit === option.value && <View style={styles.radioInner} />}
                                            </View>
                                            <Text style={[
                                                styles.radioLabel,
                                                formData.unit === option.value && styles.radioLabelSelected
                                            ]}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}

                                    {formData.unit !== '' && (
                                        <TouchableOpacity
                                            style={styles.clearUnitButton}
                                            onPress={() => {
                                                setFormData({ ...formData, unit: '' });
                                                setShowCustomUnit(false);
                                            }}
                                        >
                                            <Text style={styles.clearUnitText}>Change Unit</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {showCustomUnit && (
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter custom unit *"
                                        value={formData.unit}
                                        onChangeText={(text) => setFormData({ ...formData, unit: text })}
                                    />
                                )}

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.cancelButton]}
                                        onPress={() => {
                                            setModalVisible(false);
                                            resetForm();
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.button, styles.saveButton]}
                                        onPress={saveSupply}
                                    >
                                        <Text style={styles.saveButtonText}>
                                            {editingSupply ? 'Update' : 'Add'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Pricing Modal - ADMIN ONLY */}
            <Modal
                visible={pricingModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setPricingModalVisible(false);
                    resetForm();
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {pricingSupply?.cost ? 'Update Price' : 'Set Price'}
                        </Text>

                        {pricingSupply && (
                            <View style={styles.pricingInfo}>
                                <Text style={styles.pricingItemName}>{pricingSupply.itemName}</Text>
                                <Text style={styles.pricingItemDetails}>
                                    Quantity: {pricingSupply.quantity} {pricingSupply.unit}
                                </Text>
                            </View>
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder={`Cost per unit (${currencyUnit}) *`}
                            value={formData.cost}
                            onChangeText={(text) => setFormData({ ...formData, cost: text.replace(/[^0-9.]/g, '') })}
                            keyboardType="numeric"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    setPricingModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={savePricing}
                            >
                                <Text style={styles.saveButtonText}>
                                    {pricingSupply?.cost ? 'Update Price' : 'Set Price'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Currency Modal - Admin Only */}
            {user.role === 'admin' && (
                <Modal
                    visible={currencyModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => {
                        setCurrencyModalVisible(false);
                        setShowCustomCurrency(false);
                        setCustomCurrency('');
                        setCurrencySearchQuery('');
                    }}
                >
                    {/* 3. Simplified Modal structure for web: Removed outer TouchableWithoutFeedback */}
                    <Pressable
                        style={styles.modalOverlay}
                        onPress={() => {
                            setCurrencyModalVisible(false);
                            setShowCustomCurrency(false);
                            setCustomCurrency('');
                            setCurrencySearchQuery('');
                        }}
                    >
                        {/* Use Pressable instead of TouchableWithoutFeedback with a nested Pressable to stop propagation */}
                        <Pressable style={styles.modalContent} onPress={() => {}}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Currency Unit</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setCurrencyModalVisible(false);
                                        setShowCustomCurrency(false);
                                        setCustomCurrency('');
                                        setCurrencySearchQuery('');
                                    }}
                                    style={{ padding: 5 }}
                                >
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            {/* Search Bar */}
                            <View style={styles.currencySearchContainer}>
                                <Ionicons name="search-outline" size={20} color="#666" />
                                <TextInput
                                    style={styles.currencySearchInput}
                                    placeholder="Search currency by name..."
                                    placeholderTextColor="#999"
                                    value={currencySearchQuery}
                                    onChangeText={setCurrencySearchQuery}
                                />
                                {currencySearchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setCurrencySearchQuery('')}>
                                        <Ionicons name="close-circle" size={20} color="#999" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Currency List */}
                            <ScrollView
                                style={{ maxHeight: 300 }}
                                showsVerticalScrollIndicator={true}
                            >
                                {currencyOptions
                                    .filter(option =>
                                        option.label.toLowerCase().includes(currencySearchQuery.toLowerCase())
                                    )
                                    .map((option, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.currencyOptionItem,
                                                currencyUnit === option.value && styles.currencyOptionItemSelected
                                            ]}
                                            onPress={() => {
                                                if (option.value === 'custom') {
                                                    setShowCustomCurrency(true);
                                                } else {
                                                    saveCurrencyPreference(option.value);
                                                    setCurrencyModalVisible(false);
                                                    setCurrencySearchQuery('');
                                                }
                                            }}
                                        >
                                            <View style={styles.currencyOptionContent}>
                                                <Text style={[
                                                    styles.currencyOptionText,
                                                    currencyUnit === option.value && styles.currencyOptionTextSelected
                                                ]}>
                                                    {option.label}
                                                </Text>
                                                {currencyUnit === option.value && (
                                                    <Ionicons name="checkmark-circle" size={20} color="#2094F3" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>

                            {/* Custom Currency Section */}
                            {showCustomCurrency && (
                                <View style={styles.customCurrencySection}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter custom currency symbol"
                                        value={customCurrency}
                                        onChangeText={setCustomCurrency}
                                        maxLength={5}
                                    />
                                    <TouchableOpacity
                                        style={[styles.button, styles.saveButton, { marginTop: 10 }]}
                                        onPress={saveCustomCurrency}
                                    >
                                        <Text style={styles.saveButtonText}>Save Currency</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Pressable>
                    </Pressable>
                </Modal>
            )}

            {/* Import Preview Modal (kept for reference, using window.alert instead of Alert) */}
            <Modal
                visible={importModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    if (!isImporting) {
                        setImportModalVisible(false);
                        setImportedData([]);
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                        {/* Header */}
                        <View style={styles.importModalHeader}>
                            <Text style={styles.modalTitle}>Import Preview</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (!isImporting) {
                                        setImportModalVisible(false);
                                        setImportedData([]);
                                    }
                                }}
                                disabled={isImporting}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Summary Cards and list content remains the same */}
                        <View style={styles.importSummary}>
                            <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="add-circle-outline" size={24} color="#1976D2" />
                                <Text style={[styles.summaryNumber, { color: '#1976D2' }]}>
                                    {importedData.filter(item => item.action === 'create').length}
                                </Text>
                                <Text style={[styles.summaryLabel, { color: '#1976D2' }]}>New Items</Text>
                            </View>

                            <View style={[styles.summaryCard, { backgroundColor: '#FFF3CD' }]}>
                                <Ionicons name="sync-circle-outline" size={24} color="#856404" />
                                <Text style={[styles.summaryNumber, { color: '#856404' }]}>
                                    {importedData.filter(item => item.action === 'update').length}
                                </Text>
                                <Text style={[styles.summaryLabel, { color: '#856404' }]}>Updates</Text>
                            </View>

                            <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                                <Ionicons name="checkmark-circle-outline" size={24} color="#2E7D32" />
                                <Text style={[styles.summaryNumber, { color: '#2E7D32' }]}>
                                    {importedData.length}
                                </Text>
                                <Text style={[styles.summaryLabel, { color: '#2E7D32' }]}>Total</Text>
                            </View>
                        </View>

                        {/* Help Text */}
                        <View style={styles.importHelpContainer}>
                            <Ionicons name="information-circle-outline" size={20} color="#666" />
                            <Text style={styles.importHelpText}>
                                Items with existing names will have their quantities added to current stock
                            </Text>
                        </View>

                        {/* Items List */}
                        <ScrollView
                            style={styles.importPreviewScroll}
                            showsVerticalScrollIndicator={true}
                        >
                            {importedData.map((item, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.importPreviewItem,
                                        item.isExisting && styles.existingItemPreview
                                    ]}
                                >
                                    <View style={styles.importPreviewContent}>
                                        <View style={styles.itemNameRow}>
                                            <Text style={styles.importPreviewName}>{item.itemName}</Text>
                                            {item.isExisting && (
                                                <View style={styles.updateBadge}>
                                                    <Text style={styles.updateBadgeText}>UPDATE</Text>
                                                </View>
                                            )}
                                        </View>

                                        {item.nameVariation && (
                                            <Text style={styles.nameVariationText}>
                                                <Ionicons name="information-circle" size={14} color="#FF9800" /> {item.nameVariation}
                                            </Text>
                                        )}

                                        {item.isExisting ? (
                                            <View style={styles.quantityUpdate}>
                                                <Text style={styles.quantityUpdateText}>
                                                    Current: {item.existingQuantity} {item.unit}
                                                </Text>
                                                <Ionicons name="arrow-forward" size={16} color="#666" style={{ marginHorizontal: 8 }} />
                                                <Text style={styles.quantityUpdateNew}>
                                                    New: {item.newTotalQuantity} {item.unit}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.importPreviewDetails}>
                                                Quantity: {item.quantity} {item.unit}
                                            </Text>
                                        )}

                                        {item.mergedFromFile && (
                                            <Text style={styles.duplicateNote}>
                                                <Ionicons name="git-merge" size={12} color="#2196F3" /> Merged duplicate entries from file
                                            </Text>
                                        )}
                                    </View>

                                    <Ionicons
                                        name={item.isExisting ? "sync-circle" : "add-circle"}
                                        size={24}
                                        color={item.isExisting ? "#FFA000" : "#4CAF50"}
                                    />
                                </View>
                            ))}
                        </ScrollView>

                        {/* Progress Bar */}
                        {isImporting && (
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${importProgress}%` }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    Importing... {Math.round(importProgress)}%
                                </Text>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    if (!isImporting) {
                                        setImportModalVisible(false);
                                        setImportedData([]);
                                    }
                                }}
                                disabled={isImporting}
                            >
                                <Text style={[styles.cancelButtonText, isImporting && { opacity: 0.5 }]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.importButton]}
                                onPress={saveImportedSupplies}
                                disabled={isImporting}
                            >
                                {isImporting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.importButtonText}>
                                        Import {importedData.length} Items
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Template Download Link */}
                        {!isImporting && (
                            <TouchableOpacity
                                style={styles.templateLink}
                                onPress={downloadTemplate}
                            >
                                <Ionicons name="download-outline" size={20} color="#2094F3" />
                                <Text style={styles.templateLinkText}>Download Template</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Simplified Web-Friendly Styling
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
    },
    gradient: {
        flex: 1,
        minHeight: 250,
    },
    safeAreaWeb: {
        flex: 1,
    },
    mainContainer: {
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
    },
    // --- Web Back Button Style (Fixed position for desktop) ---
    webBackButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
        zIndex: 10,
        cursor: 'pointer',
    },
    webBackButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    // --- End Web Back Button Style ---
    header: {
        paddingHorizontal: 30,
        paddingTop: 80,
        paddingBottom: 40,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '400',
    },
    currencyButtonEnhanced: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        marginLeft: 20,
        marginTop: 10,
        alignSelf: 'flex-start',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        cursor: 'pointer',
    },
    currencyButtonTextEnhanced: {
        color: '#2094F3',
        fontSize: 14,
        fontWeight: 'bold',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 30,
        paddingTop: 30,
        paddingBottom: 60,
        minHeight: '75vh',
    },
    searchContainer: {
        marginBottom: 15,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        outlineStyle: 'none',
    },
    clearButton: {
        paddingLeft: 10,
        cursor: 'pointer',
    },
    searchResultsInfo: {
        paddingHorizontal: 5,
        paddingVertical: 8,
    },
    searchResultsText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    listContainer: {
        paddingBottom: 80,
    },
    supplyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 15,
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        position: 'relative',
    },
    supplyContent: {
        padding: 20,
        flex: 1,
    },
    supplyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    supplyMainInfo: {
        flex: 1,
        marginRight: 15,
    },
    itemName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    itemDetails: {
        fontSize: 14,
        color: '#666',
    },
    priceBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        minWidth: 80,
    },
    priceValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976d2',
    },
    priceLabel: {
        fontSize: 12,
        color: '#1976d2',
        marginTop: 2,
    },
    pendingBadge: {
        backgroundColor: '#FFF3CD',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFEAA7',
        minWidth: 80,
    },
    pendingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#856404',
    },
    pendingSubtext: {
        fontSize: 12,
        color: '#856404',
        marginTop: 2,
    },
    statusBadge: {
        backgroundColor: '#E8F5E8',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C3E6C3',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#28a745',
        marginLeft: 5,
    },
    valueBadge: {
        backgroundColor: '#f0fdf4',
        padding: 15,
        borderRadius: 10,
        marginTop: 15,
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    valueLabel: {
        fontSize: 14,
        color: '#166534',
    },
    valueAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#15803d',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderRadius: 8,
        marginRight: 10,
        cursor: 'pointer',
    },
    actionButtonText: {
        fontSize: 14,
        color: '#2094F3',
        fontWeight: '500',
        marginLeft: 5,
    },
    deleteButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(255, 0, 0, 0.08)',
        padding: 8,
        borderRadius: 20,
        width: 35,
        height: 35,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    addButton: {
        position: 'fixed',
        bottom: 30,
        right: 30,
        backgroundColor: '#2094F3',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        cursor: 'pointer',
    },
    emptyState: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 50,
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginTop: 20,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 10,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 30,
        width: '90%',
        maxWidth: 500,
        maxHeight: '90vh',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        marginBottom: 15,
        borderRadius: 8,
        fontSize: 16,
        backgroundColor: '#F9FAFB',
        outlineStyle: 'none',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
        cursor: 'pointer',
    },
    cancelButton: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontWeight: 'bold',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#2094F3',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    pricingInfo: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    pricingItemName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    pricingItemDetails: {
        fontSize: 14,
        color: '#666',
    },
    radioGroupContainer: {
        flexDirection: 'column',
        marginVertical: 15,
    },
    radioGroupTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    radioButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        cursor: 'pointer',
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#9CA3AF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    radioOuterSelected: {
        borderColor: '#2094F3',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2094F3',
    },
    radioLabel: {
        fontSize: 16,
        color: '#333',
    },
    radioLabelSelected: {
        fontWeight: 'bold',
        color: '#2094F3',
    },
    clearUnitButton: {
        alignSelf: 'flex-end',
        marginBottom: 15,
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 8,
        cursor: 'pointer',
    },
    clearUnitText: {
        color: '#EF4444',
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginBottom: 10,
    },
    currencySearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    currencySearchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
        outlineStyle: 'none',
    },
    currencyOptionItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFF',
        cursor: 'pointer',
    },
    currencyOptionItemSelected: {
        backgroundColor: '#E3F2FD',
    },
    currencyOptionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currencyOptionText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    currencyOptionTextSelected: {
        fontWeight: 'bold',
        color: '#2094F3',
    },
    customCurrencySection: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 20,
        marginTop: 10,
    },
    importModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    importSummary: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    summaryCard: {
        flex: 1,
        alignItems: 'center',
        padding: 15,
        marginHorizontal: 5,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
    },
    summaryNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 2,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    importHelpContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F0F4F8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    importHelpText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 12,
        color: '#666',
        lineHeight: 18,
    },
    importPreviewScroll: {
        maxHeight: 300,
        marginBottom: 15,
    },
    importPreviewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: '#FAFAFA',
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    existingItemPreview: {
        backgroundColor: '#FFF8E1',
        borderColor: '#FFD54F',
    },
    importPreviewContent: {
        flex: 1,
        marginRight: 10,
    },
    itemNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    importPreviewName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    updateBadge: {
        backgroundColor: '#FFA000',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    updateBadgeText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
    },
    importPreviewDetails: {
        fontSize: 14,
        color: '#666',
    },
    quantityUpdate: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    quantityUpdateText: {
        fontSize: 13,
        color: '#666',
    },
    quantityUpdateNew: {
        fontSize: 13,
        color: '#333',
        fontWeight: '600',
    },
    duplicateNote: {
        fontSize: 10,
        color: '#FF6B00',
        fontStyle: 'italic',
        marginTop: 4,
    },
    progressContainer: {
        marginVertical: 15,
        paddingHorizontal: 15,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#666',
    },
    importButton: {
        backgroundColor: '#4CAF50',
        cursor: 'pointer',
    },
    importButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    templateLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        paddingVertical: 8,
        cursor: 'pointer',
    },
    templateLinkText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#2094F3',
        fontWeight: '500',
    },
});

export default ManageSuppliesScreen;