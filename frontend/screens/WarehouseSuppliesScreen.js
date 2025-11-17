import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    TextInput,
    Modal,
    ScrollView,
    StatusBar,
    SafeAreaView,
    Dimensions,
    TouchableWithoutFeedback,
    Pressable,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const WarehouseSuppliesScreen = ({ route, navigation }) => {
    const { warehouse, canEdit = false, currencyUnit: initialCurrency } = route.params;
    const [supplies, setSupplies] = useState(warehouse.supplies || []);
    const [filteredSupplies, setFilteredSupplies] = useState(warehouse.supplies || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [priceModalVisible, setPriceModalVisible] = useState(false);
    const [editingSupply, setEditingSupply] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currencyUnit, setCurrencyUnit] = useState(initialCurrency || '₹');
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [customCurrency, setCustomCurrency] = useState('');
    const [showCustomCurrency, setShowCustomCurrency] = useState(false);
    const [currencySearchQuery, setCurrencySearchQuery] = useState('');
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importedData, setImportedData] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [showImportOptions, setShowImportOptions] = useState(false);
    const [formData, setFormData] = useState({
        itemName: '',
        quantity: '',
        unit: '',
        entryPrice: '',
        currentPrice: ''
    });
    const { API_BASE_URL, user } = useAuth();

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

    useEffect(() => {
        loadCurrencyPreference();
    }, []);

    const loadCurrencyPreference = async () => {
        try {
            const warehouseSpecificCurrency = await AsyncStorage.getItem(`warehouseCurrency_${warehouse._id}`);
            if (warehouseSpecificCurrency) {
                setCurrencyUnit(warehouseSpecificCurrency);
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
            await AsyncStorage.setItem(`warehouseCurrency_${warehouse._id}`, currency);
            setCurrencyUnit(currency);
        } catch (error) {
            console.log('Error saving currency preference:', error);
        }
    };

    const normalizeItemName = (name) => {
        // Convert to lowercase and trim
        let normalized = name.toLowerCase().trim();

        // Remove common plural endings
        if (normalized.endsWith('es')) {
            // handles: mangoes -> mango, tomatoes -> tomato
            normalized = normalized.slice(0, -2);
        } else if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
            // handles: apples -> apple, but not grass
            normalized = normalized.slice(0, -1);
        }

        // Remove common variations
        normalized = normalized
            .replace(/\s+/g, ' ') // multiple spaces to single space
            .replace(/[-_]/g, ' '); // hyphens and underscores to spaces

        return normalized;
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
    const handleImportFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.canceled) {
                return;
            }

            const fileUri = result.assets[0].uri;
            const fileName = result.assets[0].name;
            const fileExtension = fileName.split('.').pop().toLowerCase();

            if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
                Alert.alert('Invalid File', 'Please select a CSV or Excel file (.csv, .xlsx, .xls)');
                return;
            }

            setIsImporting(true);

            try {
                const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64
                });

                let jsonData = [];

                if (fileExtension === 'csv') {
                    const base64ToText = atob(fileContent);
                    const workbook = XLSX.read(base64ToText, { type: 'string' });
                    const worksheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[worksheetName];
                    jsonData = XLSX.utils.sheet_to_json(worksheet);
                } else {
                    const workbook = XLSX.read(fileContent, { type: 'base64' });
                    const worksheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[worksheetName];
                    jsonData = XLSX.utils.sheet_to_json(worksheet);
                }

                // Validate that we have data
                if (!jsonData || jsonData.length === 0) {
                    Alert.alert('Invalid File', 'The file appears to be empty or has no data rows.');
                    setIsImporting(false);
                    return;
                }

                // Define valid column names for each required field
                const validItemNameColumns = ['itemName', 'Item Name', 'item_name', 'Item', 'Name', 'Product'];
                const validQuantityColumns = ['quantity', 'Quantity', 'Qty', 'qty', 'Amount'];
                const validUnitColumns = ['unit', 'Unit', 'Units', 'UOM'];
                const validPriceColumns = [
                    'entryPrice', 'Entry Price', 'Price', 'price',
                    'Current Price', 'current_price', 'Unit Price',
                    'unit_price', 'Cost', 'cost'
                ];

                // Get headers from the first row
                const headers = Object.keys(jsonData[0]);

                // Check if file has all required columns (including price)
                const hasItemNameColumn = headers.some(header =>
                    validItemNameColumns.includes(header)
                );
                const hasQuantityColumn = headers.some(header =>
                    validQuantityColumns.includes(header)
                );
                const hasUnitColumn = headers.some(header =>
                    validUnitColumns.includes(header)
                );
                const hasPriceColumn = headers.some(header =>
                    validPriceColumns.includes(header)
                );

                if (!hasItemNameColumn || !hasQuantityColumn || !hasUnitColumn || !hasPriceColumn) {
                    const missingColumns = [];
                    if (!hasItemNameColumn) missingColumns.push('Item Name');
                    if (!hasQuantityColumn) missingColumns.push('Quantity');
                    if (!hasUnitColumn) missingColumns.push('Unit');
                    if (!hasPriceColumn) missingColumns.push('Price');

                    Alert.alert(
                        'Invalid File Format',
                        `The file is missing required columns: ${missingColumns.join(', ')}\n\n` +
                        'Your file must have these columns:\n' +
                        '• Item Name (or itemName, Item, Product)\n' +
                        '• Quantity (or quantity, Qty, Amount)\n' +
                        '• Unit (or unit, Units, UOM)\n' +
                        '• Price (or entryPrice, Cost, etc.)\n\n' +
                        'Current columns found: ' + headers.join(', ')
                    );
                    setIsImporting(false);
                    return;
                }

                // Process data
                const itemMap = new Map();
                let invalidRows = [];

                jsonData.forEach((row, index) => {
                    // Find the item name from valid columns
                    let itemName = '';
                    for (const col of validItemNameColumns) {
                        if (row[col]) {
                            itemName = row[col].toString().trim();
                            break;
                        }
                    }

                    // Find the quantity from valid columns
                    let quantity = 0;
                    for (const col of validQuantityColumns) {
                        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
                            quantity = parseFloat(row[col]);
                            break;
                        }
                    }

                    // Find the unit from valid columns
                    let unit = 'pcs';
                    for (const col of validUnitColumns) {
                        if (row[col]) {
                            unit = row[col].toString().trim();
                            break;
                        }
                    }

                    // Find the price from valid columns
                    let price = null;
                    for (const col of validPriceColumns) {
                        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
                            price = parseFloat(row[col]);
                            break;
                        }
                    }

                    // Validate row data
                    if (!itemName) {
                        invalidRows.push({
                            row: index + 2,
                            reason: 'Missing item name'
                        });
                        return;
                    }

                    if (isNaN(quantity) || quantity <= 0) {
                        invalidRows.push({
                            row: index + 2,
                            reason: 'Invalid or missing quantity'
                        });
                        return;
                    }

                    if (price === null || isNaN(price) || price < 0) {
                        invalidRows.push({
                            row: index + 2,
                            reason: price === null ? 'Missing price' : 'Invalid price (must be 0 or positive)'
                        });
                        return;
                    }

                    // Use normalized name for comparison
                    const normalizedName = normalizeItemName(itemName);

                    if (itemMap.has(normalizedName)) {
                        const existing = itemMap.get(normalizedName);
                        existing.quantity += quantity;
                        existing.mergedFromFile = true;
                        if (price > existing.currentPrice) {
                            existing.currentPrice = price;
                        }
                    } else {
                        itemMap.set(normalizedName, {
                            itemName: itemName, // Keep original name
                            quantity: quantity,
                            unit: unit || 'pcs',
                            currentPrice: price,
                            normalizedName: normalizedName
                        });
                    }
                });

                // Show warning about invalid rows if any
                if (invalidRows.length > 0) {
                    const invalidRowsMessage = invalidRows.slice(0, 5).map(r =>
                        `Row ${r.row}: ${r.reason}`
                    ).join('\n');

                    const additionalMessage = invalidRows.length > 5 ?
                        `\n... and ${invalidRows.length - 5} more rows` : '';

                    Alert.alert(
                        'Warning',
                        `Found ${invalidRows.length} invalid rows that will be skipped:\n\n` +
                        invalidRowsMessage + additionalMessage
                    );
                }

                // Check against existing supplies with normalized names
                const processedData = Array.from(itemMap.values()).map(item => {
                    const existingSupply = supplies.find(supply =>
                        normalizeItemName(supply.itemName) === item.normalizedName
                    );

                    return {
                        ...item,
                        isExisting: !!existingSupply,
                        existingSupply: existingSupply,
                        existingQuantity: existingSupply?.quantity || 0,
                        existingEntryPrice: existingSupply?.entryPrice || 0,
                        existingCurrentPrice: existingSupply?.currentPrice || existingSupply?.entryPrice || 0,
                        newTotalQuantity: existingSupply ?
                            existingSupply.quantity + item.quantity :
                            item.quantity,
                        action: existingSupply ? 'update' : 'create',
                        needsPricing: item.currentPrice === 0,
                        nameVariation: existingSupply && existingSupply.itemName !== item.itemName ?
                            `Will update "${existingSupply.itemName}"` : null
                    };
                });

                if (processedData.length === 0) {
                    Alert.alert(
                        'No Valid Data',
                        'No valid items found in the file. Please check:\n\n' +
                        '• Each row has an item name\n' +
                        '• Quantities are positive numbers\n' +
                        '• Prices are provided and valid (0 or positive)\n' +
                        '• The file format matches the template'
                    );
                    setIsImporting(false);
                    return;
                }

                setImportedData(processedData);
                setImportModalVisible(true);
                setIsImporting(false);

            } catch (parseError) {
                console.error('File parsing error:', parseError);
                setIsImporting(false);
                Alert.alert(
                    'File Read Error',
                    'Unable to read the file. Please ensure:\n\n' +
                    '• The file is not corrupted\n' +
                    '• It\'s a valid CSV or Excel file\n' +
                    '• It contains all required columns\n\n' +
                    'Required columns:\n' +
                    '• Item Name (or itemName, Item, Product)\n' +
                    '• Quantity (or quantity, Qty, Amount)\n' +
                    '• Unit (or unit, Units, UOM)\n' +
                    '• Price (or entryPrice, Cost, etc.)'
                );
            }

        } catch (error) {
            setIsImporting(false);
            if (error.code === 'E_DOCUMENT_PICKER_CANCELED') {
                return;
            } else {
                console.error('Import error:', error);
                Alert.alert(
                    'Import Error',
                    'Failed to import file. Please try again.'
                );
            }
        }
    };

    const saveImportedSupplies = async () => {
        try {
            setIsImporting(true);
            setImportProgress(0);

            // Prepare data for bulk import
            const bulkData = importedData.map(item => ({
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
                currentPrice: item.currentPrice || 0
            }));

            // Single API call for all items
            const response = await axios.post(
                `${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies/bulk-import?userId=${user.id}`,
                { supplies: bulkData, currency: currencyUnit },
                {
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setImportProgress(progress);
                    }
                }
            );

            if (response.data.success) {
                const importResults = response.data.importResults;

                // Update local state
                fetchSupplies();

                setImportModalVisible(false);
                setImportedData([]);
                setImportProgress(0);
                setIsImporting(false);

                // Show results
                const message =
                    `Import completed successfully!\n\n` +
                    `✓ ${importResults.created.length} new items added\n` +
                    `✓ ${importResults.updated.length} existing items updated\n` +
                    `${importResults.errors.length > 0 ? `✗ ${importResults.errors.length} items failed\n` : ''}\n` +
                    `${importResults.needsPricing > 0 ? `⚠ ${importResults.needsPricing} items need pricing\n` : ''}`;

                Alert.alert('Import Complete', message);
            }
        } catch (error) {
            setIsImporting(false);
            console.error('Save import error:', error);
            Alert.alert('Error', 'Failed to import supplies. Please try again.');
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
            entryPrice: '',
            currentPrice: ''
        });
        setEditingSupply(null);
    };

    const openModal = (supply = null) => {
        if (supply) {
            setFormData({
                itemName: supply.itemName,
                quantity: supply.quantity.toString(),
                unit: supply.unit,
                entryPrice: supply.entryPrice?.toString() || '',
                currentPrice: supply.currentPrice?.toString() || supply.entryPrice?.toString() || ''
            });
            setEditingSupply(supply);
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const openPriceModal = (supply) => {
        setEditingSupply(supply);
        setFormData({
            ...formData,
            currentPrice: supply.currentPrice?.toString() || supply.entryPrice?.toString() || ''
        });
        setPriceModalVisible(true);
    };

    const saveSupply = async () => {
        if (!formData.itemName || !formData.quantity || !formData.unit || !formData.entryPrice) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            const supplyData = {
                itemName: formData.itemName,
                quantity: parseFloat(formData.quantity),
                unit: formData.unit,
                currency: currencyUnit,
                entryPrice: parseFloat(formData.entryPrice),
                userId: user.id
            };

            // If it's a new supply, set current price same as entry price
            if (!editingSupply) {
                supplyData.currentPrice = parseFloat(formData.entryPrice);
            }

            let response;
            if (editingSupply) {
                response = await axios.put(
                    `${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies/${editingSupply._id}?userId=${user.id}`,
                    supplyData
                );
            } else {
                response = await axios.post(
                    `${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies?userId=${user.id}`,
                    supplyData
                );
            }

            if (response.data.success) {
                fetchSupplies();
                setModalVisible(false);
                resetForm();
                Alert.alert('Success', editingSupply ? 'Supply updated successfully' : 'Supply added successfully');
            }
        } catch (error) {
            console.error('Save supply error:', error);
            Alert.alert('Error', 'Failed to save supply');
        } finally {
            setLoading(false);
        }
    };

    const updateCurrentPrice = async () => {
        if (!formData.currentPrice) {
            Alert.alert('Error', 'Please enter the current price');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.put(
                `${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies/${editingSupply._id}/price?userId=${user.id}`,
                {
                    currentPrice: parseFloat(formData.currentPrice),
                    currency: currencyUnit
                }
            );

            if (response.data.success) {
                fetchSupplies();
                setPriceModalVisible(false);
                resetForm();
                Alert.alert('Success', 'Current price updated successfully');
            }
        } catch (error) {
            console.error('Update price error:', error);
            Alert.alert('Error', 'Failed to update price');
        } finally {
            setLoading(false);
        }
    };

    const deleteSupply = async (supplyId) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this supply?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await axios.delete(
                                `${API_BASE_URL}/api/warehouses/${warehouse._id}/supplies/${supplyId}?userId=${user.id}`
                            );

                            if (response.data.success) {
                                fetchSupplies();
                                Alert.alert('Success', 'Supply deleted successfully');
                            }
                        } catch (error) {
                            console.error('Delete supply error:', error);
                            Alert.alert('Error', 'Failed to delete supply');
                        }
                    }
                }
            ]
        );
    };

    const fetchSupplies = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/warehouses/${warehouse._id}?userId=${user.id}`);

            if (response.data.success) {
                setSupplies(response.data.data.supplies);
                if (searchQuery.trim() === '') {
                    setFilteredSupplies(response.data.data.supplies);
                } else {
                    handleSearch(searchQuery);
                }
            }
        } catch (error) {
            console.error('Fetch supplies error:', error);
            Alert.alert('Error', 'Failed to fetch supplies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSupplies();
    }, []);

    const getTotalValue = () => {
        return supplies.reduce((total, supply) => {
            const currentPrice = supply.currentPrice || supply.entryPrice || 0;
            return total + (supply.quantity * currentPrice);
        }, 0);
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
            Alert.alert('Error', 'Please enter a currency symbol');
            return;
        }
        saveCurrencyPreference(customCurrency.trim());
        setCurrencyModalVisible(false);
        setShowCustomCurrency(false);
        setCustomCurrency('');
    };

    const getCurrencyName = (symbol) => {
        const currency = currencyOptions.find(opt => opt.value === symbol);
        if (currency && currency.value !== 'custom') {
            return currency.label.split(' (')[0];
        }
        return 'Custom Currency';
    };

    const renderSupplyItem = ({ item }) => (
        <View style={styles.supplyCard}>
            <View style={styles.supplyContent}>
                <View style={styles.supplyHeader}>
                    <View style={styles.supplyMainInfo}>
                        <Text style={styles.itemName}>{item.itemName}</Text>
                        <Text style={styles.itemDetails}>
                            Quantity: {item.quantity} {item.unit}
                        </Text>
                    </View>

                    <View style={styles.priceContainer}>
                        <View style={styles.priceBadge}>
                            <Text style={styles.priceLabel}>Entry Price</Text>
                            <Text style={styles.priceValue}>
                                {item.currency || currencyUnit}{item.entryPrice || 0}
                            </Text>
                        </View>

                        {item.currentPrice && item.currentPrice !== item.entryPrice && (
                            <View style={[styles.priceBadge, styles.currentPriceBadge]}>
                                <Text style={styles.priceLabel}>Current Price</Text>
                                <Text style={styles.currentPriceValue}>
                                    {item.currency || currencyUnit}{item.currentPrice}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.valueBadge}>
                    <Text style={styles.valueLabel}>Total Value:</Text>
                    <Text style={styles.valueAmount}>
                        {item.currency || currencyUnit}{(item.quantity * (item.currentPrice || item.entryPrice || 0)).toFixed(2)}
                    </Text>
                </View>

                {canEdit && (
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => openModal(item)}
                        >
                            <Ionicons name="pencil-outline" size={isIpad ? 22 : 18} color="#E69138" />
                            <Text style={styles.actionButtonText}>Edit Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#E3F2FD' }]}
                            onPress={() => openPriceModal(item)}
                        >
                            <Ionicons name="trending-up-outline" size={isIpad ? 22 : 18} color="#1976D2" />
                            <Text style={[styles.actionButtonText, { color: '#1976D2' }]}>
                                Update Price
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {canEdit && (
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteSupply(item._id)}
                >
                    <Ionicons name="trash-outline" size={isIpad ? 22 : 20} color="#ff4444" />
                </TouchableOpacity>
            )}
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
                    <View style={styles.mainContainer}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.backButton}
                            >
                                <Ionicons name="arrow-back" size={isIpad ? 28 : 24} color="#FFFFFF" />
                            </TouchableOpacity>

                            <View style={styles.headerContent}>
                                <Text style={styles.title}>Warehouse Supplies</Text>
                                <Text style={styles.subtitle}>
                                    Total Items: {supplies.length} • Total Value: {currencyUnit}{getTotalValue().toFixed(2)}
                                </Text>
                            </View>

                            {user.role === 'admin' && (
                                <TouchableOpacity
                                    style={styles.currencyButton}
                                    onPress={() => setCurrencyModalVisible(true)}
                                >
                                    <Text style={styles.currencyButtonText}>{currencyUnit}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.contentArea}>
                            {/* Search Bar */}
                            <View style={styles.searchContainer}>
                                <View style={styles.searchBar}>
                                    <Ionicons name="search-outline" size={isIpad ? 24 : 20} color="#9CA3AF" style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search supplies..."
                                        placeholderTextColor="#9CA3AF"
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                                            <Ionicons name="close-circle" size={isIpad ? 22 : 18} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>

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
                                refreshControl={
                                    <RefreshControl
                                        refreshing={loading}
                                        onRefresh={fetchSupplies}
                                        colors={["#E69138"]}
                                        tintColor="#E69138"
                                    />
                                }
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Ionicons name="cube-outline" size={isIpad ? 80 : 64} color="#9CA3AF" />
                                        <Text style={styles.emptyText}>
                                            {searchQuery.length > 0 ? 'No supplies found matching your search' : 'No supplies added yet'}
                                        </Text>
                                        {canEdit && searchQuery.length === 0 && (
                                            <Text style={styles.emptySubtext}>
                                                Tap the + button to add your first supply
                                            </Text>
                                        )}
                                    </View>
                                }
                            />

                            {canEdit && (
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => {
                                        console.log('Add button pressed');
                                        console.log('canEdit:', canEdit);
                                        console.log('user.role:', user.role);

                                        // Update the Alert.alert in the addButton onPress
                                        Alert.alert(
                                            'Add Supplies',
                                            'Choose how you want to add supplies',
                                            [
                                                {
                                                    text: 'Cancel',
                                                    style: 'cancel',
                                                },
                                                {
                                                    text: 'Enter Manually',
                                                    onPress: () => openModal()
                                                },
                                                {
                                                    text: 'Import CSV/Excel',
                                                    onPress: () => {
                                                        // Show format instructions first
                                                        Alert.alert(
                                                            'Import Format',
                                                            'Your file must have these columns:\n\n' +
                                                            '• Item Name (or itemName, Item, Product)\n' +
                                                            '• Quantity (or quantity, Qty, Amount)\n' +
                                                            '• Unit (or unit, Units, UOM)\n' +
                                                            '• Price (or entryPrice, Cost, etc.)\n\n' +
                                                            'Example:\n' +
                                                            'Item Name,Quantity,Unit,Price\n' +
                                                            'Apples,100,kg,50\n' +
                                                            'Bananas,200,kg,30\n\n' +
                                                            'Notes:\n' +
                                                            '• All columns are required\n' +
                                                            '• Price must be 0 or positive number\n' +
                                                            '• Duplicate items will be merged automatically',
                                                            [
                                                                { text: 'Cancel', style: 'cancel' },
                                                                { text: 'Select File', onPress: handleImportFile }
                                                            ]
                                                        );
                                                    }
                                                }
                                            ],
                                            { cancelable: true }
                                        );
                                    }}
                                >
                                    <Ionicons name="add" size={isIpad ? 30 : 24} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Add/Edit Supply Modal */}
            {/* Add/Edit Supply Modal - FIXED VERSION */}
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
                        {/* Fixed Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingSupply ? 'Edit Supply' : 'Add New Supply'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalScrollView}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Item Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Item Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter item name"
                                    placeholderTextColor="#999"
                                    value={formData.itemName}
                                    onChangeText={(text) => setFormData({ ...formData, itemName: text })}
                                />
                            </View>

                            {/* Quantity and Unit Row */}
                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.inputLabel}>Quantity *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        placeholderTextColor="#999"
                                        value={formData.quantity}
                                        onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                                    <Text style={styles.inputLabel}>Unit *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="kg, pcs, etc."
                                        placeholderTextColor="#999"
                                        value={formData.unit}
                                        onChangeText={(text) => setFormData({ ...formData, unit: text })}
                                    />
                                </View>
                            </View>

                            {/* Entry Price and Currency Row */}
                            <View style={styles.inputRow}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.inputLabel}>Entry Price *</Text>
                                    <TextInput
                                        style={[styles.input, editingSupply && styles.disabledInput]}
                                        placeholder="0.00"
                                        placeholderTextColor="#999"
                                        value={formData.entryPrice}
                                        onChangeText={(text) => setFormData({ ...formData, entryPrice: text })}
                                        keyboardType="numeric"
                                        editable={!editingSupply}
                                    />
                                </View>

                                <View style={[styles.inputGroup, { flex: 0.6, marginLeft: 10 }]}>
                                    <Text style={styles.inputLabel}>Currency</Text>
                                    <View style={styles.currencyDisplay}>
                                        <Text style={styles.currencyText}>{currencyUnit}</Text>
                                    </View>
                                </View>
                            </View>

                            {editingSupply && (
                                <View style={styles.noteContainer}>
                                    <Ionicons name="information-circle-outline" size={16} color="#E69138" />
                                    <Text style={styles.noteText}>
                                        Entry price cannot be changed. Use "Update Price" to set current market price.
                                    </Text>
                                </View>
                            )}

                            {/* Action Buttons */}
                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => {
                                        setModalVisible(false);
                                        resetForm();
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={saveSupply}
                                    disabled={loading}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {loading ? 'Saving...' : (editingSupply ? 'Update' : 'Add Supply')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Update Price Modal */}
            <Modal
                visible={priceModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setPriceModalVisible(false);
                    resetForm();
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Current Price</Text>

                        {editingSupply && (
                            <View style={styles.pricingInfo}>
                                <Text style={styles.pricingItemName}>{editingSupply.itemName}</Text>
                                <Text style={styles.pricingItemDetails}>
                                    Quantity: {editingSupply.quantity} {editingSupply.unit}
                                </Text>
                                <Text style={styles.pricingItemDetails}>
                                    Entry Price: {editingSupply.currency || currencyUnit}{editingSupply.entryPrice}
                                </Text>
                            </View>
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder={`Current Market Price (${currencyUnit}) *`}
                            value={formData.currentPrice}
                            onChangeText={(text) => setFormData({ ...formData, currentPrice: text })}
                            keyboardType="numeric"
                        />

                        <Text style={styles.noteText}>
                            This will update the current market price while keeping the original entry price intact.
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    setPriceModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={updateCurrentPrice}
                            >
                                <Text style={styles.saveButtonText}>Update Price</Text>
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
                    <TouchableWithoutFeedback
                        onPress={() => {
                            setCurrencyModalVisible(false);
                            setShowCustomCurrency(false);
                            setCustomCurrency('');
                            setCurrencySearchQuery('');
                        }}
                    >
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={() => { }}>
                                <View style={styles.modalContent}>
                                    <View style={styles.currencyModalHeader}>
                                        <Text style={styles.modalTitle}>Select Currency Unit</Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setCurrencyModalVisible(false);
                                                setShowCustomCurrency(false);
                                                setCustomCurrency('');
                                                setCurrencySearchQuery('');
                                            }}
                                            style={styles.closeButton}
                                        >
                                            <Ionicons name="close" size={24} color="#333" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.currencySearchBar}>
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

                                    <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={true}>
                                        {currencyOptions
                                            .filter(option =>
                                                option.label.toLowerCase().includes(currencySearchQuery.toLowerCase())
                                            )
                                            .map((option, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={[
                                                        styles.currencyOption,
                                                        currencyUnit === option.value && styles.selectedCurrencyOption
                                                    ]}
                                                    onPress={() => handleCurrencySelect(option.value)}
                                                >
                                                    <Text style={[
                                                        styles.currencyOptionText,
                                                        currencyUnit === option.value && styles.selectedCurrencyOptionText
                                                    ]}>
                                                        {option.label}
                                                    </Text>
                                                    {currencyUnit === option.value && (
                                                        <Ionicons name="checkmark-circle" size={20} color="#E69138" />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                    </ScrollView>

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
                                                style={[styles.button, styles.saveButton]}
                                                onPress={saveCustomCurrency}
                                            >
                                                <Text style={styles.saveButtonText}>Save Currency</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

            )}
            {/* Import Preview Modal */}
            <Modal
                visible={importModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setImportModalVisible(false);
                    setImportedData([]);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Import Preview</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setImportModalVisible(false);
                                    setImportedData([]);
                                }}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.importSummary}>
                            {importedData.filter(item => item.action === 'create').length} new items,{' '}
                            {importedData.filter(item => item.action === 'update').length} items to update
                        </Text>

                        <ScrollView style={styles.importPreviewList}>
                            {importedData.map((item, index) => (
                                <View key={index} style={[
                                    styles.importPreviewItem,
                                    item.isExisting && styles.importPreviewItemExisting
                                ]}>
                                    <View style={styles.importPreviewHeader}>
                                        <Text style={styles.importPreviewName}>{item.itemName}</Text>
                                        <View style={[
                                            styles.importPreviewBadge,
                                            item.isExisting ? styles.updateBadge : styles.newBadge
                                        ]}>
                                            <Text style={styles.importPreviewBadgeText}>
                                                {item.isExisting ? 'UPDATE' : 'NEW'}
                                            </Text>
                                        </View>
                                    </View>

                                    {item.nameVariation && (
                                        <Text style={styles.nameVariationText}>
                                            <Ionicons name="information-circle" size={14} color="#FF9800" /> {item.nameVariation}
                                        </Text>
                                    )}

                                    <View style={styles.importPreviewDetails}>
                                        <Text style={styles.importPreviewText}>
                                            Quantity: {item.quantity} {item.unit}
                                        </Text>
                                        {item.isExisting && (
                                            <Text style={styles.importPreviewText}>
                                                Current: {item.existingQuantity} → New: {item.newTotalQuantity}
                                            </Text>
                                        )}
                                        <Text style={styles.importPreviewText}>
                                            Price: {currencyUnit}{item.currentPrice || 'Not set'}
                                            {item.needsPricing && (
                                                <Text style={styles.warningText}> (Needs pricing)</Text>
                                            )}
                                        </Text>
                                    </View>

                                    {item.mergedFromFile && (
                                        <Text style={styles.mergedText}>
                                            <Ionicons name="git-merge" size={12} color="#2196F3" /> Merged duplicate entries from file
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        {isImporting && (
                            <View style={styles.progressContainer}>
                                <Text style={styles.progressText}>Importing... {importProgress}%</Text>
                                <View style={styles.progressBar}>                        <View style={[styles.progressFill, { width: `${importProgress}%` }]} />
                                </View>
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setImportModalVisible(false);
                                    setImportedData([]);
                                }}
                                disabled={isImporting}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={saveImportedSupplies}
                                disabled={isImporting}
                            >
                                <Text style={styles.saveButtonText}>
                                    {isImporting ? `Importing... ${importProgress}%` : 'Import All'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    nameVariationText: {
        fontSize: isIpad ? 13 : 11,
        color: '#FF9800',
        marginTop: 4,
        marginBottom: 4,
        fontStyle: 'italic',
    },
    mergedText: {
        fontSize: isIpad ? 12 : 10,
        color: '#2196F3',
        marginTop: 4,
        fontStyle: 'italic',
    },
    // Add these to your existing styles
    inputLabel: {
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: isIpad ? 12 : 10,
        padding: isIpad ? 16 : 14,
        fontSize: isIpad ? 16 : 14,
        backgroundColor: '#f9f9f9',
        color: '#333',
    },
    disabledInput: {
        backgroundColor: '#f0f0f0',
        color: '#999',
    },
    inputRow: {
        flexDirection: 'row',
        marginBottom: isIpad ? 20 : 16,
    },
    importSummary: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        marginBottom: 15,
        textAlign: 'center',
    },
    importPreviewList: {
        maxHeight: screenHeight * 0.4,
        marginBottom: 20,
    },
    importPreviewItem: {
        backgroundColor: '#f8f9fa',
        padding: isIpad ? 16 : 12,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    importPreviewItemExisting: {
        borderColor: '#ffc107',
        backgroundColor: '#fff8e1',
    },
    importPreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    importPreviewName: {
        fontSize: isIpad ? 16 : 14,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    importPreviewBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    newBadge: {
        backgroundColor: '#28a745',
    },
    updateBadge: {
        backgroundColor: '#ffc107',
    },
    importPreviewBadgeText: {
        color: '#fff',
        fontSize: isIpad ? 12 : 10,
        fontWeight: 'bold',
    },
    importPreviewDetails: {
        gap: 4,
    },
    importPreviewText: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
    },
    warningText: {
        color: '#ff6b6b',
        fontWeight: '500',
    },
    progressContainer: {
        marginVertical: 20,
        paddingHorizontal: 20,
    },
    progressText: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        marginBottom: 8,
        textAlign: 'center',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#E69138',
        borderRadius: 4,
    },
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    mainContainer: {
        flex: 1,
        width: isIpad ? '85%' : '100%',
        alignSelf: 'center',
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
    currencyButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: screenWidth * 0.04,
        paddingVertical: screenHeight * 0.01,
        borderRadius: screenWidth * 0.05,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    currencyButtonText: {
        color: '#FFFFFF',
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        fontWeight: 'bold',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: screenWidth * 0.08,
        borderTopRightRadius: screenWidth * 0.08,
        paddingHorizontal: screenWidth * 0.04,
        paddingTop: screenHeight * 0.03,
    },
    searchContainer: {
        marginBottom: screenHeight * 0.02,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: screenWidth * 0.03,
        paddingHorizontal: screenWidth * 0.04,
        paddingVertical: screenHeight * 0.015,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: screenWidth * 0.02,
    },
    searchInput: {
        flex: 1,
        fontSize: isIpad ? screenWidth * 0.022 : screenWidth * 0.04,
        color: '#333',
    },
    clearButton: {
        padding: screenWidth * 0.01,
    },
    searchResultsInfo: {
        paddingHorizontal: screenWidth * 0.02,
        paddingTop: screenHeight * 0.01,
    },
    searchResultsText: {
        fontSize: isIpad ? screenWidth * 0.018 : screenWidth * 0.032,
        color: '#666',
        fontStyle: 'italic',
    },
    listContainer: {
        paddingBottom: screenHeight * 0.1,
    },
    supplyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: screenWidth * 0.04,
        marginBottom: screenHeight * 0.02,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    supplyContent: {
        flex: 1,
        padding: screenWidth * 0.04,
        paddingRight: screenWidth * 0.16, // Add extra padding on the right to accommodate delete button
    },
    supplyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: screenHeight * 0.015,
    },
    supplyMainInfo: {
        flex: 1,
        marginRight: screenWidth * 0.03, // Add some margin to prevent text overlap
    },
    itemName: {
        fontSize: isIpad ? screenWidth * 0.028 : screenWidth * 0.045,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: screenHeight * 0.006,
    },
    itemDetails: {
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        color: '#666',
    },
    priceContainer: {
        alignItems: 'flex-end',
        marginRight: screenWidth * 0.02, // Add margin to keep away from delete button
    },
    priceBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: screenWidth * 0.025,
        paddingVertical: screenHeight * 0.008,
        borderRadius: screenWidth * 0.02,
        alignItems: 'center',
        marginBottom: screenHeight * 0.005,
        borderWidth: 1,
        borderColor: '#E69138',
    },
    currentPriceBadge: {
        backgroundColor: '#E3F2FD',
        borderColor: '#1976D2',
    },
    priceLabel: {
        fontSize: isIpad ? screenWidth * 0.014 : screenWidth * 0.025,
        color: '#E69138',
        fontWeight: '500',
    },
    priceValue: {
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        fontWeight: 'bold',
        color: '#E69138',
    },
    currentPriceValue: {
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    valueBadge: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: screenWidth * 0.03,
        borderRadius: screenWidth * 0.02,
        marginBottom: screenHeight * 0.015,
    },
    valueLabel: {
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        color: '#666',
        fontWeight: '500',
    },
    valueAmount: {
        fontSize: isIpad ? screenWidth * 0.022 : screenWidth * 0.04,
        fontWeight: 'bold',
        color: '#28a745',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: screenHeight * 0.01,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: screenWidth * 0.03,
        paddingVertical: screenHeight * 0.01,
        borderRadius: screenWidth * 0.02,
        flex: 0.45,
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#E69138',
        fontSize: isIpad ? screenWidth * 0.018 : screenWidth * 0.03,
        fontWeight: '600',
        marginLeft: screenWidth * 0.01,
    },
    deleteButton: {
        position: 'absolute',
        top: screenHeight * 0.02,
        right: screenWidth * 0.02, // Move it closer to the edge
        backgroundColor: 'rgba(255, 0, 0, 0.08)',
        padding: screenWidth * 0.015, // Slightly smaller padding
        borderRadius: screenWidth * 0.05,
        width: screenWidth * 0.08, // Slightly smaller
        height: screenWidth * 0.08,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10, // Ensure it's above other elements
    },
    addButton: {
        position: 'absolute',
        bottom: screenHeight * 0.03,
        right: screenWidth * 0.05,
        backgroundColor: '#E69138',
        width: screenWidth * 0.14,
        height: screenWidth * 0.14,
        borderRadius: screenWidth * 0.07,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
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
        padding: 24,
        width: isIpad ? '80%' : '90%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    modalTitle: {
        fontSize: isIpad ? 22 : 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
        marginRight: 40, // To center the title properly
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: isIpad ? 16 : 12,
        marginBottom: 16,
        fontSize: isIpad ? 16 : 14,
        backgroundColor: '#f9f9f9',
        color: '#333',
    },
    pricingInfo: {
        backgroundColor: '#F5F5F5',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    pricingItemName: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    pricingItemDetails: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        marginBottom: 2,
    },
    noteText: {
        fontSize: isIpad ? 12 : 10,
        color: '#888',
        fontStyle: 'italic',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        paddingHorizontal: isIpad ? 24 : 20,
        paddingVertical: isIpad ? 20 : 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
        borderBottomLeftRadius: isIpad ? 24 : 16,
        borderBottomRightRadius: isIpad ? 24 : 16,
    },
    modalButton: {
        flex: 1,
        paddingVertical: isIpad ? 16 : 14,
        borderRadius: isIpad ? 12 : 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        marginRight: 8,
    },
    saveButton: {
        backgroundColor: '#E69138',
        marginLeft: 8,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: isIpad ? 24 : 20,
        paddingTop: isIpad ? 24 : 20,
        paddingBottom: isIpad ? 20 : 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    // Currency Modal Styles
    currencyModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeButton: {
        position: 'absolute',
        right: isIpad ? 20 : 16,
        top: isIpad ? 20 : 10,
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
    },
    currencySearchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginTop: 15,
        marginBottom: 10,
    },
    currencySearchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#333',
    },
    currencyList: {
        maxHeight: screenHeight * 0.5,
    },
    modalScrollView: {
        maxHeight: screenHeight * 0.5,
        paddingHorizontal: isIpad ? 24 : 20,
        paddingTop: isIpad ? 20 : 16,
    },
    currencyOption: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedCurrencyOption: {
        backgroundColor: '#FFF3E0',
    },
    currencyOptionText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    selectedCurrencyOptionText: {
        color: '#E69138',
        fontWeight: 'bold',
    },
    customCurrencySection: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 15,
        marginTop: 10,
    },
    currencyDisplay: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: isIpad ? 12 : 10,
        padding: isIpad ? 16 : 14,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        height: isIpad ? 52 : 48,
    },
    currencyText: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
        color: '#E69138',
    },
});

export default WarehouseSuppliesScreen;