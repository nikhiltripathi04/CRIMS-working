import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// --- Mock Components for Web ---
const ActivityIndicator = () => (
    <div style={styles.spinner}></div>
);

const Alert = {
    alert: (title, message, buttons) => {
        // Simple web confirm for "Delete" actions that usually have buttons
        if (buttons && buttons.length > 1) {
            const result = window.confirm(`${title}\n\n${message}`);
            if (result) {
                const confirmBtn = buttons.find(b => b.style === 'destructive' || b.text === 'Delete' || b.text === 'Yes');
                if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
            }
        } else {
            window.alert(`${title}\n${message}`);
        }
    }
};

const StaffDetailsScreenWeb = ({ route }) => {
    // Handle both route params (from navigation) or direct prop usage if needed
    const initialStaff = route?.params?.staff || {};
    const [staff, setStaff] = useState(initialStaff);
    const [loading, setLoading] = useState(false);
    
    // Edit States
    const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    const { API_BASE_URL, user, token } = useAuth();
    const navigation = useNavigation();

    // --- API Interactions ---

    const fetchStaffDetails = useCallback(async () => {
        if (!staff._id || !token) return;

        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_BASE_URL}/api/staff`, config);
            
            // The API returns all staff, we need to find the specific one
            if (response.data.success) {
                const updatedStaff = response.data.data.find(s => s._id === staff._id);
                if (updatedStaff) {
                    setStaff(updatedStaff);
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL, staff._id, token]);

    const handleUpdateName = async () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        try {
            setSaving(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            // PUT /api/staff/:id
            const res = await axios.put(
                `${API_BASE_URL}/api/staff/${staff._id}`, 
                { fullName: newName }, 
                config
            );

            if (res.data.success) {
                setStaff(prev => ({ ...prev, fullName: newName }));
                setIsEditNameModalOpen(false);
                Alert.alert('Success', 'Staff name updated successfully');
            }
        } catch (error) {
            console.error('Update error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update name');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword.trim()) {
            Alert.alert('Error', 'Password cannot be empty');
            return;
        }

        try {
            setSaving(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.put(
                `${API_BASE_URL}/api/staff/${staff._id}`, 
                { password: newPassword }, 
                config
            );

            if (res.data.success) {
                setIsPasswordModalOpen(false);
                setNewPassword('');
                Alert.alert('Success', 'Password updated successfully');
            }
        } catch (error) {
            console.error('Password update error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update password');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStaff = async () => {
        Alert.alert(
            'Delete Staff Member',
            `Are you sure you want to delete ${staff.fullName}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const config = { headers: { Authorization: `Bearer ${token}` } };
                            await axios.delete(`${API_BASE_URL}/api/staff/${staff._id}`, config);
                            navigation.goBack();
                            // Optional: Trigger a refresh on the previous screen if possible
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete staff member');
                        }
                    }
                }
            ]
        );
    };

    // --- Render Helpers ---

    const renderProfileCard = () => (
        <div style={styles.card}>
            <div style={styles.profileHeader}>
                <div style={styles.avatarLarge}>
                    <span style={styles.avatarText}>
                        {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : 'U'}
                    </span>
                </div>
                <h2 style={styles.profileName}>{staff.fullName}</h2>
                <div style={styles.profileUsername}>@{staff.username}</div>
                <div style={styles.roleBadge}>{staff.role || 'STAFF'}</div>
            </div>

            <div style={styles.divider} />

            <div style={styles.infoRow}>
                <div style={styles.infoLabel}>Created At</div>
                <div style={styles.infoValue}>
                    {new Date(staff.createdAt).toLocaleDateString()}
                </div>
            </div>
            
            <div style={styles.infoRow}>
                <div style={styles.infoLabel}>Staff ID</div>
                <div style={styles.infoValue}>...{staff._id?.slice(-6)}</div>
            </div>
        </div>
    );

    const renderActionsCard = () => (
        <div style={styles.card}>
            <h3 style={styles.cardTitle}>Account Actions</h3>
            
            <div style={styles.actionList}>
                <button 
                    style={styles.actionButton}
                    onClick={() => {
                        setNewName(staff.fullName);
                        setIsEditNameModalOpen(true);
                    }}
                >
                    <div style={styles.actionIcon}>
                        <Ionicons name="create-outline" size={20} color="#007bff" />
                    </div>
                    <div style={styles.actionContent}>
                        <div style={styles.actionTitle}>Edit Details</div>
                        <div style={styles.actionDesc}>Change display name</div>
                    </div>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </button>

                <button 
                    style={styles.actionButton}
                    onClick={() => {
                        setNewPassword('');
                        setIsPasswordModalOpen(true);
                    }}
                >
                    <div style={{...styles.actionIcon, backgroundColor: '#fff3cd'}}>
                        <Ionicons name="key-outline" size={20} color="#856404" />
                    </div>
                    <div style={styles.actionContent}>
                        <div style={styles.actionTitle}>Change Credentials</div>
                        <div style={styles.actionDesc}>Update password</div>
                    </div>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </button>

                <div style={styles.divider} />

                <button 
                    style={styles.deleteButton}
                    onClick={handleDeleteStaff}
                >
                    <Ionicons name="trash-outline" size={20} color="#dc3545" />
                    Delete Staff Member
                </button>
            </div>
        </div>
    );

    // --- Modals ---

    const renderEditNameModal = () => (
        isEditNameModalOpen && (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContainer}>
                    <div style={styles.modalHeader}>
                        <h3 style={styles.modalTitle}>Edit Name</h3>
                        <button style={styles.closeButton} onClick={() => setIsEditNameModalOpen(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </button>
                    </div>
                    <div style={styles.modalBody}>
                        <label style={styles.label}>Full Name</label>
                        <input 
                            style={styles.input}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter full name"
                            autoFocus
                        />
                    </div>
                    <div style={styles.modalFooter}>
                        <button style={styles.btnSecondary} onClick={() => setIsEditNameModalOpen(false)}>Cancel</button>
                        <button style={styles.btnPrimary} onClick={handleUpdateName} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        )
    );

    const renderPasswordModal = () => (
        isPasswordModalOpen && (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContainer}>
                    <div style={styles.modalHeader}>
                        <h3 style={styles.modalTitle}>Change Password</h3>
                        <button style={styles.closeButton} onClick={() => setIsPasswordModalOpen(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </button>
                    </div>
                    <div style={styles.modalBody}>
                        <div style={styles.warningBox}>
                            <Ionicons name="warning" size={16} color="#856404" />
                            <span style={{marginLeft: 8}}>This will immediately update the login credentials.</span>
                        </div>
                        <label style={styles.label}>New Password</label>
                        <div style={styles.passwordWrapper}>
                            <input 
                                style={styles.input}
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                autoFocus
                            />
                            <button 
                                style={styles.eyeButton} 
                                onClick={() => setShowPassword(!showPassword)}
                                type="button"
                            >
                                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                            </button>
                        </div>
                    </div>
                    <div style={styles.modalFooter}>
                        <button style={styles.btnSecondary} onClick={() => setIsPasswordModalOpen(false)}>Cancel</button>
                        <button style={styles.btnPrimary} onClick={handleChangePassword} disabled={saving}>
                            {saving ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>
            </div>
        )
    );

    // --- Main Render ---

    if (!user || loading) {
        return (
            <div style={styles.loadingContainer}>
                <ActivityIndicator />
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <style>{globalStyles}</style>
            
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color="#333" />
                    </button>
                    <div style={styles.headerTitleBlock}>
                        <h1 style={styles.headerTitle}>{staff.fullName}</h1>
                        <span style={styles.badge}>STAFF</span>
                    </div>
                </div>
            </header>

            <main style={styles.content}>
                <div style={styles.grid}>
                    {renderProfileCard()}
                    {renderActionsCard()}
                </div>
            </main>

            {renderEditNameModal()}
            {renderPasswordModal()}
        </div>
    );
};

// --- Styles ---

const globalStyles = `
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  body { margin: 0; background-color: #f4f6f9; }
  input:focus { outline: 2px solid #007bff; border-color: transparent; }
`;

const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f4f6f9',
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0b7dda 0%, #0056b3 100%)',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #fff',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    header: {
        backgroundColor: '#fff',
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    backButton: {
        background: 'transparent',
        border: '1px solid #e5e7eb',
        borderRadius: '50%',
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    headerTitleBlock: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    headerTitle: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
        color: '#1f2937',
    },
    badge: {
        backgroundColor: '#10B981', // Green for staff
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '700',
    },
    content: {
        padding: '30px',
        maxWidth: '1000px',
        margin: '0 auto',
        width: '100%',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
    },
    // Profile Card Styles
    profileHeader: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '20px',
    },
    avatarLarge: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#e0f2fe',
        color: '#0369a1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        border: '4px solid #f0f9ff',
    },
    avatarText: {
        fontSize: '32px',
        fontWeight: '700',
    },
    profileName: {
        margin: 0,
        fontSize: '22px',
        fontWeight: '700',
        color: '#111827',
    },
    profileUsername: {
        color: '#6b7280',
        fontSize: '15px',
        marginTop: '4px',
    },
    roleBadge: {
        marginTop: '12px',
        backgroundColor: '#f3f4f6',
        color: '#374151',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    divider: {
        height: '1px',
        backgroundColor: '#e5e7eb',
        margin: '20px 0',
        width: '100%',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '12px',
        fontSize: '14px',
    },
    infoLabel: {
        color: '#6b7280',
    },
    infoValue: {
        fontWeight: '600',
        color: '#374151',
    },
    // Actions Card Styles
    cardTitle: {
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#1f2937',
    },
    actionList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    actionButton: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.2s',
        width: '100%',
    },
    actionIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        backgroundColor: '#e0f2fe',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '12px',
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1f2937',
    },
    actionDesc: {
        fontSize: '12px',
        color: '#6b7280',
        marginTop: '2px',
    },
    deleteButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '12px',
        backgroundColor: '#fff5f5',
        color: '#dc2626',
        border: '1px solid #feb2b2',
        borderRadius: '8px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '10px',
        fontSize: '14px',
    },
    // Modal Styles
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '450px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        overflow: 'hidden',
    },
    modalHeader: {
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
    },
    closeButton: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
    },
    modalBody: {
        padding: '24px',
    },
    label: {
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '8px',
        color: '#374151',
    },
    input: {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        fontSize: '15px',
    },
    passwordWrapper: {
        position: 'relative',
        display: 'flex',
    },
    eyeButton: {
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 4,
    },
    modalFooter: {
        padding: '16px 24px',
        backgroundColor: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
    },
    btnSecondary: {
        padding: '8px 16px',
        backgroundColor: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        color: '#374151',
        cursor: 'pointer',
        fontWeight: '500',
    },
    btnPrimary: {
        padding: '8px 16px',
        backgroundColor: '#007bff',
        border: '1px solid #007bff',
        borderRadius: '6px',
        color: '#fff',
        cursor: 'pointer',
        fontWeight: '500',
    },
    warningBox: {
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeeba',
        color: '#856404',
        padding: '10px',
        borderRadius: '6px',
        marginBottom: '16px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
    }
};

export default StaffDetailsScreenWeb;