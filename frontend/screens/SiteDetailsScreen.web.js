import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { IoArrowBack } from 'react-icons/io5'; // Import the specific arrow-back icon
//import localforage from 'localforage'; // Web alternative to AsyncStorage

// Import CSS file
import '../styles/SiteDetailsScreen.css';

// Mock Ionicons for a functional web environment.
// In a real project, you'd use a proper icon library like FontAwesome with a CDN or react-icons.
const Ionicons = ({ name, size, color, style }) => (
    <i className={`ion-${name}`} style={{ fontSize: size, color, ...style }}></i>
);

// Mock the Dimensions to a fixed size or window size for web
const screenWidth = window.innerWidth;
const isIpad = screenWidth >= 768;

// Mock Expo components/functions for web
const VideoPlayer = ({ videoUri, style }) => {
    return (
        <div className={`video-container ${style ? style.className : ''}`}>
            <video
                src={videoUri}
                controls
                style={{ width: '100%', height: '100%' }}
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
        className={style.className}
        style={{ objectFit: resizeMode || 'contain' }}
    />
);

const ActivityIndicator = ({ size, color }) => (
    <div className="activity-indicator" style={{ color }}>Loading...</div>
);

const Alert = {
    alert: (title, message) => window.alert(`${title}\n${message}`)
};

// Mock MediaLibrary/FileSystem functions, as they are RN/Expo specific
const saveToGallery = async (mediaUri, mediaType) => {
    // In a real web app, this would trigger a download.
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
            const savedCurrency = await localforage.getItem('supplyCurrency');
            if (savedCurrency) {
                setCurrencyUnit(savedCurrency);
            }
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
        // Mocking the navigation 'focus' event for web
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
            <div key={index} className="log-item-modal">
                <div className="log-icon-container-modal" style={{ backgroundColor: iconInfo.color }}>
                    <Ionicons
                        name={iconInfo.name}
                        size={18}
                        color="#fff"
                    />
                </div>
                <div className="log-content-modal">
                    <div className="log-description-modal">{item.description}</div>
                    <div className="log-timestamp-modal">
                        {formatTimestamp(item.timestamp)} • {item.performedByName}
                    </div>
                </div>
            </div>
        );
    };

    const renderAnnouncementDetailsModal = () => (
        detailsModalVisible && selectedAnnouncement && (
            <div className="modal-overlay" onClick={() => setDetailsModalVisible(false)}>
                <div className="modal-content details-modal-content" onClick={e => e.stopPropagation()}>
                    <div className="details-header">
                        <div className="details-modal-title">Announcement Details</div>
                        <button
                            className="close-button"
                            onClick={() => setDetailsModalVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </button>
                    </div>

                    <div className="details-scroll-view">
                        <div className="details-container">
                            <div className={`details-title ${selectedAnnouncement.isUrgent ? 'urgent-text' : ''}`}>
                                {selectedAnnouncement.isUrgent && '🚨 '}
                                {selectedAnnouncement.title}
                            </div>

                            <div className="details-meta">
                                <div className="details-author">
                                    By {selectedAnnouncement.createdByName}
                                </div>
                                <div className="details-date">
                                    {formatTimestamp(selectedAnnouncement.createdAt)}
                                </div>
                            </div>

                            <div className="details-content">
                                {selectedAnnouncement.content}
                            </div>

                            {selectedAnnouncement.media && (
                                <div className="details-media-container">
                                    <div className="media-wrapper">
                                        {selectedAnnouncement.mediaType === 'image' ? (
                                            <Image
                                                source={{ uri: selectedAnnouncement.media }}
                                                style={{ className: 'details-image' }}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <VideoPlayer
                                                videoUri={selectedAnnouncement.media}
                                                style={{ className: 'details-video-player' }}
                                            />
                                        )}
                                        <div className="media-action-container">
                                            <div className="media-divider" />
                                            <button
                                                className="save-to-gallery-button"
                                                onClick={() => handleSaveToGallery(selectedAnnouncement.media, selectedAnnouncement.mediaType)}
                                                disabled={savingToGallery}
                                            >
                                                <div className="save-button-content">
                                                    <Ionicons
                                                        name={savingToGallery ? "hourglass" : "download"}
                                                        size={20}
                                                        color="#007bff"
                                                    />
                                                    <span className="save-to-gallery-text">
                                                        {savingToGallery ? 'Saving...' : selectedAnnouncement.mediaType === 'image' ? 'Save to Gallery' : 'Save Video to Gallery'}
                                                    </span>
                                                </div>
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
                className={`announcement-item ${item.isUrgent ? 'urgent-announcement' : ''} ${isUnread ? 'unread-announcement' : ''}`}
                onClick={() => handleAnnouncementPress(item)}
            >
                <div className="announcement-header">
                    <div className="announcement-title-container">
                        <div className={`announcement-title ${item.isUrgent ? 'urgent-text' : ''}`}>
                            {item.isUrgent && '🚨 '}
                            {item.title}
                        </div>
                        {isUnread && <div className="unread-dot" />}
                    </div>
                    <div className="announcement-meta">
                        <div className="author-text">By {item.createdByName}</div>
                        <div className="date-text">{formatTimestamp(item.createdAt)}</div>
                    </div>
                </div>

                <div className="announcement-content" style={{ WebkitLineClamp: 3 }}>
                    {item.content}
                </div>

                {item.media && (
                    <button
                        className="media-indicator"
                        onClick={(e) => { e.stopPropagation(); handleAnnouncementPress(item); }}
                    >
                        <Ionicons
                            name={item.mediaType === 'image' ? 'image' : 'videocam'}
                            size={16}
                            color="#007bff"
                        />
                        <span className="media-text">
                            {item.mediaType === 'image' ? 'View Photo' : 'View Video'}
                        </span>
                    </button>
                )}
            </button>
        );
    };

    const renderAnnouncementsCard = () => {
        if (user.role !== 'admin') return null;

        const recentAnnouncements = announcements.slice(0, 3);

        return (
            <div className="card">
                <div className="card-title">Site Announcements</div>
                <div className="card-content">
                    {recentAnnouncements.length > 0 ? (
                        <>
                            {recentAnnouncements.map((announcement, index) => (
                                <button
                                    key={index}
                                    className={`announcement-preview ${index === recentAnnouncements.length - 1 ? 'last-item' : ''}`}
                                    onClick={() => handleAnnouncementPress(announcement)}
                                >
                                    <div className="announcement-preview-header">
                                        <div className="announcement-icon-title">
                                            {announcement.isUrgent ? (
                                                <Ionicons name="warning" size={16} color="#ff4444" style={{ marginRight: 6 }} />
                                            ) : (
                                                <Ionicons name="mail" size={16} color="#007bff" style={{ marginRight: 6 }} />
                                            )}
                                            <div className="announcement-preview-title">{announcement.title}</div>
                                        </div>
                                        {isAnnouncementUnread(announcement) && (
                                            <div className="unread-dot" />
                                        )}
                                    </div>
                                    <div className="announcement-preview-content">{announcement.content}</div>
                                    <div className="announcement-preview-meta">
                                        <div className="announcement-preview-author">
                                            By {announcement.createdByName}
                                        </div>
                                        <div className="announcement-preview-date">
                                            {formatTimestamp(announcement.createdAt)}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </>
                    ) : (
                        <div className="empty-text">No announcements from supervisors yet</div>
                    )}

                    <button
                        className="view-all-button"
                        onClick={() => setShowAnnouncementsModal(true)}
                    >
                        <div className="view-all-text">
                            View All Announcements ({announcements.length})
                        </div>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </button>
                </div>
            </div>
        );
    };

    const renderActivityLogsCard = () => {
        if (user.role !== 'admin') return null;

        return (
            <div className="card">
                <div className="card-title">Recent Activity</div>
                <div className="card-content">
                    {activityLogs && activityLogs.length > 0 ? (
                        <>
                            {activityLogs.slice(0, 3).map((log, index) => (
                                <div key={index} className={`log-item ${index === activityLogs.slice(0, 3).length - 1 ? 'last-item' : ''}`}>
                                    <div className="log-icon-container">
                                        <Ionicons
                                            name={getLogIcon(log.action).name}
                                            size={16}
                                            color={getLogIcon(log.action).color}
                                        />
                                    </div>
                                    <div className="log-content">
                                        <div className="log-description">{log.description}</div>
                                        <div className="log-timestamp">
                                            {formatTimestamp(log.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="empty-text">No activity logged yet</div>
                    )}

                    <button
                        className="view-all-button"
                        onClick={() => {
                            fetchAllLogs('all');
                            setShowLogsModal(true);
                        }}
                    >
                        <div className="view-all-text">
                            View All Activity ({activityLogs.length} total)
                        </div>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
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
            <div className="filter-container">
                <div className="filter-container-content">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            className={`filter-button-modal ${logFilter === filter.key ? 'filter-button-active-modal' : ''}`}
                            onClick={() => fetchAllLogs(filter.key)}
                        >
                            <Ionicons
                                name={filter.icon}
                                size={16}
                                color={logFilter === filter.key ? '#fff' : '#007bff'}
                                style={{ marginRight: 5 }}
                            />
                            <span className={`filter-text-modal ${logFilter === filter.key ? 'filter-text-active-modal' : ''}`}>
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
            <div className="modal-container">
                <div className="modal-header">
                    <div className="modal-title">Site Announcements</div>
                    <button onClick={() => setShowAnnouncementsModal(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </button>
                </div>

                <div className="announcements-list">
                    {announcements.length > 0 ? (
                        announcements.map(renderAnnouncementItem)
                    ) : (
                        <div className="empty-logs-container">
                            <Ionicons name="megaphone-outline" size={64} color="#ccc" />
                            <div className="empty-logs-text">No announcements yet</div>
                            <div className="empty-logs-subtext">
                                Supervisors can create announcements to keep everyone informed
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    );

    const renderLogsModal = () => (
        showLogsModal && (
            <div className="modal-container">
                <div className="modal-header">
                    <div className="modal-title">Activity Logs</div>
                    <button className="close-modal-button" onClick={() => setShowLogsModal(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </button>
                </div>

                {renderLogFilterButtons()}

                <div className="logs-list">
                    {activityLogs.length > 0 ? (
                        activityLogs.map(renderActivityLogItem)
                    ) : (
                        <div className="empty-logs-container">
                            <Ionicons name="document-text-outline" size={64} color="#ccc" />
                            <div className="empty-logs-text">No activity logs found</div>
                        </div>
                    )}
                </div>
            </div>
        )
    );

    const renderSuppliesCard = () => {
        const suppliesStats = getSuppliesStats();

        return (
            <div className="card">
                <div className="card-title">Supplies</div>
                <div className="card-content">
                    {site.supplies && Array.isArray(site.supplies) && site.supplies.length > 0 ? (
                        <>
                            {site.supplies.slice(0, 3).map((supply, index) => (
                                supply ? (
                                    <div key={index} className={`list-item ${index === site.supplies.slice(0, 3).length - 1 ? 'last-item' : ''}`}>
                                        <div className="item-name">{supply.itemName || 'Unknown Item'}</div>
                                        <div className="item-details">
                                            Qty: {supply.quantity || 0} {supply.unit || ''} | Cost: {supply.cost ? `${currencyUnit}${supply.cost}` : 'Pending'}
                                        </div>
                                    </div>
                                ) : null
                            ))}
                        </>
                    ) : (
                        <div className="empty-text">No supplies added yet</div>
                    )}

                    <button
                        className="view-all-button"
                        onClick={() => navigation.navigate('ManageSupplies', {
                            site,
                            canEdit: true,
                            adminId: user.role === 'admin' ? user.id : undefined,
                            currencyUnit: currencyUnit
                        })}
                    >
                        <div className="view-all-text">
                            {user.role === 'admin' ? 'Manage Supplies' : 'Check Supplies'}
                        </div>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </button>
                </div>
            </div>
        );
    };

    const renderAttendanceCard = () => {
        const attendance = getTodayAttendance();
        const attendancePercentage = getAttendancePercentage();

        return (
            <div className="card">
                <div className="card-title">Today's Attendance</div>
                <div className="card-content">
                    <div className="attendance-progress-container">
                        <div className="attendance-progress-bar">
                            <div
                                className="attendance-progress"
                                style={{ width: `${attendancePercentage}%` }}
                            />
                        </div>
                        <div className="attendance-percentage-text">{attendancePercentage}% Present</div>
                    </div>

                    <div className="attendance-summary-stats">
                        <div className="attendance-stat">
                            <div className="attendance-stat-dot" style={{ backgroundColor: '#28a745' }} />
                            <div className="attendance-stat-number">{attendance.present}</div>
                            <div className="attendance-stat-label">Present</div>
                        </div>
                        <div className="attendance-stat">
                            <div className="attendance-stat-dot" style={{ backgroundColor: '#dc3545' }} />
                            <div className="attendance-stat-number">{attendance.absent}</div>
                            <div className="attendance-stat-label">Absent</div>
                        </div>
                        <div className="attendance-stat">
                            <div className="attendance-stat-dot" style={{ backgroundColor: '#ffc107' }} />
                            <div className="attendance-stat-number">{attendance.notMarked}</div>
                            <div className="attendance-stat-label">Not Marked</div>
                        </div>
                    </div>

                    {attendance.notMarked > 0 && (
                        <div className="attendance-alert">
                            <Ionicons name="warning-outline" size={16} color="#856404" />
                            <div className="attendance-alert-text">
                                {attendance.notMarked} worker{attendance.notMarked > 1 ? 's' : ''} attendance not marked
                            </div>
                        </div>
                    )}

                    <button
                        className="view-all-button"
                        onClick={() => navigation.navigate('ManageWorkers', {
                            site,
                            adminId: user.id
                        })}
                    >
                        <div className="view-all-text">Check Workers & Attendance</div>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </button>
                </div>
            </div>
        );
    };

    const renderSupervisorsCard = () => (
        <div className="card">
            <div className="card-title">Supervisors</div>
            <div className="card-content">
                {site.supervisors && site.supervisors.length > 0 ? (
                    <>
                        {site.supervisors.map((supervisor, index) => (
                            <div key={index} className={`list-item ${index === site.supervisors.length - 1 ? 'last-item' : ''}`}>
                                <div className="item-name">{supervisor.username}</div>
                            </div>
                        ))}
                    </>
                ) : (
                    <div className="empty-text">No supervisors assigned</div>
                )}

                {user.role === 'admin' && (
                    <button
                        className="view-all-button"
                        onClick={() => navigation.navigate('ManageSupervisors', {
                            site,
                            adminId: user.id
                        })}
                    >
                        <div className="view-all-text">Manage Supervisors</div>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
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
                    className="pricing-status-bar"
                    onClick={() => navigation.navigate('ManageSupplies', {
                        site,
                        canEdit: true,
                        adminId: user.id,
                        currencyUnit: currencyUnit
                    })}
                >
                    <div className="pricing-status-content">
                        <div className="pricing-status-left">
                            <Ionicons name="alert-circle" size={20} color="#ff4444" />
                            <div className="pricing-status-text">
                                {pendingCount} {pendingCount === 1 ? 'supply item needs' : 'supply items need'} pricing
                            </div>
                        </div>
                        <Ionicons name="chevron-forward" size={20} color="#ff4444" />
                    </div>
                </button>
            );
        } else {
            return (
                <div className="pricing-status-bar-success">
                    <div className="pricing-status-content">
                        <div className="pricing-status-left">
                            <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                            <div className="pricing-status-text-success">
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
            <div className="stats-container">
                <div className="stat-card">
                    <Ionicons name="cube-outline" size={isIpad ? 40 : 32} color="#007bff" />
                    <div className="stat-number">{suppliesStats.items}</div>
                    <div className="stat-label">Supply Items</div>
                </div>

                <div className="stat-card">
                    <Ionicons name="cash-outline" size={isIpad ? 40 : 32} color="#28a745" />
                    <div className="stat-number">{currencyUnit}{totalValue.toFixed(2)}</div>
                    <div className="stat-label">Total Value</div>
                </div>

                <div className="stat-card">
                    <Ionicons name="people-outline" size={isIpad ? 40 : 32} color="#ffc107" />
                    <div className="stat-number">{attendance.present}/{attendance.total}</div>
                    <div className="stat-label">Present Today</div>
                </div>
            </div>
        );
    };

    if (!user) {
        return (
            <div className="container center-content">
                <ActivityIndicator size="large" color="#fff" />
                <div className="loading-text">Loading user data...</div>
            </div>
        );
    }

    return (
        <div className="safe-area">
            {/* Header */}
            <div className="header">
                <div className="header-content">
                    <div className="title">Site Details</div>
                </div>
                <button
                    onClick={() => navigation.goBack()}
                    className="back-button"
                >
                    <IoArrowBack size={isIpad ? 28 : 24} color="#FFFFFF" />
                </button>
                
            </div>

            <div className="scroll-view">
                {/* Site Info Card */}
                <div className="welcome-container">
                    <div className="site-info-card">
                        <div className="site-name">{site.siteName}</div>
                        <div className="site-location">📍 {site.location}</div>
                        {site.description && (
                            <div className="site-description">{site.description}</div>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                {renderStatsContainer()}

                {/* Pricing Status Bar */}
                {renderPricingStatusBar()}

                {/* Main Content Cards */}
                {renderAttendanceCard()}
                {renderSuppliesCard()}
                {renderSupervisorsCard()}
                {renderAnnouncementsCard()}
                {renderActivityLogsCard()}

                {/* Modals */}
                {renderAnnouncementDetailsModal()}
                {renderAnnouncementsModal()}
                {renderLogsModal()}
            </div>
        </div>
    );
};

export default SiteDetailsScreen;