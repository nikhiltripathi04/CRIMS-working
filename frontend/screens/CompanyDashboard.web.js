// CompanyDashboard.web.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import {
    IoLogOutOutline,
    IoPersonAddOutline,
    IoRefresh,
    IoTrashOutline,
    IoShieldCheckmarkOutline,
    IoKeyOutline,
    IoSearchOutline,
    IoCloseOutline,
    IoBusiness
} from 'react-icons/io5';

export default function CompanyDashboardWeb() {
    const { user, API_BASE_URL, logout, token } = useAuth();
    const navigation = useNavigation();

    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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

    // Change Password State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_BASE_URL}/api/auth/company-admins?ownerId=${user.id}`, config);

            if (response.data.success) {
                setAdmins(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching admins:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                // Handle unauthorized if needed
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

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            window.alert('Please fill in all fields');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            window.alert('New passwords do not match');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            window.alert('New password must be at least 6 characters long');
            return;
        }

        try {
            setChangingPassword(true);
            const response = await axios.post(`${API_BASE_URL}/api/auth/change-password`, {
                userId: user.id,
                oldPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            if (response.data.success) {
                window.alert('Password changed successfully!');
                setShowPasswordModal(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            console.error('Change password error:', error);
            window.alert(error.response?.data?.message || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDeleteAdmin = async (adminId, adminUsername) => {
        if (!window.confirm(`Are you sure you want to delete admin "${adminUsername}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.delete(
                `${API_BASE_URL}/api/auth/company-admins/${adminId}?ownerId=${user.id}`,
                config
            );

            if (response.data.success) {
                // Determine if we need to show a success message or just refresh
                // window.alert('Admin deleted successfully'); 
                fetchAdmins();
            }
        } catch (error) {
            console.error('Error deleting admin:', error);
            window.alert(error.response?.data?.message || 'Failed to delete admin');
        }
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) logout();
    };

    const filteredAdmins = admins.filter(admin =>
        admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (admin.firstName && admin.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (admin.lastName && admin.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={styles.page}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <div style={styles.logoBox}>
                        <IoBusiness size={24} color="#fff" />
                    </div>
                    <div>
                        <h1 style={styles.title}>Company Portal</h1>
                        <span style={styles.roleBadge}>OWNER DASHBOARD</span>
                    </div>
                </div>

                <div style={styles.headerRight}>
                    <div style={styles.userInfo}>
                        <span style={styles.welcomeText}>Welcome, <span style={{ fontWeight: '600' }}>{user?.firstName}</span></span>
                    </div>
                    <div style={styles.divider}></div>
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        style={styles.iconButton}
                        title="Change Password"
                    >
                        <IoKeyOutline size={20} />
                    </button>
                    <button onClick={handleLogout} style={styles.logoutButton} title="Logout">
                        <IoLogOutOutline size={20} />
                        <span style={{ marginLeft: '6px' }}>Logout</span>
                    </button>
                </div>
            </header>

            <main style={styles.content}>

                {/* Hero / Action Section */}
                <div style={styles.heroSection}>
                    <div style={styles.heroText}>
                        <h2 style={styles.sectionTitle}>Manage Administrators</h2>
                        <p style={styles.sectionSubtitle}>Oversee the access rights and profiles of your company's site administrators.</p>
                    </div>

                    <div style={styles.heroActions}>
                        <div style={styles.searchWrapper}>
                            <IoSearchOutline size={18} style={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search admins..."
                                style={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button style={styles.createButton} onClick={() => setShowCreateModal(true)}>
                            <IoPersonAddOutline size={18} style={{ marginRight: '8px' }} />
                            New Admin
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={styles.loadingState}>
                        <div style={styles.spinner}></div>
                        <p>Loading your team...</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {filteredAdmins.map(admin => (
                            <div key={admin._id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                        <div style={styles.avatar}>
                                            {admin.firstName ? admin.firstName.charAt(0).toUpperCase() : admin.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ overflow: 'hidden' }}>
                                            <h3 style={styles.cardTitle}>{admin.username}</h3>
                                            <div style={styles.cardBadge}>ADMINISTRATOR</div>
                                        </div>
                                    </div>
                                    <button
                                        style={styles.deleteButton}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteAdmin(admin._id, admin.username); }}
                                        title="Delete Admin"
                                    >
                                        <IoTrashOutline size={18} />
                                    </button>
                                </div>

                                <div style={styles.cardBody}>
                                    <div style={styles.infoGroup}>
                                        <label style={styles.infoLabel}>Full Name</label>
                                        <div style={styles.infoValue}>
                                            {admin.firstName} {admin.lastName}
                                            {(!admin.firstName && !admin.lastName) && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not set</span>}
                                        </div>
                                    </div>

                                    <div style={styles.dividerHorizontal}></div>

                                    <div style={styles.infoGroup}>
                                        <label style={styles.infoLabel}>Email Address</label>
                                        <div style={styles.infoValue}>{admin.email}</div>
                                    </div>

                                    <div style={styles.infoGroup}>
                                        <label style={styles.infoLabel}>Phone</label>
                                        <div style={styles.infoValue}>
                                            {admin.phoneNumber || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not provided</span>}
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.cardFooter}>
                                    <button style={styles.cardActionBtn} title="View Details (Coming Soon)" disabled>
                                        View Profile
                                    </button>
                                </div>
                            </div>
                        ))}

                        {filteredAdmins.length === 0 && (
                            <div style={styles.emptyState}>
                                <IoShieldCheckmarkOutline size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                                <h3>No administrators found</h3>
                                <p>Get started by adding a new administrator to manage your sites.</p>
                                <button style={styles.secondaryButton} onClick={() => setShowCreateModal(true)}>
                                    Add Your First Admin
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Create Modal Overlay */}
                {showCreateModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <div style={styles.modalHeader}>
                                <h2>Create New Admin</h2>
                                <button onClick={() => setShowCreateModal(false)} style={styles.closeBtn}><IoCloseOutline size={24} /></button>
                            </div>
                            <form onSubmit={handleCreateAdmin}>
                                <div style={styles.modalBody}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Username <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            style={styles.input}
                                            value={newAdmin.username}
                                            onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                                            required
                                            placeholder="e.g. site_admin_01"
                                        />
                                    </div>
                                    <div style={styles.row}>
                                        <div style={styles.halfInput}>
                                            <label style={styles.label}>First Name</label>
                                            <input
                                                style={styles.input}
                                                value={newAdmin.firstName}
                                                onChange={e => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                                                placeholder="John"
                                            />
                                        </div>
                                        <div style={styles.halfInput}>
                                            <label style={styles.label}>Last Name</label>
                                            <input
                                                style={styles.input}
                                                value={newAdmin.lastName}
                                                onChange={e => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Email Address <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            style={styles.input}
                                            type="email"
                                            value={newAdmin.email}
                                            onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                            required
                                            placeholder="admin@company.com"
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Password <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            style={styles.input}
                                            type="password"
                                            value={newAdmin.password}
                                            onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                            required
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Phone Number</label>
                                        <input
                                            style={styles.input}
                                            value={newAdmin.phoneNumber}
                                            onChange={e => setNewAdmin({ ...newAdmin, phoneNumber: e.target.value })}
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>

                                <div style={styles.modalFooter}>
                                    <button type="button" style={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>Cancel</button>
                                    <button type="submit" style={styles.submitBtn} disabled={creating}>
                                        {creating ? <span className="spin">Creating...</span> : 'Create Admin'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Change Password Modal */}
                {showPasswordModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <div style={styles.modalHeader}>
                                <h2>Change Password</h2>
                                <button onClick={() => setShowPasswordModal(false)} style={styles.closeBtn}><IoCloseOutline size={24} /></button>
                            </div>
                            <form onSubmit={handleChangePassword}>
                                <div style={styles.modalBody}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Current Password <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            style={styles.input}
                                            type="password"
                                            value={passwordForm.currentPassword}
                                            onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>New Password <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            style={styles.input}
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Confirm New Password <span style={{ color: 'red' }}>*</span></label>
                                        <input
                                            style={styles.input}
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={styles.modalFooter}>
                                    <button type="button" style={styles.cancelBtn} onClick={() => setShowPasswordModal(false)}>Cancel</button>
                                    <button type="submit" style={styles.submitBtn} disabled={changingPassword}>
                                        {changingPassword ? <span className="spin">Updating...</span> : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>

            {/* Global Styles for Animations */}
            <style>{`
                .spin { animation: spin 1s linear infinite; display: inline-block; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

                body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
                button { transition: all 0.2s ease; }
                button:active { transform: scale(0.98); }
            `}</style>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc', // Slate 50
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#1e293b',
    },
    header: {
        backgroundColor: '#ffffff',
        padding: '0 30px',
        height: '70px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    logoBox: {
        width: '36px', height: '36px',
        backgroundColor: '#0f172a', // Slate 900
        borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    title: {
        fontSize: '18px', fontWeight: '700', margin: 0, color: '#0f172a', lineHeight: '1.2'
    },
    roleBadge: {
        fontSize: '11px', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px'
    },
    headerRight: {
        display: 'flex', alignItems: 'center', gap: '12px'
    },
    userInfo: {
        marginRight: '8px',
        display: 'none',
        '@media (min-width: 768px)': { display: 'block' } // Only show on desktop
    },
    welcomeText: {
        fontSize: '14px', color: '#334155'
    },
    divider: {
        width: '1px', height: '24px', backgroundColor: '#e2e8f0'
    },
    iconButton: {
        background: 'transparent', border: 'none', borderRadius: '8px', padding: '8px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#64748b',
        ':hover': { backgroundColor: '#f1f5f9' }
    },
    logoutButton: {
        background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 16px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444',
        fontWeight: '600', fontSize: '14px'
    },
    content: {
        padding: '40px',
        maxWidth: '1400px',
        margin: '0 auto',
    },
    heroSection: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px',
        flexWrap: 'wrap', gap: '20px'
    },
    heroText: {
        maxWidth: '600px',
    },
    sectionTitle: {
        fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0',
    },
    sectionSubtitle: {
        color: '#64748b', margin: 0, fontSize: '16px', lineHeight: '1.5'
    },
    heroActions: {
        display: 'flex', alignItems: 'center', gap: '16px'
    },
    searchWrapper: {
        position: 'relative', display: 'flex', alignItems: 'center'
    },
    searchIcon: {
        position: 'absolute', left: '12px', color: '#94a3b8'
    },
    searchInput: {
        padding: '10px 16px 10px 36px', borderRadius: '10px', border: '1px solid #e2e8f0',
        width: '240px', fontSize: '14px', outline: 'none', backgroundColor: '#fff',
        transition: 'border-color 0.2s',
        color: '#0f172a'
    },
    createButton: {
        backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px',
        fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)'
    },
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px'
    },
    card: {
        backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        border: '1px solid #f1f5f9',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        ':hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }
    },
    cardHeader: {
        display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px',
    },
    avatar: {
        width: '56px', height: '56px', backgroundColor: '#f1f5f9', color: '#0f172a', borderRadius: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700'
    },
    cardTitle: {
        margin: '0 0 4px 0', fontSize: '18px', color: '#0f172a', fontWeight: '700',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
    },
    cardBadge: {
        fontSize: '11px', color: '#059669', backgroundColor: '#d1fae5', padding: '2px 8px',
        borderRadius: '12px', fontWeight: '700', display: 'inline-block', letterSpacing: '0.5px'
    },
    cardBody: {
        display: 'flex', flexDirection: 'column', gap: '12px', flex: 1
    },
    infoGroup: {
        display: 'flex', flexDirection: 'column'
    },
    infoLabel: {
        fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '2px', textTransform: 'uppercase'
    },
    infoValue: {
        fontSize: '15px', color: '#334155', fontWeight: '500'
    },
    dividerHorizontal: {
        height: '1px', backgroundColor: '#f1f5f9', width: '100%', margin: '4px 0'
    },
    cardFooter: {
        marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9'
    },
    cardActionBtn: {
        width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0',
        backgroundColor: '#fff', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'not-allowed'
    },
    emptyState: {
        gridColumn: '1 / -1', textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '16px',
        border: '1px dashed #cbd5e0', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center'
    },
    secondaryButton: {
        marginTop: '16px', backgroundColor: '#fff', border: '1px solid #cbd5e0', padding: '10px 20px',
        borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#475569'
    },
    loadingState: {
        textAlign: 'center', paddingTop: '60px', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center'
    },
    spinner: {
        width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTop: '3px solid #0f172a',
        borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px'
    },

    // Modal Styles
    modalOverlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
    },
    modalContent: {
        backgroundColor: '#fff', borderRadius: '20px', width: '500px', maxWidth: '95%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
        animation: 'slideUp 0.3s ease-out'
    },
    modalHeader: {
        padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    closeBtn: {
        background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex'
    },
    modalBody: {
        padding: '24px'
    },
    formGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px'
    },
    input: {
        width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e0',
        fontSize: '15px', color: '#1e293b', outline: 'none', transition: 'border-color 0.2s',
        boxSizing: 'border-box'
    },
    row: {
        display: 'flex', gap: '16px'
    },
    halfInput: {
        flex: 1, marginBottom: '20px'
    },
    modalFooter: {
        padding: '20px 24px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc',
        display: 'flex', justifyContent: 'flex-end', gap: '12px'
    },
    submitBtn: {
        backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px 24px',
        borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
    },
    cancelBtn: {
        backgroundColor: '#fff', color: '#64748b', border: '1px solid #cbd5e0', padding: '10px 16px',
        borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px'
    },
    deleteButton: {
        background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '8px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ef4444', transition: 'background-color 0.2s',
        ':hover': { backgroundColor: '#fecaca' }
    }
};
