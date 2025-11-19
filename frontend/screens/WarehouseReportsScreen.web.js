import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { IoArrowBack } from 'react-icons/io5';

// Mock useAuth for demonstration; replace with your actual web-compatible context
const useAuth = () => ({
    API_BASE_URL: 'http://localhost:8080', // Example URL
    user: { id: 'web-user-id' }
});

// Mock component for the web: replace with a proper link/button component

// Helper for currency formatting
const formatCurrency = (value, unit) => `${unit}${parseFloat(value).toFixed(2)}`;

const WarehouseReportsScreen = ({ route }) => {
    // Note: For a true web app with React Router, route params might come from 
    // `useParams()` or `useLocation()`. We'll assume the same structure as RN for now.
    const navigation = useNavigation();
    const warehouse = route?.params?.warehouse || { 
        _id: 'mock-wh-id', 
        warehouseName: 'Mock Web Warehouse',
        supplies: [
            { _id: 's1', itemName: 'Web Cement', quantity: 150, unit: 'bags', currentPrice: 50 },
            { _id: 's2', itemName: 'Web Steel Rods', quantity: 80, unit: 'pcs', currentPrice: 75 }
        ]
    };
    const managerId = route?.params?.managerId || 'mock-manager-id';

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
            // The API call is the same, assuming axios works in the web environment
            // const response = await axios.get(
            //     `${API_BASE_URL}/api/warehouses/${warehouse._id}/reports?managerId=${managerId}`
            // );

            // if (response.data.success) {
            //     setReports(response.data.data);
            // }

            // Using mock data from the error block for demonstration
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
        } catch (error) {
            console.error('Fetch reports error:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderRecentTransfer = (item) => (
        <div key={item.id} style={styles.transferCard}>
            <div style={styles.transferHeader}>
                <span style={styles.transferItem}>{item.itemName}</span>
                <span style={styles.transferValue}>{formatCurrency(item.value, currencyUnit)}</span>
            </div>
            <span style={styles.transferDetails}>
                {item.quantity} {item.unit} &rarr; {item.transferredTo}
            </span>
            <span style={styles.transferDate}>
                {new Date(item.date).toLocaleDateString()}
            </span>
        </div>
    );

    const renderSupplySummary = (item) => (
        <div key={item._id} style={styles.supplyRow}>
            <span style={styles.supplyName}>{item.itemName}</span>
            <span style={styles.supplyQuantity}>{item.quantity} {item.unit}</span>
            <span style={styles.supplyValue}>
                {formatCurrency(((item.currentPrice || item.entryPrice || 0) * item.quantity), currencyUnit)}
            </span>
        </div>
    );
    
    // Determine max transfers for chart scaling
    const maxTransfers = Math.max(...reports.monthlyTransfers.map(m => m.transfers), 1);
    const chartHeightScale = 150; // Max height in pixels for the tallest bar

    return (
        <div style={styles.container}>
            {/* Standard web styling for the gradient background */}
            <div style={styles.gradient}>
                <div style={styles.header}>
                    <button onClick={() => navigation.goBack()} style={styles.backButton}>
                        <IoArrowBack size={24} color="#FFFFFF" />
                    </button>

                    <div style={styles.headerContent}>
                        <span style={styles.title}>Warehouse Reports</span>
                        <span style={styles.subtitle}>{warehouse.warehouseName}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Scrollable */}
            <div style={styles.scrollView}>
                {loading && <div style={{ textAlign: 'center', padding: '10px' }}>Loading reports...</div>}
                
                {/* Stats Cards */}
                <div style={styles.statsContainer}>
                    <div style={styles.statCard}>
                        {/* Using simple text for icons */}
                        <div style={{...styles.icon, color: '#E69138'}}>&#9733;</div> 
                        <span style={styles.statNumber}>{reports.totalSupplies}</span>
                        <span style={styles.statLabel}>Total Supplies</span>
                    </div>

                    <div style={styles.statCard}>
                        <div style={{...styles.icon, color: '#28a745'}}>&#x20B9;</div> 
                        <span style={styles.statNumber}>{formatCurrency(reports.totalValue, currencyUnit)}</span>
                        <span style={styles.statLabel}>Total Value</span>
                    </div>

                    <div style={styles.statCard}>
                        <div style={{...styles.icon, color: '#1976D2'}}>&#x21C6;</div> 
                        <span style={styles.statNumber}>{reports.totalTransfers}</span>
                        <span style={styles.statLabel}>Total Transfers</span>
                    </div>
                </div>

                {/* Recent Transfers */}
                <div style={styles.section}>
                    <span style={styles.sectionTitle}>Recent Transfers</span>
                    <div style={styles.transfersList}>
                        {reports.recentTransfers.map(renderRecentTransfer)}
                    </div>
                </div>

                {/* Supply Summary */}
                <div style={styles.section}>
                    <span style={styles.sectionTitle}>Supply Summary</span>
                    <div style={styles.summaryTable}>
                        <div style={styles.tableHeader}>
                            <span style={{...styles.headerText, textAlign: 'left', paddingLeft: '10px'}}>Item</span>
                            <span style={{...styles.headerText, textAlign: 'right'}}>Quantity</span>
                            <span style={{...styles.headerText, textAlign: 'right', paddingRight: '10px'}}>Value</span>
                        </div>
                        {reports.supplySummary.map(renderSupplySummary)}
                    </div>
                </div>

                {/* Monthly Transfer Chart */}
                <div style={styles.section}>
                    <span style={styles.sectionTitle}>Monthly Transfer Trend</span>
                    <div style={styles.chartContainer}>
                        {reports.monthlyTransfers.map((month, index) => (
                            <div key={index} style={styles.chartBar}>
                                <div 
                                    style={{
                                        ...styles.bar,
                                        height: `${(month.transfers / maxTransfers) * chartHeightScale}px` // Scale height dynamically
                                    }} 
                                />
                                <span style={styles.chartLabel}>{month.month}</span>
                                <span style={styles.chartValue}>{month.transfers}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


const styles = {
    // --- Global/Container Styles ---
    container: {
        height: '100vh', // Ensures the container fills the viewport height
        display: 'flex',
        flexDirection: 'column',
    },
    gradient: {
        background: 'linear-gradient(to bottom, #E69138, #D48806)',
        paddingTop: '20px',
        // Note: You may need to reset margin/padding on the <body> element in your global CSS
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 5vw 15px',
    },
    backButton: {
        marginRight: '15px',
        padding: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '50%',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        cursor: 'pointer',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0, // Prevent shrinking on small screens
    },
    headerContent: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        display: 'block',
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '0.9rem',
        fontWeight: '400',
        display: 'block',
    },
    
    // *** FIX: This is the scrollable content area ***
    scrollView: {
        flex: 1, // Crucial: Takes up all remaining vertical space
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: '30px',
        borderTopRightRadius: '30px',
        paddingTop: '20px',
        overflowY: 'auto', // Enables vertical scrolling when content overflows
        boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.1)',
        // No minHeight needed
    },
    
    // --- Stats Cards ---
    statsContainer: {
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0 5vw',
        marginBottom: '30px',
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        padding: '15px',
        borderRadius: '15px',
        alignItems: 'center',
        width: 'calc(33.33% - 20px)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'center',
    },
    icon: {
        fontSize: '2rem',
    },
    statNumber: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#333',
        marginTop: '8px',
        marginBottom: '4px',
    },
    statLabel: {
        fontSize: '0.8rem',
        color: '#666',
        lineHeight: '1.2',
    },
    
    // --- Sections ---
    section: {
        marginBottom: '30px',
        padding: '0 5vw',
    },
    sectionTitle: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '15px',
        display: 'block',
    },

    // --- Recent Transfers (Horizontal Scroll Fix) ---
    transfersList: {
        padding: '10px 0',
        display: 'flex',
        overflowX: 'auto', 
        gap: '12px', // FIX: Uses gap instead of margin on card for clean scroll ending
        paddingRight: '5vw', // Ensures a gap at the end
    },
    transferCard: {
        backgroundColor: '#FFFFFF',
        padding: '16px',
        borderRadius: '12px',
        minWidth: '280px', 
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        // FIX: Removed marginRight, replaced by gap on parent
    },
    transferHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },
    transferItem: {
        fontSize: '1rem',
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    transferValue: {
        fontSize: '1rem',
        fontWeight: 'bold',
        color: '#28a745',
    },
    transferDetails: {
        fontSize: '0.9rem',
        color: '#666',
        marginBottom: '4px',
        display: 'block',
    },
    transferDate: {
        fontSize: '0.7rem',
        color: '#999',
        display: 'block',
    },

    // --- Supply Summary (Table Alignment Fix) ---
    summaryTable: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    tableHeader: {
        display: 'flex',
        backgroundColor: '#F0F0F0',
        padding: '12px 16px',
    },
    // FIX: Left align Item, Right align Quantity/Value
    headerText: {
        flex: 1,
        fontSize: '0.8rem',
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'left', // Default align, will be overridden below
    },
    supplyRow: {
        display: 'flex',
        padding: '12px 16px',
        borderBottom: '1px solid #F0F0F0',
    },
    supplyName: {
        flex: 1,
        fontSize: '0.9rem',
        color: '#333',
        textAlign: 'left', // Item Name aligned Left
        paddingLeft: '10px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    supplyQuantity: {
        flex: 1,
        fontSize: '0.9rem',
        color: '#666',
        textAlign: 'right', // Quantity aligned Right
    },
    supplyValue: {
        flex: 1,
        fontSize: '0.9rem',
        color: '#28a745',
        fontWeight: 'bold',
        textAlign: 'right', // Value aligned Right
        paddingRight: '10px',
    },
    
    // --- Monthly Transfer Chart ---
    chartContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        height: '250px', 
    },
    chartBar: {
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column-reverse', 
    },
    bar: {
        width: '30px',
        backgroundColor: '#E69138',
        borderRadius: '4px 4px 0 0',
        marginBottom: '8px',
        transition: 'height 0.3s ease',
    },
    chartLabel: {
        fontSize: '0.75rem',
        color: '#666',
        marginBottom: '4px',
    },
    chartValue: {
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: '#333',
    },
};

// To fully fix the table alignment in the summary:
// You must adjust the `headerText` usage in the JSX to apply specific alignment styles:
/* <div style={styles.tableHeader}>
        <span style={{...styles.headerText, textAlign: 'left', paddingLeft: '10px'}}>Item</span>
        <span style={{...styles.headerText, textAlign: 'right'}}>Quantity</span>
        <span style={{...styles.headerText, textAlign: 'right', paddingRight: '10px'}}>Value</span>
    </div>
*/
export default WarehouseReportsScreen;