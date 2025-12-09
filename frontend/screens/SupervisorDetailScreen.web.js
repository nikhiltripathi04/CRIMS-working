import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    IoArrowBack,
    IoTrashOutline,
    IoPersonOutline,
    IoBriefcaseOutline,
    IoTimeOutline,
    IoChatbubbleEllipsesOutline,
    IoLocationOutline,
    IoKeyOutline,
    IoImageOutline,
    IoClose,
    IoPlayCircleOutline,
    IoCloudDownloadOutline
} from 'react-icons/io5';
import AttendanceCalendar from '../components/AttendanceCalendar';

const SupervisorDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { supervisor } = route.params || {};
    const { API_BASE_URL, user, token } = useAuth();

    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // overview, attendance, messages
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // If no supervisor passed, go back
    useEffect(() => {
        if (!supervisor) {
            navigation.goBack();
        }
    }, [supervisor, navigation]);

    const fetchData = useCallback(async () => {
        if (!supervisor || !user) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Fetch Attendance
            // Note: Using the admin endpoint to fetch user specific attendance
            const attendanceRes = await axios.get(`${API_BASE_URL}/api/attendance/user/${supervisor._id}`, config);

            // Fetch Messages
            const messagesRes = await axios.get(`${API_BASE_URL}/api/messages/user/${supervisor._id}`, config);

            setAttendance(attendanceRes.data.success ? attendanceRes.data.data : []);
            setMessages(messagesRes.data.success ? messagesRes.data.data : []);

        } catch (error) {
            console.error('Error fetching supervisor details:', error);
            // Don't alert on every error, just log it. Maybe some data is missing.
        } finally {
            setLoading(false);
        }
    }, [supervisor, user, API_BASE_URL, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete supervisor "${supervisor.username}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`${API_BASE_URL}/api/auth/supervisors/${supervisor._id}?adminId=${user.id}`, config);
            alert('Supervisor deleted successfully');
            navigation.goBack();
        } catch (error) {
            console.error('Error deleting supervisor:', error);
            alert('Failed to delete supervisor');
        }
    };

    const handlePasswordChange = async () => {
        if (!newPassword.trim()) {
            alert('Please enter a new password');
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(`${API_BASE_URL}/api/auth/supervisors/${supervisor._id}/password`, {
                adminId: user.id,
                newPassword: newPassword
            }, config);

            alert('Password changed successfully');
            setIsPasswordModalOpen(false);
            setNewPassword('');
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Failed to change password');
        }
    };

    if (!supervisor) return null;

    return (
        <div style={styles.page}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={() => navigation.goBack()} style={styles.backButton}>
                        <IoArrowBack size={20} />
                    </button>
                    <div>
                        <h1 style={styles.title}>{supervisor.username}</h1>
                        <span style={styles.subtitle}>Supervisor Details</span>
                    </div>
                </div>
                <button onClick={handleDelete} style={styles.deleteButton}>
                    <IoTrashOutline size={18} style={{ marginRight: '8px' }} />
                    Delete Supervisor
                </button>
            </header>

            <main style={styles.content}>

                {/* Tabs */}
                <div style={styles.tabs}>
                    <button
                        style={activeTab === 'overview' ? styles.activeTab : styles.tab}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        style={activeTab === 'attendance' ? styles.activeTab : styles.tab}
                        onClick={() => setActiveTab('attendance')}
                    >
                        Attendance
                    </button>
                    <button
                        style={activeTab === 'messages' ? styles.activeTab : styles.tab}
                        onClick={() => setActiveTab('messages')}
                    >
                        Messages
                    </button>
                </div>

                {/* Tab Content */}
                <div style={styles.tabContent}>

                    {activeTab === 'overview' && (
                        <div style={styles.grid}>
                            {/* Credentials Card */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>
                                    <IoKeyOutline style={styles.cardIcon} /> Credentials
                                </h3>
                                <div style={styles.infoRow}>
                                    <span style={styles.label}>Username:</span>
                                    <span style={styles.value}>{supervisor.username}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.label}>Role:</span>
                                    <span style={styles.badge}>Supervisor</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <span style={styles.label}>ID:</span>
                                    <span style={styles.value}>{supervisor._id}</span>
                                </div>
                                <button
                                    style={styles.changePasswordBtn}
                                    onClick={() => setIsPasswordModalOpen(true)}
                                >
                                    <IoKeyOutline size={16} /> Change Password
                                </button>
                            </div>

                            {/* Assigned Sites Card */}
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>
                                    <IoBriefcaseOutline style={styles.cardIcon} /> Assigned Sites
                                </h3>
                                {supervisor.assignedSites && supervisor.assignedSites.length > 0 ? (
                                    <div style={styles.siteList}>
                                        {supervisor.assignedSites.map((site, index) => (
                                            <div key={index} style={styles.siteItem}>
                                                <IoLocationOutline color="#007bff" />
                                                <span>{site.siteName || site.name || 'Unknown Site'}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={styles.emptyText}>No sites assigned.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>
                                <IoTimeOutline style={styles.cardIcon} /> Attendance History
                            </h3>

                            {/* Calendar View */}
                            <div style={{ marginBottom: '20px' }}>
                                <AttendanceCalendar attendanceLogs={attendance} />
                            </div>

                            <h4 style={{ margin: '0 0 15px 0', color: '#666' }}>Recent Logs</h4>
                            {loading ? (
                                <p>Loading...</p>
                            ) : attendance.length > 0 ? (
                                <div style={styles.tableContainer}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>Type</th>
                                                <th style={styles.th}>Time</th>
                                                <th style={styles.th}>Location</th>
                                                <th style={styles.th}>Photo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attendance.map(record => (
                                                <tr key={record._id} style={styles.tr}>
                                                    <td style={styles.td}>
                                                        <span style={record.type === 'login' ? styles.loginBadge : styles.logoutBadge}>
                                                            {record.type === 'login' ? 'Check In' : 'Check Out'}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        {new Date(record.timestamp).toLocaleString()}
                                                    </td>
                                                    <td style={styles.td}>
                                                        {record.location?.displayText || 'Unknown Location'}
                                                    </td>
                                                    <td style={styles.td}>
                                                        {record.photo && (
                                                            <button
                                                                style={styles.viewBtn}
                                                                onClick={() => setSelectedAttendance(record)}
                                                            >
                                                                <IoImageOutline size={16} /> View
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p style={styles.emptyText}>No attendance records found.</p>
                            )}
                        </div>
                    )}

                    {activeTab === 'messages' && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>
                                <IoChatbubbleEllipsesOutline style={styles.cardIcon} /> Sent Messages
                            </h3>
                            {loading ? (
                                <p>Loading...</p>
                            ) : messages.length > 0 ? (
                                <div style={styles.messageList}>
                                    {messages.map(msg => (
                                        <div key={msg._id} style={styles.messageItem}>
                                            <div style={styles.messageHeader}>
                                                <span style={styles.siteName}>{msg.siteName}</span>
                                                <span style={styles.msgTime}>{new Date(msg.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p style={styles.msgContent}>{msg.content}</p>
                                            {msg.videoUrl && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        style={styles.videoBtn}
                                                        onClick={() => setSelectedVideo(msg.videoUrl)}
                                                    >
                                                        <IoPlayCircleOutline size={16} /> View
                                                    </button>
                                                    <button
                                                        style={styles.videoBtn}
                                                        onClick={() => window.open(msg.videoUrl, '_blank')}
                                                    >
                                                        <IoCloudDownloadOutline size={16} /> Save
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={styles.emptyText}>No messages sent.</p>
                            )}
                        </div>
                    )}

                </div>
            </main>

            {/* Photo Modal */}
            {selectedAttendance && (
                <div style={styles.modalOverlay} onClick={() => setSelectedAttendance(null)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Attendance Photo</h3>
                            <button style={styles.closeBtn} onClick={() => setSelectedAttendance(null)}>
                                <IoClose size={24} />
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <img src={selectedAttendance.photo} alt="Attendance" style={styles.modalImage} />
                            <div style={styles.modalMeta}>
                                <p><strong>Time:</strong> {new Date(selectedAttendance.timestamp).toLocaleString()}</p>
                                <p><strong>Location:</strong> {selectedAttendance.location?.displayText || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Modal */}
            {selectedVideo && (
                <div style={styles.modalOverlay} onClick={() => setSelectedVideo(null)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Video Message</h3>
                            <button style={styles.closeBtn} onClick={() => setSelectedVideo(null)}>
                                <IoClose size={24} />
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <video controls src={selectedVideo} style={{ width: '100%', borderRadius: '8px', maxHeight: '60vh' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Password Change Modal */}
            {isPasswordModalOpen && (
                <div style={styles.modalOverlay} onClick={() => setIsPasswordModalOpen(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Change Password</h3>
                            <button style={styles.closeBtn} onClick={() => setIsPasswordModalOpen(false)}>
                                <IoClose size={24} />
                            </button>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={{ marginBottom: '15px', color: '#666' }}>
                                Enter a new password for <strong>{supervisor.username}</strong>.
                            </p>
                            <input
                                type="text"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={styles.input}
                            />
                            <div style={styles.modalActions}>
                                <button
                                    style={styles.cancelBtn}
                                    onClick={() => setIsPasswordModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    style={styles.submitBtn}
                                    onClick={handlePasswordChange}
                                >
                                    Update Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
    deleteButton: {
        backgroundColor: '#fff0f0',
        color: '#dc3545',
        border: '1px solid #ffcccc',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        padding: '30px',
        overflowY: 'auto',
        maxWidth: '1000px',
        width: '100%',
        margin: '0 auto',
    },
    tabs: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '1px solid #eee',
        paddingBottom: '10px',
    },
    tab: {
        padding: '10px 20px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#666',
        fontWeight: '600',
        borderRadius: '8px',
    },
    activeTab: {
        padding: '10px 20px',
        background: '#e3f2fd',
        color: '#007bff',
        border: 'none',
        cursor: 'pointer',
        fontWeight: '600',
        borderRadius: '8px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid #eee',
    },
    cardTitle: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#444',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: '10px',
    },
    cardIcon: {
        color: '#007bff',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid #f9f9f9',
    },
    label: {
        color: '#666',
        fontSize: '14px',
    },
    value: {
        fontWeight: '600',
        color: '#333',
        fontSize: '14px',
    },
    badge: {
        backgroundColor: '#e3f2fd',
        color: '#007bff',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
    },
    siteList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    siteItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#333',
    },
    emptyText: {
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: '20px',
    },
    tableContainer: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    th: {
        textAlign: 'left',
        padding: '12px',
        borderBottom: '2px solid #eee',
        color: '#666',
        fontSize: '14px',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #eee',
        color: '#333',
        fontSize: '14px',
    },
    tr: {
        ':hover': {
            backgroundColor: '#f9f9f9',
        }
    },
    loginBadge: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
    },
    logoutBadge: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
    },
    messageList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    messageItem: {
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        borderLeft: '4px solid #007bff',
    },
    messageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px',
    },
    siteName: {
        fontWeight: 'bold',
        color: '#333',
        fontSize: '14px',
    },
    msgTime: {
        color: '#888',
        fontSize: '12px',
    },
    msgContent: {
        margin: 0,
        color: '#555',
        fontSize: '14px',
        lineHeight: '1.4',
    },
    videoBadge: {
        marginTop: '8px',
        display: 'inline-block',
        backgroundColor: '#e2e6ea',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#333',
    },
    viewBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '6px 10px',
        backgroundColor: '#fff',
        border: '1px solid #007bff',
        borderRadius: '6px',
        color: '#007bff',
        cursor: 'pointer',
        fontSize: '12px',
    },
    videoBtn: {
        marginTop: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#e3f2fd',
        color: '#007bff',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.2s',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        overflow: 'hidden',
    },
    modalHeader: {
        padding: '15px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 'bold',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#333',
    },
    modalBody: {
        padding: '20px',
    },
    modalImage: {
        width: '100%',
        borderRadius: '8px',
        marginBottom: '15px',
    },
    modalMeta: {
        fontSize: '14px',
        color: '#555',
    },
    changePasswordBtn: {
        marginTop: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '10px',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        transition: 'background 0.2s',
    },
    input: {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        fontSize: '16px',
        marginBottom: '20px',
        boxSizing: 'border-box',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
    },
    cancelBtn: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#f5f5f5',
        color: '#333',
        cursor: 'pointer',
        fontWeight: '600',
    },
    submitBtn: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#007bff',
        color: '#fff',
        cursor: 'pointer',
        fontWeight: '600',
    },
};

export default SupervisorDetailScreen;
