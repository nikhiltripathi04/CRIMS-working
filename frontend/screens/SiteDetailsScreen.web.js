import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
// import localforage from 'localforage'; // Web alternative to AsyncStorage

// Remove external CSS import
// import '../styles/SiteDetailsScreen.css';

// Mock the Dimensions to a fixed size or window size for web
const screenWidth = window.innerWidth;
const isIpad = screenWidth >= 768;

// Mock Expo components/functions for web
const VideoPlayer = ({ videoUri, style }) => {
    return (
        <div className={`video-container ${style ? style.className : ''}`} style={{ width: '100%', height: '200px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <video
                src={videoUri}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

const Image = ({ source, style, resizeMode }) => (
    <img
        src={source.uri}
        alt="Announcement Media"
        className={style?.className}
        style={{ ...style, objectFit: resizeMode || 'contain', maxWidth: '100%', borderRadius: '8px' }}
    />
);

const ActivityIndicator = ({ size, color }) => (
    <div style={styles.spinner}></div>
);

const Alert = {
    alert: (title, message) => window.alert(`${title}\n${message}`)
};

// Mock MediaLibrary/FileSystem functions
const saveToGallery = async (mediaUri, mediaType) => {
    try {
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `site-announcement-${mediaType}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        Alert.alert(
            'Success',
            `${mediaType === 'image' ? 'Image' : 'Video'} downloaded successfully.`
        );
    } catch (error) {
        console.error('Download error:', error);
        Alert.alert('Error', 'Failed to save to device. Please check the console for details.');
    }
};

const SiteDetailsScreen = ({ route, navigation }) => {
    const { site: initialSite } = route.params;
    const [site, setSite] = useState(initialSite);
    const [loading, setLoading] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [logFilter, setLogFilter] = useState('all');
    const [savingToGallery, setSavingToGallery] = useState(false);
    const { API_BASE_URL, user } = useAuth();
    const [currencyUnit, setCurrencyUnit] = useState('₹'); // Default currency

    const loadCurrencyPreference = useCallback(async () => {
        try {
            // Use localforage as a web alternative to AsyncStorage
            // const savedCurrency = await localforage.getItem('supplyCurrency');
            // if (savedCurrency) {
            //     setCurrencyUnit(savedCurrency);
            // }
        } catch (error) {
            console.log('Error loading currency preference:', error);
        }
    }, []);

    useEffect(() => {
        loadCurrencyPreference();
    }, [loadCurrencyPreference]);

    const fetchSiteDetails = useCallback(async () => {
        if (!user || !user.id) {
            console.log('User not available, skipping fetchSiteDetails');
            return;
        }

        try {
            setLoading(true);
            console.log(`Fetching site details with adminId=${user.id} for site ${site._id}`);

            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}?adminId=${user.id}`);
            console.log('Site details response:', response.data);

            if (response.data.success) {
                setSite(response.data.data);
                if (response.data.data.recentActivityLogs) {
                    setActivityLogs(response.data.data.recentActivityLogs.slice(0, 10));
                }
            } else {
                Alert.alert('Error', 'Failed to fetch site details');
            }
        } catch (error) {
            console.error('Fetch site details error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to fetch site details');
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL, site._id, user]);

    const fetchAnnouncements = useCallback(async () => {
        if (!user || !user.id) {
            console.log('User not available, skipping fetchAnnouncements');
            return;
        }

        try {
            console.log(`Fetching announcements with adminId=${user.id} for site ${site._id}`);
            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}/announcements?adminId=${user.id}`);
            if (response.data.success) {
                setAnnouncements(response.data.data);
            }
        } catch (error) {
            console.error('Fetch announcements error:', error.response?.data || error.message);
        }
    }, [API_BASE_URL, site._id, user]);

    useEffect(() => {
        if (user && user.id) {
            fetchSiteDetails();
            fetchAnnouncements();
        }
    }, [user, fetchSiteDetails, fetchAnnouncements]);

    useEffect(() => {
        loadCurrencyPreference();
    }, [navigation, loadCurrencyPreference]);


    const fetchAllLogs = async (filter = 'all') => {
        if (!user || !user.id) {
            console.log('User not available, skipping fetchAllLogs');
            return;
        }

        try {
            setLoading(true);
            let url = `${API_BASE_URL}/api/sites/${site._id}/logs?limit=100&adminId=${user.id}`;
            if (filter !== 'all') {
                url += `&action=${filter}`;
            }

            const response = await axios.get(url);

            if (response.data.success) {
                setActivityLogs(response.data.data);
                setLogFilter(filter);
            } else {
                Alert.alert('Error', 'Failed to fetch activity logs');
            }
        } catch (error) {
            console.error('Fetch logs error:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to fetch activity logs');
        } finally {
            setLoading(false);
        }
    };

    const markAnnouncementAsRead = async (announcementId) => {
        if (!user || !user.id) {
            console.log('User not available, skipping markAnnouncementAsRead');
            return;
        }

        try {
            await axios.post(
                `${API_BASE_URL}/api/sites/${site._id}/announcements/${announcementId}/read`,
                { adminId: user.id }
            );
            fetchAnnouncements();
        } catch (error) {
            console.error('Mark as read error:', error.response?.data || error.message);
        }
    };

    const isAnnouncementUnread = (announcement) => {
        if (!user) return false;
        return !announcement.readBy?.some(read => read.user === user.id);
    };

    const showAnnouncementDetails = (announcement) => {
        setSelectedAnnouncement(announcement);
        setDetailsModalVisible(true);
    };

    const handleAnnouncementPress = async (announcement) => {
        const unread = isAnnouncementUnread(announcement);
        if (unread) {
            try {
                await markAnnouncementAsRead(announcement._id);
            } catch (error) {
                console.error('Error marking announcement as read:', error);
            }
        }
        showAnnouncementDetails(announcement);
    };

    const handleSaveToGallery = async (mediaUri, mediaType) => {
        setSavingToGallery(true);
        await saveToGallery(mediaUri, mediaType);
        setSavingToGallery(false);
    };

    const getTodayAttendance = () => {
        const today = new Date().toDateString();
        let presentCount = 0;
        let absentCount = 0;
        let notMarkedCount = 0;
        let totalWorkers = site.workers?.length || 0;

        site.workers?.forEach(worker => {
            const sortedAttendance = worker.attendance?.sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            ) || [];

            const todayAttendance = sortedAttendance.find(
                att => new Date(att.date).toDateString() === today
            );

            if (todayAttendance) {
                if (todayAttendance.status === 'present') {
                    presentCount++;
                } else if (todayAttendance.status === 'absent') {
                    absentCount++;
                }
            } else {
                notMarkedCount++;
            }
        });

        return {
            present: presentCount,
            absent: absentCount,
            notMarked: notMarkedCount,
            total: totalWorkers
        };
    };

    const getAttendancePercentage = () => {
        const attendance = getTodayAttendance();
        if (attendance.total === 0) return 0;
        return Math.round((attendance.present / attendance.total) * 100);
    };

    const getSuppliesStats = () => {
        if (!site || !site.supplies || !Array.isArray(site.supplies)) {
            return { items: 0, totalValue: 0 };
        }

        const totalValue = site.supplies.reduce((sum, supply) => {
            if (!supply) return sum;

            const price = supply.cost || supply.currentPrice || supply.entryPrice || 0;
            const quantity = parseFloat(supply.quantity) || 0;
            const itemValue = price * quantity;

            return sum + itemValue;
        }, 0);

        return {
            items: site.supplies.length,
            totalValue: isNaN(totalValue) ? 0 : totalValue
        };
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    const getLogIcon = (action) => {
        switch (action) {
            case 'supply_added':
                return { name: 'add-circle', color: '#28a745' };
            case 'supply_updated':
                return { name: 'create', color: '#ffc107' };
            case 'supply_deleted':
                return { name: 'trash', color: '#dc3545' };
            case 'worker_added':
                return { name: 'person-add', color: '#28a745' };
            case 'worker_updated':
                return { name: 'person', color: '#ffc107' };
            case 'worker_deleted':
                return { name: 'person-remove', color: '#dc3545' };
            case 'attendance_marked':
            case 'attendance_updated':
                return { name: 'calendar', color: '#17a2b8' };
            case 'announcement_created':
                return { name: 'megaphone', color: '#ff6b35' };
            case 'announcement_updated':
                return { name: 'create', color: '#ffc107' };
            case 'announcement_deleted':
                return { name: 'trash', color: '#dc3545' };
            case 'site_created':
                return { name: 'business', color: '#007bff' };
            case 'site_updated':
                return { name: 'create', color: '#ffc107' };
            case 'supervisor_added':
                return { name: 'person-add', color: '#6f42c1' };
            case 'supervisor_removed':
                return { name: 'person-remove', color: '#dc3545' };
            default:
                return { name: 'information-circle', color: '#6c757d' };
        }
    };

    const renderActivityLogItem = (item, index) => {
        const iconInfo = getLogIcon(item.action);

        return (
            <div key={index} style={styles.logItemModal}>
                <div style={{ ...styles.logIconContainerModal, backgroundColor: iconInfo.color }}>
                    <Ionicons
                        name={iconInfo.name}
                        size={18}
                        color="#fff"
                    />
                </div>
                <div style={styles.logContentModal}>
                    <div style={styles.logDescriptionModal}>{item.description}</div>
                    <div style={styles.logTimestampModal}>
                        {formatTimestamp(item.timestamp)} • {item.performedByName}
                    </div>
                </div>
            </div>
        );
    };

    const renderAnnouncementDetailsModal = () => (
        detailsModalVisible && selectedAnnouncement && (
            <div style={styles.modalOverlay} onClick={() => setDetailsModalVisible(false)}>
                <div style={styles.detailsModalContent} onClick={e => e.stopPropagation()}>
                    <div style={styles.detailsHeader}>
                        <div style={styles.detailsModalTitle}>Announcement Details</div>
                        <button
                            style={styles.closeButton}
                            onClick={() => setDetailsModalVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </button>
                    </div>

                    <div style={styles.detailsScrollView}>
                        <div style={styles.detailsContainer}>
                            <div style={{ ...styles.detailsTitle, color: selectedAnnouncement.isUrgent ? '#ff4444' : '#333' }}>
                                {selectedAnnouncement.isUrgent && '🚨 '}
                                {selectedAnnouncement.title}
                            </div>

                            <div style={styles.detailsMeta}>
                                <div style={styles.detailsAuthor}>
                                    By {selectedAnnouncement.createdByName}
                                </div>
                                <div style={styles.detailsDate}>
                                    {formatTimestamp(selectedAnnouncement.createdAt)}
                                </div>
                            </div>

                            <div style={styles.detailsContent}>
                                {selectedAnnouncement.content}
                            </div>

                            {selectedAnnouncement.media && (
                                <div style={styles.detailsMediaContainer}>
                                    <div style={styles.mediaWrapper}>
                                        {selectedAnnouncement.mediaType === 'image' ? (
                                            <Image
                                                source={{ uri: selectedAnnouncement.media }}
                                                style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <VideoPlayer
                                                videoUri={selectedAnnouncement.media}
                                                style={{ width: '100%', height: '300px' }}
                                            />
                                        )}
                                        <div style={styles.mediaActionContainer}>
                                            <button
                                                style={styles.btnPrimary}
                                                onClick={() => handleSaveToGallery(selectedAnnouncement.media, selectedAnnouncement.mediaType)}
                                                disabled={savingToGallery}
                                            >
                                                <Ionicons
                                                    name={savingToGallery ? "hourglass" : "download"}
                                                    size={20}
                                                    color="#fff"
                                                />
                                                <span style={{ marginLeft: '8px' }}>
                                                    {savingToGallery ? 'Saving...' : selectedAnnouncement.mediaType === 'image' ? 'Save to Gallery' : 'Save Video to Gallery'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    );

    const renderAnnouncementItem = (item) => {
        const isUnread = isAnnouncementUnread(item);

        return (
            <button
                key={item._id || Math.random()}
                style={{
                    ...styles.announcementItem,
                    borderLeft: item.isUrgent ? '4px solid #ff4444' : 'none',
                    backgroundColor: isUnread ? '#f8f9ff' : '#fff'
                }}
                onClick={() => handleAnnouncementPress(item)}
            >
                <div style={styles.announcementHeader}>
                    <div style={styles.announcementTitleContainer}>
                        <div style={{ ...styles.announcementTitle, color: item.isUrgent ? '#ff4444' : '#333' }}>
                            {item.isUrgent && '🚨 '}
                            {item.title}
                        </div>
                        {isUnread && <div style={styles.unreadDot} />}
                    </div>
                    <div style={styles.announcementMeta}>
                        <div style={styles.authorText}>By {item.createdByName}</div>
                        <div style={styles.dateText}>{formatTimestamp(item.createdAt)}</div>
                    </div>
                </div>

                <div style={styles.announcementContent}>
                    {item.content}
                </div>

                {item.media && (
                    <div style={styles.mediaIndicator}>
                        <Ionicons
                            name={item.mediaType === 'image' ? 'image' : 'videocam'}
                            size={16}
                            color="#007bff"
                        />
                        <span style={styles.mediaText}>
                            {item.mediaType === 'image' ? 'View Photo' : 'View Video'}
                        </span>
                    </div>
                )}
            </button>
        );
    };

    const renderAnnouncementsCard = () => {
        if (user.role !== 'admin') return null;

        const recentAnnouncements = announcements.slice(0, 3);

        return (
            <div style={styles.adminPanel}>
                <div style={styles.adminPanelHeader}>
                    <h2 style={styles.adminPanelTitle}>Site Announcements</h2>
                </div>
                <div style={styles.cardContent}>
                    {recentAnnouncements.length > 0 ? (
                        <div style={styles.adminCardList}>
                            {recentAnnouncements.map((announcement, index) => (
                                <div
                                    key={index}
                                    style={styles.adminCard}
                                    onClick={() => handleAnnouncementPress(announcement)}
                                >
                                    <div style={styles.adminCardContent}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                            {announcement.isUrgent ? (
                                                <Ionicons name="warning" size={16} color="#ff4444" style={{ marginRight: 6 }} />
                                            ) : (
                                                <Ionicons name="mail" size={16} color="#007bff" style={{ marginRight: 6 }} />
                                            )}
                                            <div style={styles.adminCardTitle}>{announcement.title}</div>
                                            {isAnnouncementUnread(announcement) && (
                                                <div style={styles.unreadDot} />
                                            )}
                                        </div>
                                        <div style={styles.adminCardMeta}>{announcement.content.substring(0, 100)}...</div>
                                        <div style={styles.adminCardSmall}>
                                            By {announcement.createdByName} • {formatTimestamp(announcement.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={styles.adminEmptyPanel}>
                            <p style={styles.adminEmptyText}>No announcements from supervisors yet</p>
                        </div>
                    )}

                    <button
                        style={{ ...styles.btnGhost, width: '100%', marginTop: '15px', justifyContent: 'center' }}
                        onClick={() => setShowAnnouncementsModal(true)}
                    >
                        View All Announcements ({announcements.length})
                        <Ionicons name="chevron-forward" size={16} color="#007bff" />
                    </button>
                </div>
            </div>
        );
    };

    const renderActivityLogsCard = () => {
        if (user.role !== 'admin') return null;

        return (
            <div style={styles.adminPanel}>
                <div style={styles.adminPanelHeader}>
                    <h2 style={styles.adminPanelTitle}>Recent Activity</h2>
                </div>
                <div style={styles.cardContent}>
                    {activityLogs && activityLogs.length > 0 ? (
                        <div style={styles.adminCardList}>
                            {activityLogs.slice(0, 3).map((log, index) => (
                                <div key={index} style={styles.adminCard}>
                                    <div style={styles.logIconContainer}>
                                        <Ionicons
                                            name={getLogIcon(log.action).name}
                                            size={16}
                                            color={getLogIcon(log.action).color}
                                        />
                                    </div>
                                    <div style={styles.adminCardContent}>
                                        <div style={styles.adminCardTitle}>{log.description}</div>
                                        <div style={styles.adminCardSmall}>
                                            {formatTimestamp(log.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={styles.adminEmptyPanel}>
                            <p style={styles.adminEmptyText}>No activity logged yet</p>
                        </div>
                    )}

                    <button
                        style={{ ...styles.btnGhost, width: '100%', marginTop: '15px', justifyContent: 'center' }}
                        onClick={() => {
                            fetchAllLogs('all');
                            setShowLogsModal(true);
                        }}
                    >
                        View All Activity ({activityLogs.length} total)
                        <Ionicons name="chevron-forward" size={16} color="#007bff" />
                    </button>
                </div>
            </div>
        );
    };

    const renderLogFilterButtons = () => {
        const filters = [
            { key: 'all', label: 'All', icon: 'list' },
            { key: 'announcement_created', label: 'Announcements', icon: 'megaphone' },
            { key: 'supply_added', label: 'Supplies Added', icon: 'add-circle' },
            { key: 'supply_updated', label: 'Supplies Updated', icon: 'create' },
            { key: 'attendance_marked', label: 'Attendance', icon: 'calendar' },
            { key: 'worker_added', label: 'Workers Added', icon: 'person-add' },
        ];

        return (
            <div style={styles.filterContainer}>
                <div style={styles.filterContainerContent}>
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            style={{
                                ...styles.filterButtonModal,
                                backgroundColor: logFilter === filter.key ? '#007bff' : '#fff',
                                borderColor: logFilter === filter.key ? '#007bff' : '#ddd',
                                color: logFilter === filter.key ? '#fff' : '#333'
                            }}
                            onClick={() => fetchAllLogs(filter.key)}
                        >
                            <Ionicons
                                name={filter.icon}
                                size={16}
                                color={logFilter === filter.key ? '#fff' : '#007bff'}
                                style={{ marginRight: 5 }}
                            />
                            <span style={{ fontWeight: 500 }}>
                                {filter.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderAnnouncementsModal = () => (
        showAnnouncementsModal && (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContainer}>
                    <div style={styles.modalHeader}>
                        <div style={styles.modalTitle}>Site Announcements</div>
                        <button style={styles.closeButton} onClick={() => setShowAnnouncementsModal(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </button>
                    </div>

                    <div style={styles.logsList}>
                        {announcements.length > 0 ? (
                            announcements.map(renderAnnouncementItem)
                        ) : (
                            <div style={styles.emptyLogsContainer}>
                                <Ionicons name="megaphone-outline" size={64} color="#ccc" />
                                <div style={styles.emptyLogsText}>No announcements yet</div>
                                <div style={styles.emptyLogsSubtext}>
                                    Supervisors can create announcements to keep everyone informed
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    );

    const renderLogsModal = () => (
        showLogsModal && (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContainer}>
                    <div style={styles.modalHeader}>
                        <div style={styles.modalTitle}>Activity Logs</div>
                        <button style={styles.closeButton} onClick={() => setShowLogsModal(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </button>
                    </div>

                    {renderLogFilterButtons()}

                    <div style={styles.logsList}>
                        {activityLogs.length > 0 ? (
                            activityLogs.map(renderActivityLogItem)
                        ) : (
                            <div style={styles.emptyLogsContainer}>
                                <Ionicons name="document-text-outline" size={64} color="#ccc" />
                                <div style={styles.emptyLogsText}>No activity logs found</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    );

    const renderSuppliesCard = () => {
        return (
            <div style={styles.adminPanel}>
                <div style={styles.adminPanelHeader}>
                    <h2 style={styles.adminPanelTitle}>Supplies</h2>
                </div>
                <div style={styles.cardContent}>
                    {site.supplies && Array.isArray(site.supplies) && site.supplies.length > 0 ? (
                        <div style={styles.adminCardList}>
                            {site.supplies.slice(0, 3).map((supply, index) => (
                                supply ? (
                                    <div key={index} style={styles.adminCard}>
                                        <div style={styles.adminCardContent}>
                                            <div style={styles.adminCardTitle}>{supply.itemName || 'Unknown Item'}</div>
                                            <div style={styles.adminCardMeta}>
                                                Qty: {supply.quantity || 0} {supply.unit || ''} | Cost: {supply.cost ? `${currencyUnit}${supply.cost}` : 'Pending'}
                                            </div>
                                        </div>
                                    </div>
                                ) : null
                            ))}
                        </div>
                    ) : (
                        <div style={styles.adminEmptyPanel}>
                            <p style={styles.adminEmptyText}>No supplies added yet</p>
                        </div>
                    )}

                    <button
                        style={{ ...styles.btnGhost, width: '100%', marginTop: '15px', justifyContent: 'center' }}
                        onClick={() => navigation.navigate('ManageSupplies', {
                            site,
                            canEdit: true,
                            adminId: user.role === 'admin' ? user.id : undefined,
                            currencyUnit: currencyUnit
                        })}
                    >
                        {user.role === 'admin' ? 'Manage Supplies' : 'Check Supplies'}
                        <Ionicons name="chevron-forward" size={16} color="#007bff" />
                    </button>
                </div>
            </div>
        );
    };

    const renderAttendanceCard = () => {
        const attendance = getTodayAttendance();
        const attendancePercentage = getAttendancePercentage();

        return (
            <div style={styles.adminPanel}>
                <div style={styles.adminPanelHeader}>
                    <h2 style={styles.adminPanelTitle}>Today's Attendance</h2>
                </div>
                <div style={styles.cardContent}>
                    <div style={styles.attendanceProgressContainer}>
                        <div style={styles.attendanceProgressBar}>
                            <div
                                style={{ ...styles.attendanceProgress, width: `${attendancePercentage}%` }}
                            />
                        </div>
                        <div style={styles.attendancePercentageText}>{attendancePercentage}% Present</div>
                    </div>

                    <div style={styles.attendanceSummaryStats}>
                        <div style={styles.attendanceStat}>
                            <div style={{ ...styles.attendanceStatDot, backgroundColor: '#28a745' }} />
                            <div style={styles.attendanceStatNumber}>{attendance.present}</div>
                            <div style={styles.attendanceStatLabel}>Present</div>
                        </div>
                        <div style={styles.attendanceStat}>
                            <div style={{ ...styles.attendanceStatDot, backgroundColor: '#dc3545' }} />
                            <div style={styles.attendanceStatNumber}>{attendance.absent}</div>
                            <div style={styles.attendanceStatLabel}>Absent</div>
                        </div>
                        <div style={styles.attendanceStat}>
                            <div style={{ ...styles.attendanceStatDot, backgroundColor: '#ffc107' }} />
                            <div style={styles.attendanceStatNumber}>{attendance.notMarked}</div>
                            <div style={styles.attendanceStatLabel}>Not Marked</div>
                        </div>
                    </div>

                    {attendance.notMarked > 0 && (
                        <div style={styles.attendanceAlert}>
                            <Ionicons name="warning-outline" size={16} color="#856404" />
                            <div style={styles.attendanceAlertText}>
                                {attendance.notMarked} worker{attendance.notMarked > 1 ? 's' : ''} attendance not marked
                            </div>
                        </div>
                    )}

                    <button
                        style={{ ...styles.btnGhost, width: '100%', marginTop: '15px', justifyContent: 'center' }}
                        onClick={() => navigation.navigate('ManageWorkers', {
                            site,
                            adminId: user.id
                        })}
                    >
                        Check Workers & Attendance
                        <Ionicons name="chevron-forward" size={16} color="#007bff" />
                    </button>
                </div>
            </div>
        );
    };

    const renderSupervisorsCard = () => (
        <div style={styles.adminPanel}>
            <div style={styles.adminPanelHeader}>
                <h2 style={styles.adminPanelTitle}>Supervisors</h2>
            </div>
            <div style={styles.cardContent}>
                {site.supervisors && site.supervisors.length > 0 ? (
                    <div style={styles.adminCardList}>
                        {site.supervisors.map((supervisor, index) => (
                            <div key={index} style={styles.adminCard}>
                                <div style={styles.adminCardContent}>
                                    <div style={styles.adminCardTitle}>{supervisor.username}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={styles.adminEmptyPanel}>
                        <p style={styles.adminEmptyText}>No supervisors assigned</p>
                    </div>
                )}

                {user.role === 'admin' && (
                    <button
                        style={{ ...styles.btnGhost, width: '100%', marginTop: '15px', justifyContent: 'center' }}
                        onClick={() => navigation.navigate('ManageSupervisors', {
                            site,
                            adminId: user.id
                        })}
                    >
                        Manage Supervisors
                        <Ionicons name="chevron-forward" size={16} color="#007bff" />
                    </button>
                )}
            </div>
        </div>
    );

    const renderPricingStatusBar = () => {
        if (user.role !== 'admin' || !site || !site.supplies || !Array.isArray(site.supplies) || site.supplies.length === 0) {
            return null;
        }

        const pendingSupplies = site.supplies.filter(supply => {
            if (!supply) return false;

            const hasCost = supply.cost && !isNaN(supply.cost) && Number(supply.cost) > 0;
            const isPriced = supply.isPriced === true || supply.status === 'priced';
            const hasCurrentPrice = supply.currentPrice && !isNaN(supply.currentPrice) && Number(supply.currentPrice) > 0;

            const needsPricing = !hasCost && !isPriced && !hasCurrentPrice;
            return needsPricing;
        });

        const pendingCount = pendingSupplies ? pendingSupplies.length : 0;

        if (pendingCount > 0) {
            return (
                <button
                    style={styles.pricingStatusBar}
                    onClick={() => navigation.navigate('ManageSupplies', {
                        site,
                        canEdit: true,
                        adminId: user.id,
                        currencyUnit: currencyUnit
                    })}
                >
                    <div style={styles.pricingStatusContent}>
                        <div style={styles.pricingStatusLeft}>
                            <Ionicons name="alert-circle" size={20} color="#ff4444" />
                            <div style={styles.pricingStatusText}>
                                {pendingCount} {pendingCount === 1 ? 'supply item needs' : 'supply items need'} pricing
                            </div>
                        </div>
                        <Ionicons name="chevron-forward" size={20} color="#ff4444" />
                    </div>
                </button>
            );
        } else {
            return (
                <div style={styles.pricingStatusBarSuccess}>
                    <div style={styles.pricingStatusContent}>
                        <div style={styles.pricingStatusLeft}>
                            <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                            <div style={styles.pricingStatusTextSuccess}>
                                All supplies priced
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    };

    const renderStatsContainer = () => {
        const attendance = getTodayAttendance();
        const suppliesStats = getSuppliesStats();
        const totalValue = suppliesStats.totalValue || 0;

        return (
            <div style={styles.statsContainer}>
                <div style={styles.statCard}>
                    <Ionicons name="cube-outline" size={32} color="#007bff" />
                    <div style={styles.statNumber}>{suppliesStats.items}</div>
                    <div style={styles.statLabel}>Supply Items</div>
                </div>

                <div style={styles.statCard}>
                    <Ionicons name="cash-outline" size={32} color="#28a745" />
                    <div style={styles.statNumber}>{currencyUnit}{totalValue.toFixed(2)}</div>
                    <div style={styles.statLabel}>Total Value</div>
                </div>

                <div style={styles.statCard}>
                    <Ionicons name="people-outline" size={32} color="#ffc107" />
                    <div style={styles.statNumber}>{attendance.present}/{attendance.total}</div>
                    <div style={styles.statLabel}>Present Today</div>
                </div>
            </div>
        );
    };

    if (!user) {
        return (
            <>
                <style>{globalStyles}</style>
                <div style={styles.adminLoadingContainer}>
                    <div style={styles.adminLoadingContent}>
                        <div style={styles.spinner}></div>
                        <p style={styles.loadingText}>Loading user data...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <style>{globalStyles}</style>
            <div style={styles.adminPage}>
                {/* Header */}
                <header style={styles.adminHeader}>
                    <div style={styles.adminTitleBlock}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <button
                                onClick={() => navigation.goBack()}
                                style={styles.btnIcon}
                            >
                                <Ionicons name="arrow-back" size={24} color="#1f2937" />
                            </button>
                            <div style={styles.adminTitleRow}>
                                <h1 style={styles.adminTitle}>{site.siteName}</h1>
                                <span style={styles.adminRoleBadge}>
                                    SITE
                                </span>
                            </div>
                        </div>
                        <p style={{ ...styles.adminSubtitle, marginLeft: '45px' }}>
                            📍 {site.location}
                        </p>
                    </div>
                </header>

                {/* Main Content */}
                <main style={styles.adminContent}>
                    {/* Stats Cards */}
                    {renderStatsContainer()}

                    {/* Pricing Status Bar */}
                    {renderPricingStatusBar()}

                    <div style={styles.adminGrid}>
                        {/* Left Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            {renderAttendanceCard()}
                            {renderSuppliesCard()}
                        </div>

                        {/* Right Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            {renderSupervisorsCard()}
                            {renderAnnouncementsCard()}
                            {renderActivityLogsCard()}
                        </div>
                    </div>
                </main>

                {/* Modals */}
                {renderAnnouncementDetailsModal()}
                {renderAnnouncementsModal()}
                {renderLogsModal()}
            </div>
        </>
    );
};

// Global CSS Styles (Copied from AdminDashboard.web.js + SiteDetails specific additions)
const globalStyles = `
  * {
    box-sizing: border-box;
  }

  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #1f2937;
  }

  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #e5e7eb;
  }

  ::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }

  @media (max-width: 1024px) {
    .admin-grid {
      grid-template-columns: 1fr !important;
    }
    .stats-container {
        flex-direction: column;
    }
    .stat-card {
        width: 100% !important;
        margin-bottom: 10px;
    }
  }
`;

// Inline Styles Object (Copied from AdminDashboard.web.js + SiteDetails specific additions)
const styles = {
    adminLoadingContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #0b7dda 0%, #0056b3 100%)',
    },
    adminLoadingContent: {
        textAlign: 'center',
        color: 'white',
    },
    loadingText: {
        marginTop: '12px',
        fontSize: '16px',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e5e7eb',
        borderTopColor: '#007bff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    adminPage: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        backgroundColor: '#f4f6f9',
    },
    adminHeader: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '20px 30px',
        backgroundColor: '#fff',
        borderBottom: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        gap: '20px',
        flexWrap: 'wrap',
        flexShrink: 0,
    },
    adminTitleBlock: {
        display: 'flex',
        flexDirection: 'column',
    },
    adminTitleRow: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '4px',
    },
    adminTitle: {
        fontSize: '28px',
        fontWeight: '700',
        margin: 0,
        color: '#1f2937',
    },
    adminRoleBadge: {
        backgroundColor: '#007bff',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
        alignSelf: 'center',
        lineHeight: 1,
    },
    adminSubtitle: {
        color: '#6b7280',
        marginTop: '4px',
        fontSize: '14px',
        margin: '4px 0 0 0',
    },
    adminContent: {
        flex: 1,
        padding: '30px',
        width: '100%',
        maxWidth: '1280px',
        margin: '0 auto',
        overflowY: 'auto',
        overflowX: 'hidden',
    },
    adminGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '30px',
        width: '100%',
    },
    adminPanel: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
    },
    adminPanelHeader: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: '1px solid #f3f4f6',
        paddingBottom: '10px',
    },
    adminPanelTitle: {
        fontSize: '20px',
        fontWeight: '700',
        margin: 0,
        color: '#374151',
    },
    adminCardList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    adminCard: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        cursor: 'pointer',
    },
    adminCardContent: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    adminCardTitle: {
        fontSize: '17px',
        fontWeight: '600',
        color: '#1f2937',
        margin: 0,
    },
    adminCardMeta: {
        color: '#6b7280',
        marginTop: '4px',
        fontSize: '13px',
        margin: '4px 0 0 0',
    },
    adminCardSmall: {
        color: '#9ca3af',
        marginTop: '6px',
        fontSize: '12px',
        margin: '6px 0 0 0',
    },
    adminEmptyPanel: {
        padding: '40px 20px',
        textAlign: 'center',
        border: '1px dashed #d1d5db',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        marginTop: '10px',
    },
    adminEmptyText: {
        color: '#9ca3af',
        textAlign: 'center',
        fontStyle: 'italic',
        margin: 0,
    },
    btnPrimary: {
        backgroundColor: '#007bff',
        color: '#fff',
        border: '1px solid #007bff',
        padding: '10px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        fontSize: '14px',
        fontWeight: '600',
        fontFamily: 'inherit',
        boxShadow: '0 4px 6px rgba(0, 123, 255, 0.2)',
    },
    btnGhost: {
        backgroundColor: '#f0f4f8',
        color: '#007bff',
        border: '1px solid #f0f4f8',
        padding: '10px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        fontSize: '14px',
        fontWeight: '600',
        fontFamily: 'inherit',
    },
    btnIcon: {
        backgroundColor: 'transparent',
        color: '#007bff',
        border: 'none',
        padding: '8px',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        fontSize: '14px',
        fontWeight: '600',
        fontFamily: 'inherit',
    },
    // Site Details Specific Styles
    statsContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '30px',
    },
    statCard: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '12px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e5e7eb',
    },
    statNumber: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#1f2937',
        marginTop: '10px',
    },
    statLabel: {
        fontSize: '14px',
        color: '#6b7280',
        marginTop: '5px',
    },
    pricingStatusBar: {
        backgroundColor: '#fff5f5',
        marginBottom: '30px',
        borderRadius: '12px',
        border: '1px solid #ffcccc',
        cursor: 'pointer',
        padding: '0',
        textAlign: 'left',
        width: '100%',
        display: 'block',
    },
    pricingStatusBarSuccess: {
        backgroundColor: '#f0fdf4',
        marginBottom: '30px',
        borderRadius: '12px',
        border: '1px solid #bbf7d0',
        width: '100%',
    },
    pricingStatusContent: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
    },
    pricingStatusLeft: {
        display: 'flex',
        alignItems: 'center',
        flex: 1,
    },
    pricingStatusText: {
        color: '#dc2626',
        fontSize: '15px',
        fontWeight: '600',
        marginLeft: '10px',
    },
    pricingStatusTextSuccess: {
        color: '#16a34a',
        fontSize: '15px',
        fontWeight: '600',
        marginLeft: '10px',
    },
    attendanceProgressContainer: {
        marginBottom: '20px',
    },
    attendanceProgressBar: {
        height: '10px',
        backgroundColor: '#e5e7eb',
        borderRadius: '5px',
        overflow: 'hidden',
        marginBottom: '8px',
    },
    attendanceProgress: {
        height: '100%',
        backgroundColor: '#007bff',
        borderRadius: '5px',
    },
    attendancePercentageText: {
        fontSize: '14px',
        color: '#6b7280',
        textAlign: 'center',
        fontWeight: '600',
    },
    attendanceSummaryStats: {
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: '15px',
    },
    attendanceStat: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    attendanceStatDot: {
        width: '12px',
        height: '12px',
        borderRadius: '6px',
        marginBottom: '8px',
    },
    attendanceStatNumber: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: '4px',
    },
    attendanceStatLabel: {
        fontSize: '12px',
        color: '#6b7280',
    },
    attendanceAlert: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3cd',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: '4px solid #ffc107',
        marginBottom: '15px',
    },
    attendanceAlertText: {
        fontSize: '14px',
        color: '#856404',
        marginLeft: '8px',
        flex: 1,
    },
    // Modal Styles
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContainer: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1f2937',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
    },
    logsList: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        backgroundColor: '#f9fafb',
    },
    logItemModal: {
        display: 'flex',
        alignItems: 'flex-start',
        padding: '12px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        marginBottom: '10px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
    },
    logIconContainerModal: {
        width: '32px',
        height: '32px',
        borderRadius: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: '12px',
        marginTop: '2px',
        flexShrink: 0,
    },
    logContentModal: {
        flex: 1,
    },
    logDescriptionModal: {
        fontSize: '14px',
        color: '#333',
        lineHeight: '20px',
        marginBottom: '4px',
    },
    logTimestampModal: {
        fontSize: '12px',
        color: '#888',
    },
    filterContainer: {
        padding: '12px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        overflowX: 'auto',
    },
    filterContainerContent: {
        display: 'flex',
        gap: '8px',
    },
    filterButtonModal: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderRadius: '20px',
        border: '1px solid #ddd',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
    },
    emptyLogsContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
    },
    emptyLogsText: {
        fontSize: '16px',
        color: '#888',
        marginTop: '15px',
    },
    emptyLogsSubtext: {
        fontSize: '14px',
        color: '#999',
        marginTop: '5px',
        textAlign: 'center',
    },
    // Announcement Details Modal
    detailsModalContent: {
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        backgroundColor: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    detailsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff',
    },
    detailsModalTitle: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1f2937',
    },
    detailsScrollView: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
    },
    detailsContainer: {
        paddingBottom: '20px',
    },
    detailsTitle: {
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '15px',
        lineHeight: '1.3',
    },
    detailsMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '1px solid #eee',
    },
    detailsAuthor: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#555',
    },
    detailsDate: {
        fontSize: '14px',
        color: '#888',
    },
    detailsContent: {
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#333',
        marginBottom: '20px',
        whiteSpace: 'pre-wrap',
    },
    detailsMediaContainer: {
        marginTop: '20px',
    },
    mediaWrapper: {
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #eee',
    },
    mediaActionContainer: {
        padding: '15px',
        borderTop: '1px solid #eee',
        backgroundColor: '#f9fafb',
        display: 'flex',
        justifyContent: 'flex-end',
    },
    announcementItem: {
        width: '100%',
        textAlign: 'left',
        padding: '15px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    announcementHeader: {
        marginBottom: '10px',
    },
    announcementTitleContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '5px',
    },
    announcementTitle: {
        fontSize: '16px',
        fontWeight: '700',
    },
    unreadDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: '#007bff',
    },
    announcementMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#666',
    },
    announcementContent: {
        fontSize: '14px',
        color: '#444',
        marginBottom: '10px',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
    },
    mediaIndicator: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '12px',
        color: '#007bff',
        marginTop: '5px',
    },
    mediaText: {
        marginLeft: '5px',
        fontWeight: '500',
    },
    logIconContainer: {
        marginRight: '12px',
    },
};

export default SiteDetailsScreen;