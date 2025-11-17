import React, { useState, useEffect } from 'react';
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
    RefreshControl,
    StatusBar,
    SafeAreaView,
    TouchableWithoutFeedback,
    Pressable,
    ActivityIndicator,
    Image,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const isIpad = screenWidth >= 768;

// Utility to parse OCR invoice text.
function parseInvoiceItems(ocrText) {
    const lines = ocrText.split(/\r?\n/);
    const items = [];
    // Looks for lines like: 1. | Item Name | ... | Qty | Unit...
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
const ManageSuppliesScreen = ({ route, navigation }) => {
    const { site, canEdit = false } = route.params;
    const [supplies, setSupplies] = useState(site.supplies || []);
    const [filteredSupplies, setFilteredSupplies] = useState(site.supplies || []); // For search
    const [searchQuery, setSearchQuery] = useState(''); // Search state
    const [modalVisible, setModalVisible] = useState(false);
    const [pricingModalVisible, setPricingModalVisible] = useState(false);
    const [unitDropdownVisible, setUnitDropdownVisible] = useState(false);
    const [editingSupply, setEditingSupply] = useState(null);
    const [pricingSupply, setPricingSupply] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCustomUnit, setShowCustomUnit] = useState(false);
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [currencyUnit, setCurrencyUnit] = useState('₹'); // Default currency
    const [customCurrency, setCustomCurrency] = useState('');
    const [showCustomCurrency, setShowCustomCurrency] = useState(false);
    const [currencySearchQuery, setCurrencySearchQuery] = useState('');
    const [formData, setFormData] = useState({
        itemName: '',
        quantity: '',
        unit: '',
        cost: '' // For admin pricing
    });
    const { API_BASE_URL, user } = useAuth();
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importedData, setImportedData] = useState([]);
    const [importProgress, setImportProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [addOptionsModalVisible, setAddOptionsModalVisible] = useState(false);

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

    // Add this after your state declarations
    const normalizeItemName = (name) => {
        if (!name) return '';

        // Convert to lowercase and trim (matching backend)
        let normalized = name.toLowerCase().trim();

        // Frontend can do additional normalization for preview purposes
        // Remove common variations
        normalized = normalized
            .replace(/\s+/g, ' ') // multiple spaces to single space
            .replace(/[-_]/g, ' ') // hyphens and underscores to spaces
            .replace(/['"]/g, ''); // remove quotes

        // Handle plurals
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

    // Update your add button with format alert
    {
        canEdit && user.role === 'supervisor' && (
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                    Alert.alert(
                        'Add Supplies',
                        'Choose how you want to add supplies',
                        [
                            { text: 'Cancel', style: 'cancel' },
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
                                        'Your file should have these columns:\n\n' +
                                        '• itemName (or Item Name, Item, Product)\n' +
                                        '• quantity (or Quantity, Qty, Amount)\n' +
                                        '• unit (or Unit, Units, UOM)\n\n' +
                                        'Example:\n' +
                                        'itemName,quantity,unit\n' +
                                        'Cement,100,bags\n' +
                                        'Steel Rods,200,kg\n\n' +
                                        'Note: Duplicate items will be merged automatically.\n' +
                                        'Similar names (e.g., "Cement" and "Cements") will be treated as the same item.',
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
        )
    }
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

                // Get headers from the first row
                const headers = Object.keys(jsonData[0]);

                // Check if file has required columns
                const hasItemNameColumn = headers.some(header =>
                    validItemNameColumns.includes(header)
                );
                const hasQuantityColumn = headers.some(header =>
                    validQuantityColumns.includes(header)
                );
                const hasUnitColumn = headers.some(header =>
                    validUnitColumns.includes(header)
                );

                if (!hasItemNameColumn || !hasQuantityColumn || !hasUnitColumn) {
                    const missingColumns = [];
                    if (!hasItemNameColumn) missingColumns.push('Item Name');
                    if (!hasQuantityColumn) missingColumns.push('Quantity');
                    if (!hasUnitColumn) missingColumns.push('Unit');

                    Alert.alert(
                        'Invalid File Format',
                        `The file is missing required columns: ${missingColumns.join(', ')}\n\n` +
                        'Your file must have these columns:\n' +
                        '• Item Name (or itemName, Item, Product)\n' +
                        '• Quantity (or quantity, Qty, Amount)\n' +
                        '• Unit (or unit, Units, UOM)\n\n' +
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

                    // Validate row data
                    if (!itemName || isNaN(quantity) || quantity <= 0) {
                        invalidRows.push({
                            row: index + 2, // +2 because Excel rows start at 1 and we have headers
                            reason: !itemName ? 'Missing item name' : 'Invalid or missing quantity'
                        });
                        return;
                    }

                    // Use normalized name for comparison
                    const normalizedName = normalizeItemName(itemName);

                    if (itemMap.has(normalizedName)) {
                        const existing = itemMap.get(normalizedName);
                        existing.quantity += quantity;
                        existing.mergedFromFile = true;
                    } else {
                        itemMap.set(normalizedName, {
                            itemName: itemName, // Keep original name
                            quantity: quantity,
                            unit: unit || 'pcs',
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

                // Check against existing supplies
                const processedData = Array.from(itemMap.values()).map(item => {
                    const existingSupply = supplies.find(supply =>
                        supply.itemName.toLowerCase().trim() === item.itemName.toLowerCase().trim()
                    );

                    return {
                        ...item,
                        isExisting: !!existingSupply,
                        existingSupply: existingSupply,
                        existingQuantity: existingSupply?.quantity || 0,
                        newTotalQuantity: existingSupply ?
                            existingSupply.quantity + item.quantity :
                            item.quantity,
                        action: existingSupply ? 'update' : 'create',
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
                    '• It contains the required columns\n\n' +
                    'Expected columns:\n' +
                    '• Item Name (or itemName, Item, Product)\n' +
                    '• Quantity (or quantity, Qty, Amount)\n' +
                    '• Unit (or unit, Units, UOM)'
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

    // Download template function
    const downloadTemplate = async () => {
        try {
            // Create template data
            const templateData = [
                { 'Item Name': 'Cement Bags', 'Quantity': 100, 'Unit': 'pcs' },
                { 'Item Name': 'Steel Rods', 'Quantity': 500, 'Unit': 'kg' },
                { 'Item Name': 'Sand', 'Quantity': 10, 'Unit': 'tons' },
                { 'Item Name': 'Bricks', 'Quantity': 5000, 'Unit': 'pcs' },
                { 'Item Name': 'Paint', 'Quantity': 25, 'Unit': 'liters' }
            ];

            // Convert to CSV string
            const csvHeader = 'Item Name,Quantity,Unit\n';
            const csvContent = templateData.map(row =>
                `${row['Item Name']},${row['Quantity']},${row['Unit']}`
            ).join('\n');
            const fullCsvContent = csvHeader + csvContent;

            // Use Expo FileSystem to save
            const fileUri = FileSystem.documentDirectory + 'supplies_template.csv';
            await FileSystem.writeAsStringAsync(fileUri, fullCsvContent, {
                encoding: FileSystem.EncodingType.UTF8
            });

            // Alert.alert(
            //     'Template Ready',
            //     'Template file has been created. You can share it or use it as reference.',
            //     [
            //         {
            //             text: 'Share',
            //             onPress: async () => {
            //                 // You'll need expo-sharing for this
            //                 const Sharing = await import('expo-sharing');
            //                 if (await Sharing.isAvailableAsync()) {
            //                     await Sharing.shareAsync(fileUri);
            //                 }
            //             }
            //         },
            //         { text: 'OK' }
            //     ]
            // );

        } catch (error) {
            console.error('Template download error:', error);
            Alert.alert('Error', 'Failed to create template file');
        }
    };

    // Complete Import Preview Modal
    // Save imported supplies
    const saveImportedSupplies = async () => {
        try {
            setIsImporting(true);
            setImportProgress(0);

            const authId = user.id;
            const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';

            // Prepare data for bulk import
            const bulkData = importedData.map(item => ({
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit
            }));

            // Single API call for all items
            const response = await axios.post(
                `${API_BASE_URL}/api/sites/${site._id}/supplies/bulk-import?${authParam}=${authId}`,
                { supplies: bulkData },
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

                // Show results
                const message =
                    `Import completed successfully!\n\n` +
                    `✓ ${importResults.created.length} new items added\n` +
                    `✓ ${importResults.updated.length} existing items updated\n` +
                    `${importResults.errors.length > 0 ? `✗ ${importResults.errors.length} items failed\n` : ''}\n` +
                    `${user.role === 'supervisor' ? 'New items sent for pricing approval.' : ''}`;

                Alert.alert('Import Complete', message);
            }
        } catch (error) {
            setIsImporting(false);
            console.error('Save import error:', error);
            Alert.alert('Error', 'Failed to import supplies. Please try again.');
        }
    };
    // Add this function after your currencyOptions array
    const getCurrencyName = (symbol) => {
        const currency = currencyOptions.find(opt => opt.value === symbol);
        if (currency && currency.value !== 'custom') {
            // Extract the name from the label (e.g., "Indian Rupee (₹)" -> "Indian Rupee")
            return currency.label.split(' (')[0];
        }
        return 'Custom Currency';
    };

    // Predefined unit options
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
            // Try to get site-specific currency first
            const siteSpecificCurrency = await AsyncStorage.getItem(`supplyCurrency_${site._id}`);
            if (siteSpecificCurrency) {
                setCurrencyUnit(siteSpecificCurrency);
            } else {
                // Fall back to global currency preference
                const globalCurrency = await AsyncStorage.getItem('supplyCurrency');
                if (globalCurrency) {
                    setCurrencyUnit(globalCurrency);
                }
            }
        } catch (error) {
            console.log('Error loading currency preference:', error);
        }
    };

    // Update your saveCurrencyPreference function
    const saveCurrencyPreference = async (currency) => {
        try {
            const previousCurrency = currencyUnit;

            // Save site-specific currency
            await AsyncStorage.setItem(`supplyCurrency_${site._id}`, currency);
            setCurrencyUnit(currency);

            // Log the change...
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
            Alert.alert('Error', 'Please enter a currency symbol');
            return;
        }
        saveCurrencyPreference(customCurrency.trim());
        setCurrencyModalVisible(false);
        setShowCustomCurrency(false);
        setCustomCurrency('');
    };


    // Search function
    // Search function - ONLY search by item names
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
            // For admin: pending supplies first, then priced supplies
            return suppliesArray.sort((a, b) => {
                const aIsPending = !a.cost || a.status === 'pending_pricing';
                const bIsPending = !b.cost || b.status === 'pending_pricing';

                if (aIsPending && !bIsPending) return -1; // a comes first
                if (!aIsPending && bIsPending) return 1;  // b comes first
                return 0; // maintain original order for same status
            });
        } else {
            // For supervisor: maintain original order (newest first)
            return suppliesArray;
        }
    };


    // Clear search
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

    const getCurrentUnitLabel = () => {
        if (showCustomUnit) {
            return formData.unit || 'Enter custom unit';
        }
        const selectedOption = unitOptions.find(option => option.value === formData.unit);
        return selectedOption ? selectedOption.label : 'Select unit *';
    };

    const saveSupply = async () => {
        if (!formData.itemName || !formData.quantity || !formData.unit) {
            Alert.alert('Error', 'Please fill in all required fields');
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

            // Admin can also set cost when editing
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
                // Update filtered supplies based on current search
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

                Alert.alert('Success', message);
            }
        } catch (error) {
            console.error('Save supply error:', error);
            Alert.alert('Error', 'Failed to save supply');
        }
    };

    const savePricing = async () => {
        if (!formData.cost) {
            Alert.alert('Error', 'Please enter the cost');
            return;
        }

        try {
            const response = await axios.put(
                `${API_BASE_URL}/api/sites/${site._id}/supplies/${pricingSupply._id}/pricing?adminId=${user.id}`,
                { cost: parseFloat(formData.cost) }
            );

            if (response.data.success) {
                setSupplies(response.data.data.supplies);
                // Update filtered supplies based on current search
                if (searchQuery.trim() === '') {
                    setFilteredSupplies(response.data.data.supplies);
                } else {
                    handleSearch(searchQuery);
                }
                setPricingModalVisible(false);
                resetForm();
                Alert.alert('Success', 'Pricing set successfully');
            }
        } catch (error) {
            console.error('Set pricing error:', error);
            Alert.alert('Error', 'Failed to set pricing');
        }
    };

    const deleteSupply = async (supplyId) => {
        if (user.role !== 'admin') {
            Alert.alert('Error', 'Only admins can delete supplies');
            return;
        }

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
                                `${API_BASE_URL}/api/sites/${site._id}/supplies/${supplyId}?adminId=${user.id}`
                            );

                            if (response.data.success) {
                                setSupplies(response.data.data.supplies);
                                // Update filtered supplies based on current search
                                if (searchQuery.trim() === '') {
                                    setFilteredSupplies(response.data.data.supplies);
                                } else {
                                    handleSearch(searchQuery);
                                }
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
            const paramName = user.role === 'admin' ? 'adminId' : 'supervisorId';
            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}?${paramName}=${user.id}`);

            if (response.data.success) {
                const sortedSupplies = sortSupplies(response.data.data.supplies);
                setSupplies(sortedSupplies);

                // Update filtered supplies based on current search
                if (searchQuery.trim() === '') {
                    setFilteredSupplies(sortedSupplies);
                } else {
                    // Apply search to sorted supplies
                    const filtered = sortedSupplies.filter(supply =>
                        supply.itemName.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    setFilteredSupplies(filtered);
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

    // Update filtered supplies when supplies change
    useEffect(() => {
        const sortedSupplies = sortSupplies(supplies);
        if (searchQuery.trim() === '') {
            setFilteredSupplies(sortedSupplies);
        } else {
            // Apply search to sorted supplies
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
        // Add safety checks at the top
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

                        {/* Only show price badges to ADMIN */}
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

                        {/* Show status badge to SUPERVISOR (without price) */}
                        {user?.role === 'supervisor' && (
                            <View style={styles.statusBadge}>
                                <Ionicons name="checkmark-circle-outline" size={isIpad ? 20 : 18} color="#28a745" />
                                <Text style={styles.statusText}>Added</Text>
                            </View>
                        )}
                    </View>

                    {/* Only show value badge to ADMIN - WITH SAFETY CHECKS */}
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
                            {/* SUPERVISOR: Only edit name, quantity, unit */}
                            {user?.role === 'supervisor' && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => openModal(item)}
                                >
                                    <Ionicons name="pencil-outline" size={isIpad ? 22 : 18} color="#2094F3" />
                                    <Text style={styles.actionButtonText}>Edit Details</Text>
                                </TouchableOpacity>
                            )}

                            {/* ADMIN: Only edit pricing */}
                            {user?.role === 'admin' && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#FFF3CD' }]}
                                    onPress={() => openPricingModal(item)}
                                >
                                    <Ionicons name="pricetag-outline" size={isIpad ? 22 : 18} color="#856404" />
                                    <Text style={[styles.actionButtonText, { color: '#856404' }]}>
                                        {item.cost ? 'Update Price' : 'Set Price'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* ADMIN: Only delete */}
                {canEdit && user?.role === 'admin' && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteSupply(item._id)}
                    >
                        <Ionicons name="trash-outline" size={isIpad ? 22 : 20} color="#ff4444" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

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
                                data={filteredSupplies} // Use filtered supplies instead of supplies
                                renderItem={renderSupplyItem}
                                keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                                contentContainerStyle={styles.listContainer}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={loading}
                                        onRefresh={fetchSupplies}
                                        colors={["#2094F3"]}
                                        tintColor="#2094F3"
                                    />
                                }
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Ionicons name="cube-outline" size={isIpad ? 80 : 64} color="#9CA3AF" />
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

                            {canEdit && user.role === 'supervisor' && (
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => {
                                        Alert.alert(
                                            'Add Supplies',
                                            'Choose how you want to add supplies',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
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
                                                            'Your file should have these columns:\n\n' +
                                                            '• itemName (or Item Name, Item, Product)\n' +
                                                            '• quantity (or Quantity, Qty, Amount)\n' +
                                                            '• unit (or Unit, Units, UOM)\n\n' +
                                                            'Example:\n' +
                                                            'itemName,quantity,unit\n' +
                                                            'Cement,100,bags\n' +
                                                            'Steel Rods,200,kg\n\n' +
                                                            'Note: Duplicate items will be merged automatically.\n' +
                                                            'Similar names (e.g., "Cement" and "Cements") will be treated as the same item.',
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
            {/* Edit Supply Modal - SUPERVISOR ONLY */}
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
                                    onChangeText={(text) => setFormData({ ...formData, quantity: text })}
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

            {/* Pricing Modal - Only for Admin */}
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
                            onChangeText={(text) => setFormData({ ...formData, cost: text })}
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
            {/* Currency Modal - Admin Only */}
            {/* Currency Modal - Admin Only */}
            {/* Currency Modal - Admin Only */}
            {/* Currency Modal - Admin Only */}
            {/* Currency Modal - Admin Only */}
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
                                    {/* Header */}
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingBottom: 15,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#E5E7EB'
                                    }}>
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
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#F5F5F5',
                                        borderRadius: 8,
                                        paddingHorizontal: 15,
                                        paddingVertical: 10,
                                        marginTop: 15,
                                        marginBottom: 10
                                    }}>
                                        <Ionicons name="search-outline" size={20} color="#666" />
                                        <TextInput
                                            style={{
                                                flex: 1,
                                                marginLeft: 10,
                                                fontSize: 16,
                                                color: '#333'
                                            }}
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
                                        style={{ maxHeight: screenHeight * 0.5 }}
                                        showsVerticalScrollIndicator={true}
                                    >
                                        {currencyOptions
                                            .filter(option =>
                                                option.label.toLowerCase().includes(currencySearchQuery.toLowerCase())
                                            )
                                            .map((option, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={{
                                                        paddingVertical: 15,
                                                        paddingHorizontal: 20,
                                                        borderBottomWidth: 0.5,
                                                        borderBottomColor: '#F0F0F0',
                                                        backgroundColor: currencyUnit === option.value ? '#E3F2FD' : '#FFF'
                                                    }}
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
                                                    <View style={{
                                                        flexDirection: 'row',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 16,
                                                            color: currencyUnit === option.value ? '#2094F3' : '#333',
                                                            fontWeight: currencyUnit === option.value ? 'bold' : 'normal',
                                                            flex: 1
                                                        }}>
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
                                        <View style={{
                                            borderTopWidth: 1,
                                            borderTopColor: '#E5E7EB',
                                            paddingTop: 15,
                                            marginTop: 10
                                        }}>
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
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}
            {/* Separate Modal for Unit Dropdown */}
            <Modal
                visible={unitDropdownVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setUnitDropdownVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setUnitDropdownVisible(false)}>
                    <View style={styles.dropdownModalOverlay}>
                        <Pressable style={styles.dropdownModalContent}>
                            <Text style={styles.dropdownModalTitle}>Select Unit</Text>
                            <ScrollView style={styles.dropdownScrollView}>
                                {unitOptions.map((item) => (
                                    <TouchableOpacity
                                        key={item.value}
                                        style={[
                                            styles.dropdownItem,
                                            formData.unit === item.value && styles.selectedDropdownItem
                                        ]}
                                        onPress={() => handleUnitSelect(item.value)}
                                    >
                                        <Text style={[
                                            styles.dropdownItemText,
                                            formData.unit === item.value && styles.selectedDropdownItemText
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {formData.unit === item.value && (
                                            <Ionicons name="checkmark" size={20} color="#2094F3" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Pressable>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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

                        {/* Summary Cards */}
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

                                        {/* Show name variation warning */}
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



const styles = StyleSheet.create({
    statusBadge: {
        backgroundColor: '#E8F5E8',
        paddingHorizontal: screenWidth * (isIpad ? 0.02 : 0.025),
        paddingVertical: screenHeight * (isIpad ? 0.008 : 0.006),
        borderRadius: screenWidth * 0.04,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C3E6C3',
    },
    statusText: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.032),
        fontWeight: '600',
        color: '#28a745',
        marginLeft: screenWidth * 0.01,
    },
    searchContainer: {
        marginBottom: screenHeight * (isIpad ? 0.02 : 0.015),
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: screenWidth * 0.03,
        paddingHorizontal: screenWidth * (isIpad ? 0.025 : 0.035),
        paddingVertical: screenHeight * (isIpad ? 0.015 : 0.012),
        marginHorizontal: screenWidth * (isIpad ? 0.01 : 0.005),
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
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        color: '#333',
        paddingVertical: 0, // Remove default padding
    },
    clearButton: {
        paddingLeft: screenWidth * 0.02,
    },
    searchResultsInfo: {
        paddingHorizontal: screenWidth * (isIpad ? 0.025 : 0.035),
        paddingVertical: screenHeight * (isIpad ? 0.01 : 0.008),
    },
    searchResultsText: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.032),
        color: '#666',
        fontStyle: 'italic',
    },
    pricingInfo: {
        backgroundColor: '#F8F9FA',
        borderRadius: screenWidth * 0.025,
        padding: screenWidth * (isIpad ? 0.025 : 0.035),
        marginBottom: screenHeight * (isIpad ? 0.025 : 0.02),
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: screenWidth * (isIpad ? 0.04 : 0.05),
        paddingTop: screenHeight * (isIpad ? 0.08 : 0.06),
        paddingBottom: screenHeight * (isIpad ? 0.04 : 0.03),
    },
    backButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: screenWidth * 0.06,
        width: screenWidth * (isIpad ? 0.05 : 0.1),
        height: screenWidth * (isIpad ? 0.05 : 0.1),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: screenWidth * 0.03,
    },
    headerContent: {
        flex: 1,
    },
    currencyButtonEnhanced: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: screenWidth * (isIpad ? 0.025 : 0.04),
        paddingVertical: screenHeight * (isIpad ? 0.01 : 0.008),
        marginLeft: screenWidth * 0.02,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        marginTop: screenHeight * (isIpad ? 0.05 : 0.05),
    },
    currencyButtonTextEnhanced: {
        color: '#2094F3',
        fontSize: screenWidth * (isIpad ? 0.025 : 0.04),
        marginLeft: screenWidth * 0.02,
        fontWeight: 'bold',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: screenHeight * 0.02,
    },
    modalCloseButton: {
        padding: screenWidth * 0.02,
    },
    currencyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: screenWidth * (isIpad ? 0.02 : 0.03),
        paddingVertical: screenHeight * (isIpad ? 0.008 : 0.006),
        borderRadius: screenWidth * 0.02,
        marginTop: screenHeight * 0.01,
    },
    currencyButtonText: {
        color: '#FFFFFF',
        fontSize: screenWidth * (isIpad ? 0.02 : 0.032),
        marginLeft: screenWidth * 0.015,
        fontWeight: '600',
    },
    pricingItemName: {
        fontSize: screenWidth * (isIpad ? 0.028 : 0.042),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: screenHeight * (isIpad ? 0.01 : 0.008),
    },
    pricingItemDetails: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#666',
        marginBottom: screenHeight * (isIpad ? 0.005 : 0.004),
        lineHeight: screenHeight * (isIpad ? 0.025 : 0.022),
    },
    pendingBadge: {
        backgroundColor: '#FFF3CD',
        borderRadius: screenWidth * 0.04,
        paddingHorizontal: screenWidth * (isIpad ? 0.02 : 0.03),
        paddingVertical: screenHeight * (isIpad ? 0.01 : 0.008),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFEAA7',
        minWidth: screenWidth * (isIpad ? 0.11 : 0.2),
    },
    pendingText: {
        fontSize: screenWidth * (isIpad ? 0.025 : 0.04),
        fontWeight: '600',
        color: '#856404',
    },
    pendingSubtext: {
        fontSize: screenWidth * (isIpad ? 0.015 : 0.025),
        color: '#856404',
        marginTop: screenHeight * 0.002,
    },
    pendingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3CD',
        paddingHorizontal: screenWidth * (isIpad ? 0.02 : 0.03),
        paddingVertical: screenHeight * (isIpad ? 0.01 : 0.008),
        borderRadius: screenWidth * 0.025,
        marginTop: screenHeight * (isIpad ? 0.01 : 0.008),
    },
    pendingInfoText: {
        marginLeft: screenWidth * 0.02,
        fontSize: screenWidth * (isIpad ? 0.02 : 0.03),
        color: '#856404',
    },
    addedBy: {
        fontSize: screenWidth * (isIpad ? 0.018 : 0.03),
        color: '#6B7280',
        marginTop: screenHeight * (isIpad ? 0.005 : 0.004),
    },
    infoNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: screenWidth * (isIpad ? 0.02 : 0.03),
        borderRadius: screenWidth * 0.025,
        marginVertical: screenHeight * (isIpad ? 0.015 : 0.012),
    },
    infoText: {
        marginLeft: screenWidth * 0.02,
        fontSize: screenWidth * (isIpad ? 0.02 : 0.03),
        color: '#1565C0',
        flex: 1,
        lineHeight: screenHeight * (isIpad ? 0.025 : 0.022),
    },
    radioGroupTitle: {
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        fontWeight: '600',
        color: '#333',
        marginBottom: screenHeight * (isIpad ? 0.015 : 0.012),
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
        maxWidth: '100%',
        alignSelf: 'center',
        width: '100%',
        marginTop: screenHeight * 0.025,
    },
    header: {
        paddingHorizontal: screenWidth * (isIpad ? 0.04 : 0.05),
        paddingTop: screenHeight * (isIpad ? 0.08 : 0.06),
        paddingBottom: screenHeight * (isIpad ? 0.04 : 0.03),
    },
    title: {
        color: '#FFFFFF',
        fontSize: screenWidth * (isIpad ? 0.04 : 0.06),
        fontWeight: 'bold',
        marginBottom: screenHeight * (isIpad ? 0.01 : 0.005),
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: screenWidth * (isIpad ? 0.023 : 0.035),
        fontWeight: '400',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderTopLeftRadius: screenWidth * 0.08,
        borderTopRightRadius: screenWidth * 0.08,
        paddingHorizontal: screenWidth * (isIpad ? 0.04 : 0.04),
        paddingTop: screenHeight * (isIpad ? 0.04 : 0.03),
        paddingBottom: screenHeight * (isIpad ? 0.06 : 0.04),
        minHeight: screenHeight * (isIpad ? 0.7 : 0.75),
    },
    listContainer: {
        paddingBottom: screenHeight * 0.1,
    },
    supplyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: screenWidth * 0.04,
        marginBottom: screenHeight * (isIpad ? 0.025 : 0.02),
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
        padding: screenWidth * (isIpad ? 0.03 : 0.04),
    },
    supplyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: screenHeight * (isIpad ? 0.02 : 0.015),
    },
    supplyMainInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: screenWidth * (isIpad ? 0.03 : 0.045),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: screenHeight * (isIpad ? 0.01 : 0.005),
    },
    itemDetails: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#666',
    },
    priceBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: screenWidth * (isIpad ? 0.02 : 0.03),
        paddingVertical: screenHeight * (isIpad ? 0.01 : 0.008),
        borderRadius: screenWidth * 0.05,
        alignItems: 'center',
        minWidth: screenWidth * (isIpad ? 0.11 : 0.2),
    },
    priceValue: {
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        fontWeight: 'bold',
        color: '#1976d2',
    },
    priceLabel: {
        fontSize: screenWidth * (isIpad ? 0.015 : 0.025),
        color: '#1976d2',
        marginTop: screenHeight * 0.002,
    },
    valueBadge: {
        backgroundColor: '#f0fdf4',
        padding: screenWidth * (isIpad ? 0.02 : 0.03),
        borderRadius: screenWidth * 0.025,
        marginTop: screenHeight * (isIpad ? 0.02 : 0.015),
        marginBottom: screenHeight * (isIpad ? 0.02 : 0.015),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    valueLabel: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#166534',
    },
    valueAmount: {
        fontSize: screenWidth * (isIpad ? 0.025 : 0.04),
        fontWeight: 'bold',
        color: '#15803d',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: screenHeight * (isIpad ? 0.01 : 0.005),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: screenWidth * (isIpad ? 0.015 : 0.02),
        borderRadius: screenWidth * 0.02,
        marginRight: screenWidth * (isIpad ? 0.02 : 0.03),
    },
    actionButtonText: {
        fontSize: screenWidth * (isIpad ? 0.018 : 0.03),
        color: '#2094F3',
        fontWeight: '500',
        marginLeft: screenWidth * 0.015,
    },
    deleteButton: {
        position: 'absolute',
        bottom: screenHeight * (isIpad ? 0.03 : 0.02),
        right: screenWidth * (isIpad ? 0.03 : 0.04),
        backgroundColor: 'rgba(255, 0, 0, 0.08)',
        padding: screenWidth * (isIpad ? 0.013 : 0.02),
        borderRadius: screenWidth * 0.05,
        width: screenWidth * (isIpad ? 0.055 : 0.09),
        height: screenWidth * (isIpad ? 0.055 : 0.09),
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        position: 'absolute',
        bottom: screenHeight * (isIpad ? 0.04 : 0.025),
        right: screenWidth * (isIpad ? 0.04 : 0.05),
        backgroundColor: '#2094F3',
        width: screenWidth * (isIpad ? 0.08 : 0.14),
        height: screenWidth * (isIpad ? 0.08 : 0.14),
        borderRadius: screenWidth * (isIpad ? 0.04 : 0.07),
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
        padding: screenWidth * (isIpad ? 0.08 : 0.1),
        marginTop: screenHeight * (isIpad ? 0.15 : 0.12),
    },
    emptyText: {
        fontSize: screenWidth * (isIpad ? 0.028 : 0.045),
        color: '#666',
        marginTop: screenHeight * (isIpad ? 0.03 : 0.025),
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#888',
        marginTop: screenHeight * (isIpad ? 0.015 : 0.012),
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: screenWidth * 0.04,
        padding: screenWidth * (isIpad ? 0.04 : 0.05),
        width: isIpad ? '60%' : '90%',
        maxWidth: isIpad ? 500 : '100%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: screenWidth * (isIpad ? 0.03 : 0.045),
        fontWeight: 'bold',
        marginBottom: screenHeight * (isIpad ? 0.03 : 0.025),
        textAlign: 'center',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: screenWidth * (isIpad ? 0.02 : 0.03),
        marginBottom: screenHeight * (isIpad ? 0.025 : 0.02),
        borderRadius: screenWidth * 0.025,
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        backgroundColor: '#F9FAFB',
    },
    dropdownContainer: {
        marginBottom: screenHeight * (isIpad ? 0.025 : 0.02),
    },
    dropdownButton: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: screenWidth * (isIpad ? 0.02 : 0.03),
        borderRadius: screenWidth * 0.025,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    dropdownButtonText: {
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        color: '#333',
    },
    placeholderText: {
        color: '#9CA3AF',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: screenHeight * (isIpad ? 0.03 : 0.025),
    },
    button: {
        flex: 1,
        padding: screenWidth * (isIpad ? 0.023 : 0.0375),
        borderRadius: screenWidth * 0.025,
        alignItems: 'center',
        marginHorizontal: screenWidth * 0.0125,
    },
    cancelButton: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontWeight: 'bold',
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
    },
    saveButton: {
        backgroundColor: '#2094F3',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
    },
    closeButton: {
        backgroundColor: '#2094F3',
        paddingVertical: screenHeight * 0.018,
        paddingHorizontal: screenWidth * 0.08,
        borderRadius: screenWidth * 0.03,
        width: '70%',
        alignItems: 'center',
    },
    // Dropdown Modal Styles
    dropdownModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdownModalContent: {
        backgroundColor: '#fff',
        width: isIpad ? '50%' : '80%',
        maxHeight: '70%',
        borderRadius: screenWidth * 0.04,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    dropdownModalTitle: {
        fontSize: screenWidth * (isIpad ? 0.025 : 0.045),
        fontWeight: 'bold',
        textAlign: 'center',
        padding: screenWidth * (isIpad ? 0.025 : 0.0375),
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    dropdownScrollView: {
        maxHeight: screenHeight * (isIpad ? 0.5 : 0.37),
    },
    dropdownItem: {
        padding: screenWidth * (isIpad ? 0.023 : 0.0375),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedDropdownItem: {
        backgroundColor: '#e3f2fd',
    },
    dropdownItemText: {
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        color: '#333',
    },
    selectedDropdownItemText: {
        color: '#2094F3',
        fontWeight: 'bold',
    },
    radioGroupContainer: {
        flexDirection: 'column',
        marginVertical: screenHeight * 0.015,
    },
    radioButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: screenHeight * 0.012,
    },
    radioOuter: {
        width: screenWidth * 0.05,
        height: screenWidth * 0.05,
        borderRadius: screenWidth * 0.025,
        borderWidth: 2,
        borderColor: '#9CA3AF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: screenWidth * 0.03,
    },
    radioOuterSelected: {
        borderColor: '#2094F3',
    },
    radioInner: {
        width: screenWidth * 0.025,
        height: screenWidth * 0.025,
        borderRadius: screenWidth * 0.0125,
        backgroundColor: '#2094F3',
    },
    radioLabel: {
        fontSize: screenWidth * 0.04,
        color: '#333',
    },
    radioLabelSelected: {
        fontWeight: 'bold',
        color: '#2094F3',
    },
    radioDisabled: {
        opacity: 0.4,
    },
    radioLabelDisabled: {
        color: '#A1A1AA',
    },
    clearUnitButton: {
        alignSelf: 'flex-end',
        marginBottom: screenHeight * 0.015,
        backgroundColor: '#F3F4F6',
        paddingVertical: screenHeight * 0.008,
        paddingHorizontal: screenWidth * 0.03,
        borderRadius: screenWidth * 0.02,
    },
    clearUnitText: {
        color: '#EF4444',
        fontWeight: 'bold',
        fontSize: screenWidth * 0.035,
    },
    headerContent: {
        width: '100%',
    },
    currencyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: screenWidth * (isIpad ? 0.02 : 0.03),
        paddingVertical: screenHeight * (isIpad ? 0.008 : 0.006),
        borderRadius: screenWidth * 0.02,
        marginTop: screenHeight * 0.01,
        alignSelf: 'flex-start', // This ensures the button doesn't stretch
    },
    currencyButtonText: {
        color: '#FFFFFF',
        fontSize: screenWidth * (isIpad ? 0.02 : 0.032),
        marginLeft: screenWidth * 0.015,
        fontWeight: '600',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: screenHeight * 0.015,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginBottom: screenHeight * 0.01,
    },
    currencyOptionItem: {
        paddingVertical: screenHeight * 0.015,
        paddingHorizontal: screenWidth * 0.04,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0',
    },
    currencyOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencyOptionText: {
        fontSize: screenWidth * (isIpad ? 0.023 : 0.038),
        color: '#333',
        marginLeft: screenWidth * 0.03,
        flex: 1,
    },
    currencyOptionTextSelected: {
        fontWeight: 'bold',
        color: '#2094F3',
    },
    customCurrencySection: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: screenHeight * 0.02,
        marginTop: screenHeight * 0.01,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: screenHeight * 0.015,
        marginBottom: screenHeight * 0.01,
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
        paddingVertical: 0,
    },
    currencyOptionItem: {
        paddingVertical: screenHeight * 0.018,
        paddingHorizontal: screenWidth * 0.04,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFF',
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
        fontSize: screenWidth * (isIpad ? 0.023 : 0.038),
        color: '#333',
        flex: 1,
    },
    currencyOptionTextSelected: {
        fontWeight: 'bold',
        color: '#2094F3',
    },
    currencySymbolPreview: {
        fontSize: screenWidth * (isIpad ? 0.025 : 0.04),
        color: '#666',
        marginLeft: 10,
        fontWeight: 'bold',
    },
    currencySymbolPreviewSelected: {
        color: '#2094F3',
    },
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    noResultsText: {
        fontSize: 16,
        color: '#999',
        marginTop: 10,
    },
    customCurrencySection: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: screenHeight * 0.02,
        marginTop: screenHeight * 0.01,
    },
    scannerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: screenHeight * (isIpad ? 0.025 : 0.02),
    },
    closeButton: {
        padding: screenWidth * (isIpad ? 0.015 : 0.02),
    },
    scanningContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: screenHeight * (isIpad ? 0.05 : 0.04),
    },
    scanningText: {
        marginTop: screenHeight * (isIpad ? 0.025 : 0.02),
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        color: '#666',
    },
    previewImage: {
        width: screenWidth * (isIpad ? 0.5 : 0.7),
        height: screenHeight * (isIpad ? 0.3 : 0.25),
        marginTop: screenHeight * (isIpad ? 0.025 : 0.02),
        borderRadius: screenWidth * 0.025,
    },
    scanResultText: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#666',
        marginBottom: screenHeight * (isIpad ? 0.02 : 0.015),
        textAlign: 'center',
    },
    scannedItemsList: {
        maxHeight: screenHeight * (isIpad ? 0.5 : 0.45),
        marginBottom: screenHeight * (isIpad ? 0.025 : 0.02),
    },
    scannedItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: screenWidth * 0.025,
        padding: screenWidth * (isIpad ? 0.025 : 0.035),
        marginBottom: screenHeight * (isIpad ? 0.015 : 0.012),
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    checkboxContainer: {
        marginRight: screenWidth * (isIpad ? 0.025 : 0.035),
    },
    checkbox: {
        width: screenWidth * (isIpad ? 0.04 : 0.06),
        height: screenWidth * (isIpad ? 0.04 : 0.06),
        borderRadius: screenWidth * 0.01,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#2094F3',
        borderColor: '#2094F3',
    },
    scannedItemInfo: {
        flex: 1,
    },
    scannedItemName: {
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        fontWeight: '600',
        color: '#333',
        marginBottom: screenHeight * (isIpad ? 0.008 : 0.006),
    },
    scannedItemDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scannedItemQuantity: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#666',
    },
    unitSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: screenWidth * (isIpad ? 0.02 : 0.03),
        paddingVertical: screenHeight * (isIpad ? 0.006 : 0.005),
        borderRadius: screenWidth * 0.02,
    },
    unitText: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#2094F3',
        fontWeight: '500',
        marginRight: screenWidth * 0.01,
    },
    scannerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: screenHeight * (isIpad ? 0.025 : 0.02),
    },
    noItemsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: screenHeight * (isIpad ? 0.08 : 0.06),
    },
    noItemsText: {
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        color: '#999',
        marginTop: screenHeight * (isIpad ? 0.02 : 0.015),
    },
    // addButton: {
    //     backgroundColor: '#007bff',
    //     padding: 12,
    //     borderRadius: 25,
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     marginRight: 10,
    // },
    scanButton: {
        backgroundColor: '#28a745',
        padding: 12,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
    },

    actionButtonText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600'
    },
    optionsModalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        alignSelf: 'center',
    },

    optionsModalTitle: {
        fontSize: isIpad ? 22 : 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 5,
    },

    optionsModalSubtitle: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
    },

    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },

    optionIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },

    optionTextContainer: {
        flex: 1,
    },

    optionTitle: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },

    optionDescription: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
    },

    cancelOptionButton: {
        marginTop: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },

    cancelOptionText: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        fontWeight: '500',
    },

    // Import Modal Styles
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
        fontSize: isIpad ? 24 : 20,
        fontWeight: 'bold',
        marginTop: 5,
        marginBottom: 2,
    },

    summaryLabel: {
        fontSize: isIpad ? 14 : 12,
        fontWeight: '500',
    },

    importHelpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F4F8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },

    importHelpText: {
        flex: 1,
        marginLeft: 8,
        fontSize: isIpad ? 14 : 12,
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
        fontSize: isIpad ? 16 : 14,
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
        fontSize: isIpad ? 11 : 10,
        color: '#fff',
        fontWeight: 'bold',
    },

    importPreviewDetails: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
    },

    quantityUpdate: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },

    quantityUpdateText: {
        fontSize: isIpad ? 13 : 11,
        color: '#666',
    },

    quantityUpdateNew: {
        fontSize: isIpad ? 13 : 11,
        color: '#333',
        fontWeight: '600',
    },

    duplicateNote: {
        fontSize: isIpad ? 11 : 10,
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
        fontSize: isIpad ? 14 : 12,
        color: '#666',
    },

    importButton: {
        backgroundColor: '#4CAF50',
    },

    importButtonText: {
        color: '#fff',
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
    },

    templateLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        paddingVertical: 8,
    },

    templateLinkText: {
        marginLeft: 8,
        fontSize: isIpad ? 14 : 12,
        color: '#2094F3',
        fontWeight: '500',
    },
});

export default ManageSuppliesScreen;
