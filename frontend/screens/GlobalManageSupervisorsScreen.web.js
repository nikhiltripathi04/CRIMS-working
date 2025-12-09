import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import {
    IoArrowBack,
    IoAddCircleOutline,
    IoPersonOutline,
    IoBriefcaseOutline,
    IoKeyOutline,
    IoCloseOutline,
    IoCheckmarkCircleOutline,
    IoEyeOutline,
    IoEyeOffOutline,
    IoSearchOutline,
    IoRefresh,
    IoChevronForward
} from 'react-icons/io5';

const GlobalManageSupervisorsScreen = () => {
    const navigation = useNavigation();
    const { API_BASE_URL, user, token } = useAuth();

    // Data States
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState('');

    // Modal States
    const [modalVisible, setModalVisible] = useState(false);
    const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
    const [selectedSupervisor, setSelectedSupervisor] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);

    // --- Fetch Logic ---
    const fetchSupervisors = useCallback(async () => {
        if (!user || !user.id) return;

        setRefreshing(true);
        // Only show full page loader on initial load
        if (supervisors.length === 0) setLoading(true);

        try {
            const response = await axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`);
            if (response.data.success) {
                setSupervisors(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching supervisors:', error);
            alert('Failed to fetch supervisors. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, API_BASE_URL, supervisors.length]);

    useEffect(() => {
        fetchSupervisors();
    }, [fetchSupervisors]);

    // --- Action Logic ---
    const resetForm = () => {
        setFormData({ name: '', username: '', password: '' });
        setShowPassword(false);
    };

    const createSupervisor = async () => {
        if (!formData.username || !formData.password) {
            alert('Please enter username and password');
            return;
        }

        if (!user || !user.id) {
            alert('You must be logged in to create a supervisor');
            return;
        }

        try {
            setCreateLoading(true);
            const response = await axios.post(`${API_BASE_URL}/api/auth/create-supervisor`, {
                username: formData.username,
                password: formData.password,
                fullName: formData.name,
                adminId: user.id
            });

            if (response.data.success) {
                await fetchSupervisors();

                setSelectedSupervisor({
                    username: formData.username,
                    password: formData.password,
                    _id: response.data.data.id,
                    isNew: true
                });

                setCredentialsModalVisible(true);
                setModalVisible(false);
                resetForm();
            }
        } catch (error) {
            console.error('Error creating supervisor:', error);
            alert(error.response?.data?.message || 'Failed to create supervisor');
        } finally {
            setCreateLoading(false);
        }
    };

    // --- Filtering ---
    const filteredSupervisors = supervisors.filter(sup =>
        sup.username.toLowerCase().includes(query.toLowerCase())
    );

    if (loading && !refreshing) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Loading Supervisors...</p>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={() => navigation.goBack()} style={styles.backButton}>
                        <IoArrowBack size={20} />
                    </button>
                    <div>
                        <h1 style={styles.title}>Manage Supervisors</h1>
                        <span style={styles.subtitle}>Global List</span>
                    </div>
                </div>

                <div style={styles.headerRight}>
                    <div style={styles.searchContainer}>
                        <IoSearchOutline color="#666" size={18} />
                        <input
                            type="text"
                            placeholder="Search supervisors..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>

                    <button onClick={fetchSupervisors} disabled={refreshing} style={styles.iconButton} title="Refresh">
                        <IoRefresh size={22} className={refreshing ? 'spin' : ''} />
                    </button>

                    <button
                        style={styles.primaryButton}
                        onClick={() => {
                            setModalVisible(true);
                            resetForm();
                        }}
                    >
                        <IoAddCircleOutline size={20} style={{ marginRight: '8px' }} />
                        Create New
                    </button>
                </div>
            </header>

            {/* Content */}
            <main style={styles.content}>
                <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                        <h2 style={styles.panelTitle}>All Supervisors</h2>
                        <span style={styles.countBadge}>{filteredSupervisors.length}</span>
                    </div>

                    <div style={styles.listContainer}>
                        {filteredSupervisors.map(sup => (
                            <div
                                key={sup._id}
                                style={styles.listItem}
                                onClick={() => navigation.navigate('SupervisorDetail', { supervisor: sup })}
                            >
                                <div style={styles.listIcon}>
                                    <IoBriefcaseOutline size={24} color="#6610f2" />
                                </div>
                                <div style={styles.listContent}>
                                    <div style={styles.listTitle}>{sup.username}</div>
                                    <div style={styles.listSubtitle}>
                                        {sup.assignedSites && sup.assignedSites.length > 0
                                            ? `Assigned to ${sup.assignedSites.length} site(s): ${sup.assignedSites.map(s => s.siteName).join(', ')}`
                                            : 'No sites assigned'}
                                    </div>
                                </div>
                                <div style={styles.listActions}>
                                    <IoChevronForward size={20} color="#ccc" />
                                </div>
                            </div>
                        ))}

                        {filteredSupervisors.length === 0 && (
                            <div style={styles.emptyState}>
                                <IoPersonOutline size={48} color="#ccc" style={{ marginBottom: '10px' }} />
                                <p>No supervisors found matching your search.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Create Modal */}
            {modalVisible && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Create New Supervisor</h3>
                            <button onClick={() => setModalVisible(false)} style={styles.closeButton}>
                                <IoCloseOutline size={24} />
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Name</label>
                                <div style={styles.inputWrapper}>
                                    <IoPersonOutline style={styles.inputIcon} />
                                    <input
                                        type="text"
                                        style={styles.input}
                                        placeholder="Enter full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Username</label>
                                <div style={styles.inputWrapper}>
                                    <IoPersonOutline style={styles.inputIcon} />
                                    <input
                                        type="text"
                                        style={styles.input}
                                        placeholder="Enter username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Password</label>
                                <div style={styles.inputWrapper}>
                                    <IoKeyOutline style={styles.inputIcon} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        style={styles.input}
                                        placeholder="Enter password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                    >
                                        {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button
                                onClick={() => setModalVisible(false)}
                                style={styles.secondaryButton}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createSupervisor}
                                disabled={createLoading}
                                style={{ ...styles.primaryButton, opacity: createLoading ? 0.7 : 1 }}
                            >
                                {createLoading ? 'Creating...' : 'Create Supervisor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Credentials Modal */}
            {credentialsModalVisible && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <div style={{ ...styles.modalBody, textAlign: 'center', padding: '40px 20px' }}>
                            <IoCheckmarkCircleOutline size={60} color="#28a745" style={{ marginBottom: '20px' }} />
                            <h3 style={{ ...styles.modalTitle, marginBottom: '10px' }}>Supervisor Created!</h3>
                            <p style={{ color: '#666', marginBottom: '30px' }}>
                                Please save these credentials now. The password will not be visible again.
                            </p>

                            <div style={styles.credentialsBox}>
                                <div style={styles.credentialRow}>
                                    <span style={styles.credLabel}>Username:</span>
                                    <span style={styles.credValue}>{selectedSupervisor?.username}</span>
                                </div>
                                <div style={styles.credentialRow}>
                                    <span style={styles.credLabel}>Password:</span>
                                    <span style={styles.credValue}>{selectedSupervisor?.password}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setCredentialsModalVisible(false)}
                                style={{ ...styles.primaryButton, width: '100%', marginTop: '20px' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f4f6f9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    loadingContainer: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f4f6f9',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e0e0e0',
        borderTop: '4px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        marginTop: '15px',
        color: '#666',
        fontSize: '16px',
    },
    header: {
        backgroundColor: '#ffffff',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        zIndex: 10,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    backButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        color: '#555',
        transition: 'background 0.2s',
    },
    title: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#333',
        margin: 0,
    },
    subtitle: {
        fontSize: '13px',
        color: '#888',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
    },
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f1f3f5',
        padding: '8px 12px',
        borderRadius: '8px',
        width: '250px',
    },
    searchInput: {
        border: 'none',
        background: 'transparent',
        marginLeft: '8px',
        outline: 'none',
        width: '100%',
        fontSize: '14px',
    },
    iconButton: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#555',
        padding: '8px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.2s',
    },
    content: {
        flex: 1,
        padding: '30px',
        overflowY: 'auto',
        maxWidth: '1000px',
        width: '100%',
        margin: '0 auto',
    },
    panel: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid #eee',
        overflow: 'hidden',
    },
    panelHeader: {
        padding: '15px 20px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fafafa',
    },
    panelTitle: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#444',
        margin: 0,
    },
    countBadge: {
        backgroundColor: '#6610f2',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 'bold',
        padding: '2px 8px',
        borderRadius: '10px',
    },
    listContainer: {
        padding: '15px',
    },
    listItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '10px',
        border: '1px solid #f5f5f5',
        transition: 'background 0.2s',
        backgroundColor: '#fff',
        cursor: 'pointer',
        ':hover': {
            backgroundColor: '#f9f9f9',
        }
    },
    listIcon: {
        backgroundColor: '#f0f2f5',
        width: '48px',
        height: '48px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '15px',
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
    },
    listSubtitle: {
        fontSize: '14px',
        color: '#888',
        marginTop: '4px',
    },
    listActions: {
        display: 'flex',
        gap: '8px',
    },
    btnGhost: {
        background: 'none',
        border: '1px solid #eee',
        borderRadius: '6px',
        padding: '8px',
        cursor: 'pointer',
        color: '#666',
        display: 'flex',
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px',
        color: '#999',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    // Modal Styles
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '450px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        overflow: 'hidden',
    },
    modalHeader: {
        padding: '20px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#333',
        margin: 0,
    },
    closeButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#999',
        padding: '4px',
    },
    modalBody: {
        padding: '20px',
    },
    inputGroup: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#555',
    },
    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '0 12px',
        height: '42px',
        backgroundColor: '#f9f9f9',
    },
    inputIcon: {
        color: '#888',
        marginRight: '10px',
        fontSize: '18px',
    },
    input: {
        border: 'none',
        background: 'transparent',
        flex: 1,
        height: '100%',
        outline: 'none',
        fontSize: '15px',
    },
    eyeButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#888',
        display: 'flex',
        alignItems: 'center',
    },
    modalFooter: {
        padding: '20px',
        borderTop: '1px solid #eee',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
    },
    secondaryButton: {
        backgroundColor: '#f1f3f5',
        color: '#333',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    credentialsBox: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        padding: '15px',
        textAlign: 'left',
    },
    credentialRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        paddingBottom: '10px',
        borderBottom: '1px solid #eee',
    },
    credLabel: {
        color: '#666',
        fontSize: '14px',
    },
    credValue: {
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'monospace',
        fontSize: '15px',
    },
};

export default GlobalManageSupervisorsScreen;
