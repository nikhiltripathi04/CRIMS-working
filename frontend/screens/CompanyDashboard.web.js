import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import {
    IoLogOutOutline,
    IoPersonAddOutline,
    IoRefresh,
    IoTrashOutline,
    IoShieldCheckmarkOutline
} from 'react-icons/io5';

export default function CompanyDashboardWeb() {
    const { user, API_BASE_URL, logout, token } = useAuth();
    const navigation = useNavigation();

    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New Admin Form State
    const [newAdmin, setNewAdmin] = useState({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: ''
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } }; // Ensure token is passed if middleware checks it, though query param ownerId is primary
            const response = await axios.get(`${API_BASE_URL}/api/auth/company-admins?ownerId=${user.id}`, config);

            if (response.data.success) {
                setAdmins(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching admins:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                // Maybe handle unauthorized
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        if (!newAdmin.username || !newAdmin.password || !newAdmin.email) {
            window.alert('Please fill in required fields');
            return;
        }

        try {
            setCreating(true);
            const payload = {
                ...newAdmin,
                authAdminId: user.id // Pass owner ID
            };

            const response = await axios.post(`${API_BASE_URL}/api/auth/create-admin`, payload);

            if (response.data.success) {
                window.alert(`Admin ${response.data.data.username} created successfully!`);
                setShowCreateModal(false);
                setNewAdmin({ username: '', password: '', email: '', firstName: '', lastName: '', phoneNumber: '' });
                fetchAdmins();
            }
        } catch (error) {
            console.error('Create admin error:', error);
            window.alert(error.response?.data?.message || 'Failed to create admin');
        } finally {
            setCreating(false);
        }
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) logout();
    };

    return (
        <div style={styles.page}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <div style={styles.logoBox}>
                        <IoShieldCheckmarkOutline size={28} color="#fff" />
                    </div>
                    <div>
                        <h1 style={styles.title}>Company Dashboard</h1>
                        <span style={styles.roleBadge}>OWNER</span>
                    </div>
                </div>

                <div style={styles.headerRight}>
                    <span style={{ marginRight: '15px' }}>Welcome, {user?.firstName}</span>
                    <button onClick={handleLogout} style={styles.logoutButton} title="Logout">
                        <IoLogOutOutline size={22} color="#fff" />
                    </button>
                </div>
            </header>

            <main style={styles.content}>
                <div style={styles.sectionHeader}>
                    <div>
                        <h2 style={styles.sectionTitle}>Manage Admins</h2>
                        <p style={styles.sectionSubtitle}>Create and manage administrators for your company sites.</p>
                    </div>
                    <button style={styles.createButton} onClick={() => setShowCreateModal(true)}>
                        <IoPersonAddOutline size={20} style={{ marginRight: '8px' }} />
                        Create New Admin
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>
                ) : (
                    <div style={styles.grid}>
                        {admins.map(admin => (
                            <div key={admin._id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div style={styles.avatar}>{admin.firstName.charAt(0)}</div>
                                    <div>
                                        <h3 style={styles.cardTitle}>{admin.username}</h3>
                                        <span style={styles.cardRole}>Admin</span>
                                    </div>
                                </div>
                                <div style={styles.cardBody}>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Name:</span>
                                        <span>{admin.firstName} {admin.lastName}</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Email:</span>
                                        <span>{admin.email}</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.label}>Phone:</span>
                                        <span>{admin.phoneNumber}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {admins.length === 0 && (
                            <div style={styles.emptyState}>
                                No admins created yet. Click "Create New Admin" to get started.
                            </div>
                        )}
                    </div>
                )}

                {/* Create Modal Overlay */}
                {showCreateModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h2 style={{ marginBottom: '20px' }}>Create New Admin</h2>
                            <form onSubmit={handleCreateAdmin}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Username *</label>
                                    <input
                                        style={styles.input}
                                        value={newAdmin.username}
                                        onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Password *</label>
                                    <input
                                        style={styles.input}
                                        type="password"
                                        value={newAdmin.password}
                                        onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Email *</label>
                                    <input
                                        style={styles.input}
                                        type="email"
                                        value={newAdmin.email}
                                        onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={styles.row}>
                                    <div style={styles.halfInput}>
                                        <label style={styles.label}>First Name</label>
                                        <input
                                            style={styles.input}
                                            value={newAdmin.firstName}
                                            onChange={e => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                                        />
                                    </div>
                                    <div style={styles.halfInput}>
                                        <label style={styles.label}>Last Name</label>
                                        <input
                                            style={styles.input}
                                            value={newAdmin.lastName}
                                            onChange={e => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Phone Number</label>
                                    <input
                                        style={styles.input}
                                        value={newAdmin.phoneNumber}
                                        onChange={e => setNewAdmin({ ...newAdmin, phoneNumber: e.target.value })}
                                    />
                                </div>

                                <div style={styles.modalActions}>
                                    <button type="button" style={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>Cancel</button>
                                    <button type="submit" style={styles.submitBtn} disabled={creating}>
                                        {creating ? 'Creating...' : 'Create Admin'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f4f6f9',
        fontFamily: 'sans-serif',
    },
    header: {
        backgroundColor: '#1a202c', // Darker header for CEO
        color: '#fff',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
    },
    logoBox: {
        width: '40px', height: '40px', backgroundColor: '#e53e3e', borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    title: {
        fontSize: '20px', fontWeight: '700', margin: 0,
    },
    roleBadge: {
        fontSize: '11px', backgroundColor: '#ecc94b', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold'
    },
    headerRight: {
        display: 'flex', alignItems: 'center'
    },
    logoutButton: {
        background: '#e53e3e', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex'
    },
    content: {
        padding: '40px',
        maxWidth: '1200px',
        margin: '0 auto',
    },
    sectionHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'
    },
    sectionTitle: {
        fontSize: '24px', fontWeight: 'bold', color: '#2d3748', margin: 0
    },
    sectionSubtitle: {
        color: '#718096', margin: '5px 0 0 0'
    },
    createButton: {
        backgroundColor: '#3182ce', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px',
        fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center',
        boxShadow: '0 4px 6px rgba(49, 130, 206, 0.3)'
    },
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'
    },
    card: {
        backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
    },
    cardHeader: {
        display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #edf2f7'
    },
    avatar: {
        width: '48px', height: '48px', backgroundColor: '#ebf8ff', color: '#3182ce', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold'
    },
    cardTitle: {
        margin: 0, fontSize: '18px', color: '#2d3748'
    },
    cardRole: {
        fontSize: '12px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px'
    },
    cardBody: {
        display: 'flex', flexDirection: 'column', gap: '10px'
    },
    infoRow: {
        display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#4a5568'
    },
    label: {
        fontWeight: '600', color: '#718096'
    },
    emptyState: {
        gridColumn: '1 / -1', textAlign: 'center', padding: '50px', backgroundColor: '#fff', borderRadius: '12px',
        border: '2px dashed #cbd5e0', color: '#a0aec0', fontSize: '18px'
    },
    modalOverlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
    },
    modalContent: {
        backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '90%',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
    },
    formGroup: {
        marginBottom: '15px'
    },
    input: {
        width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '15px',
        marginTop: '5px'
    },
    row: {
        display: 'flex', gap: '15px'
    },
    halfInput: {
        flex: 1, marginBottom: '15px'
    },
    modalActions: {
        display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'
    },
    submitBtn: {
        backgroundColor: '#3182ce', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer'
    },
    cancelBtn: {
        backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer'
    }
};
