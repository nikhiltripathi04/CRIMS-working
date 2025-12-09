import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
    FlatList,
    Modal,
    Image,
    Dimensions,
    Platform,
    StatusBar,
    SafeAreaView,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get screen dimensions for responsive design
const { width: screenWidth } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

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

    // Video Player Component
    const VideoPlayer = ({ videoUri, style }) => {
        const [status, setStatus] = useState({});

        return (
            <View style={[styles.videoContainer, style]}>
                <Video
                    source={{ uri: videoUri }}
                    style={styles.video}
                    useNativeControls
                    resizeMode="contain"
                    isLooping={false}
                    onPlaybackStatusUpdate={setStatus}
                    shouldPlay={false}
                />
            </View>
        );
    };

    useEffect(() => {
        loadCurrencyPreference();
    }, []);

    const loadCurrencyPreference = async () => {
        try {
            const savedCurrency = await AsyncStorage.getItem('supplyCurrency');
            if (savedCurrency) {
                setCurrencyUnit(savedCurrency);
            }
        } catch (error) {
            console.log('Error loading currency preference:', error);
        }
    };

    useEffect(() => {
        if (user && user.id) {
            fetchSiteDetails();
            fetchAnnouncements();
        }
    }, [user]);

    const fetchSiteDetails = async () => {
        if (!user || !user.id) return;

        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}?adminId=${user.id}`);
            if (response.data.success) {
                setSite(response.data.data);
                if (response.data.data.recentActivityLogs) {
                    setActivityLogs(response.data.data.recentActivityLogs.slice(0, 10));
                }
            }
        } catch (error) {
            console.error('Fetch site details error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnnouncements = async () => {
        if (!user || !user.id) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}/announcements?adminId=${user.id}`);
            if (response.data.success) {
                setAnnouncements(response.data.data);
            }
        } catch (error) {
            console.error('Fetch announcements error:', error);
        }
    };

    const fetchAllLogs = async (filter = 'all') => {
        if (!user || !user.id) return;

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
            }
        } catch (error) {
            console.error('Fetch logs error:', error);
            Alert.alert('Error', 'Failed to fetch activity logs');
        } finally {
            setLoading(false);
        }
    };

    const markAnnouncementAsRead = async (announcementId) => {
        if (!user || !user.id) return;
        try {
            await axios.post(
                `${API_BASE_URL}/api/sites/${site._id}/announcements/${announcementId}/read`,
                { adminId: user.id }
            );
            fetchAnnouncements();
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const isAnnouncementUnread = (announcement) => {
        if (!user) return false;
        return !announcement.readBy?.some(read => read.user === user.id);
    };

    const getUnreadAnnouncementsCount = () => {
        return announcements.filter(announcement => isAnnouncementUnread(announcement)).length;
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

    // Save to Gallery Function
    const saveToGallery = async (mediaUri, mediaType) => {
        try {
            setSavingToGallery(true);
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant media library permissions to save files.');
                return;
            }

            const fileInfo = await FileSystem.getInfoAsync(mediaUri);
            if (!fileInfo.exists) {
                Alert.alert('Error', 'Media file not found or no longer accessible.');
                return;
            }

            const asset = await MediaLibrary.createAssetAsync(mediaUri);
            let album = await MediaLibrary.getAlbumAsync('Site Announcements');
            if (!album) {
                album = await MediaLibrary.createAlbumAsync('Site Announcements', asset, false);
            } else {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            }

            Alert.alert(
                'Success',
                `${mediaType === 'image' ? 'Image' : 'Video'} saved to gallery in "Site Announcements" album.`
            );

        } catch (error) {
            console.error('Save to gallery error:', error);
            Alert.alert('Error', 'Failed to save to gallery.');
        } finally {
            setSavingToGallery(false);
        }
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
            return sum + (price * quantity);
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
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }
    };

    const getLogIcon = (action) => {
        switch (action) {
            case 'supply_added': return { name: 'add-circle', color: '#28a745' };
            case 'supply_updated': return { name: 'create', color: '#ffc107' };
            case 'supply_deleted': return { name: 'trash', color: '#dc3545' };
            case 'worker_added': return { name: 'person-add', color: '#28a745' };
            case 'worker_updated': return { name: 'person', color: '#ffc107' };
            case 'worker_deleted': return { name: 'person-remove', color: '#dc3545' };
            case 'attendance_marked':
            case 'attendance_updated': return { name: 'calendar', color: '#17a2b8' };
            case 'announcement_created': return { name: 'megaphone', color: '#ff6b35' };
            case 'announcement_updated': return { name: 'create', color: '#ffc107' };
            case 'announcement_deleted': return { name: 'trash', color: '#dc3545' };
            case 'site_created': return { name: 'business', color: '#007bff' };
            case 'site_updated': return { name: 'create', color: '#ffc107' };
            case 'supervisor_added': return { name: 'person-add', color: '#6f42c1' };
            case 'supervisor_removed': return { name: 'person-remove', color: '#dc3545' };
            default: return { name: 'information-circle', color: '#6c757d' };
        }
    };

    // --- Render Helpers ---

    const renderAnnouncementItem = ({ item }) => {
        const isUnread = isAnnouncementUnread(item);
        return (
            <TouchableOpacity
                style={[
                    styles.announcementItem,
                    item.isUrgent && styles.urgentAnnouncement,
                    isUnread && styles.unreadAnnouncement
                ]}
                onPress={() => handleAnnouncementPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.announcementHeader}>
                    <View style={styles.announcementTitleContainer}>
                        <Text style={[styles.announcementTitle, item.isUrgent && styles.urgentText]}>
                            {item.isUrgent && '🚨 '}{item.title}
                        </Text>
                        {isUnread && <View style={styles.unreadDot} />}
                    </View>
                    <View style={styles.announcementMeta}>
                        <Text style={styles.authorText}>By {item.createdByName}</Text>
                        <Text style={styles.dateText}>{formatTimestamp(item.createdAt)}</Text>
                    </View>
                </View>
                <Text style={styles.announcementContent} numberOfLines={3}>{item.content}</Text>
                {item.media && (
                    <View style={styles.mediaIndicator}>
                        <Ionicons
                            name={item.mediaType === 'image' ? 'image' : 'videocam'}
                            size={16}
                            color="#007bff"
                        />
                        <Text style={styles.mediaText}>
                            {item.mediaType === 'image' ? 'View Photo' : 'View Video'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderStatsContainer = () => {
        const attendance = getTodayAttendance();
        const suppliesStats = getSuppliesStats();
        const totalValue = suppliesStats.totalValue || 0;

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Ionicons name="cube-outline" size={isIpad ? 28 : 24} color="#007bff" />
                    <Text style={styles.statNumber}>{suppliesStats.items}</Text>
                    <Text style={styles.statLabel}>Items</Text>
                </View>

                <View style={styles.statCard}>
                    <Ionicons name="cash-outline" size={isIpad ? 28 : 24} color="#28a745" />
                    <Text style={styles.statNumber}>{currencyUnit}{totalValue.toFixed(0)}</Text>
                    <Text style={styles.statLabel}>Value</Text>
                </View>

                <View style={styles.statCard}>
                    <Ionicons name="people-outline" size={isIpad ? 28 : 24} color="#ffc107" />
                    <Text style={styles.statNumber}>{attendance.present}/{attendance.total}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                </View>
            </View>
        );
    };

    const renderPricingStatusBar = () => {
        if (user.role !== 'admin' || !site || !site.supplies || !Array.isArray(site.supplies) || site.supplies.length === 0) return null;

        const pendingSupplies = site.supplies.filter(supply => {
            if (!supply) return false;
            const hasCost = supply.cost && !isNaN(supply.cost) && Number(supply.cost) > 0;
            const isPriced = supply.isPriced === true || supply.status === 'priced';
            const hasCurrentPrice = supply.currentPrice && !isNaN(supply.currentPrice) && Number(supply.currentPrice) > 0;
            return !hasCost && !isPriced && !hasCurrentPrice;
        });

        const pendingCount = pendingSupplies ? pendingSupplies.length : 0;

        if (pendingCount > 0) {
            return (
                <TouchableOpacity
                    style={styles.pricingStatusBar}
                    onPress={() => navigation.navigate('ManageSupplies', { site, canEdit: true, adminId: user.id, currencyUnit })}
                    activeOpacity={0.8}
                >
                    <View style={styles.pricingStatusContent}>
                        <View style={styles.pricingStatusLeft}>
                            <Ionicons name="alert-circle" size={20} color="#ff4444" />
                            <Text style={styles.pricingStatusText}>
                                {pendingCount} {pendingCount === 1 ? 'item needs' : 'items need'} pricing
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#ff4444" />
                    </View>
                </TouchableOpacity>
            );
        } else {
            return (
                <View style={styles.pricingStatusBarSuccess}>
                    <View style={styles.pricingStatusContent}>
                        <View style={styles.pricingStatusLeft}>
                            <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                            <Text style={styles.pricingStatusTextSuccess}>All supplies priced</Text>
                        </View>
                    </View>
                </View>
            );
        }
    };

    const renderAttendanceCard = () => {
        const attendance = getTodayAttendance();
        const attendancePercentage = getAttendancePercentage();

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Today's Attendance</Text>
                <View style={styles.cardContent}>
                    <View style={styles.attendanceProgressContainer}>
                        <View style={styles.attendanceProgressBar}>
                            <View style={[styles.attendanceProgress, { width: `${attendancePercentage}%` }]} />
                        </View>
                        <Text style={styles.attendancePercentageText}>{attendancePercentage}% Present</Text>
                    </View>

                    <View style={styles.attendanceSummaryStats}>
                        <View style={styles.attendanceStat}>
                            <View style={[styles.attendanceStatDot, { backgroundColor: '#28a745' }]} />
                            <Text style={styles.attendanceStatNumber}>{attendance.present}</Text>
                            <Text style={styles.attendanceStatLabel}>Present</Text>
                        </View>
                        <View style={styles.attendanceStat}>
                            <View style={[styles.attendanceStatDot, { backgroundColor: '#dc3545' }]} />
                            <Text style={styles.attendanceStatNumber}>{attendance.absent}</Text>
                            <Text style={styles.attendanceStatLabel}>Absent</Text>
                        </View>
                        <View style={styles.attendanceStat}>
                            <View style={[styles.attendanceStatDot, { backgroundColor: '#ffc107' }]} />
                            <Text style={styles.attendanceStatNumber}>{attendance.notMarked}</Text>
                            <Text style={styles.attendanceStatLabel}>Not Marked</Text>
                        </View>
                    </View>

                    {attendance.notMarked > 0 && (
                        <View style={styles.attendanceAlert}>
                            <Ionicons name="warning-outline" size={16} color="#856404" />
                            <Text style={styles.attendanceAlertText}>
                                {attendance.notMarked} worker{attendance.notMarked > 1 ? 's' : ''} attendance not marked
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('ManageWorkers', { site, adminId: user.id })}
                    >
                        <Text style={styles.actionButtonText}>Check Workers & Attendance</Text>
                        <Ionicons name="chevron-forward" size={16} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderSuppliesCard = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Supplies</Text>
            <View style={styles.cardContent}>
                {site.supplies && site.supplies.length > 0 ? (
                    site.supplies.slice(0, 3).map((supply, index) => (
                        <View key={index} style={[
                            styles.supplyItem,
                            index === site.supplies.slice(0, 3).length - 1 && { borderBottomWidth: 0 }
                        ]}>
                            <Text style={styles.supplyName}>{supply.itemName || 'Unknown Item'}</Text>
                            <Text style={styles.supplyMeta}>
                                Qty: {supply.quantity || 0} {supply.unit || ''} | Cost: {supply.cost ? `${currencyUnit}${supply.cost}` : 'Pending'}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No supplies added yet</Text>
                )}

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => Alert.alert("Coming Soon", "This feature is currently under development.")}
                >
                    <Text style={styles.actionButtonText}>Manage Supplies</Text>
                    <Ionicons name="chevron-forward" size={16} color="#007bff" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSupervisorsCard = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Supervisors</Text>
            <View style={styles.cardContent}>
                {site.supervisors && site.supervisors.length > 0 ? (
                    site.supervisors.map((supervisor, index) => (
                        <View key={index} style={[
                            styles.supervisorItem,
                            index === site.supervisors.length - 1 && { borderBottomWidth: 0 }
                        ]}>
                            <View style={styles.supervisorIcon}>
                                <Ionicons name="person" size={16} color="#666" />
                            </View>
                            <Text style={styles.supervisorName}>{supervisor.username}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No supervisors assigned</Text>
                )}

                {user.role === 'admin' && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('ManageSupervisors', { site, adminId: user.id })}
                    >
                        <Text style={styles.actionButtonText}>Manage Supervisors</Text>
                        <Ionicons name="chevron-forward" size={16} color="#007bff" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderAnnouncementsCard = () => {
        if (user.role !== 'admin') return null;
        const recentAnnouncements = announcements.slice(0, 3);

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Site Announcements</Text>
                <View style={styles.cardContent}>
                    {recentAnnouncements.length > 0 ? (
                        recentAnnouncements.map((announcement, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.announcementPreview,
                                    index === recentAnnouncements.length - 1 && { borderBottomWidth: 0 }
                                ]}
                                onPress={() => handleAnnouncementPress(announcement)}
                            >
                                <View style={styles.announcementPreviewHeader}>
                                    <View style={styles.announcementIconTitle}>
                                        <Ionicons
                                            name={announcement.isUrgent ? "warning" : "mail"}
                                            size={16}
                                            color={announcement.isUrgent ? "#ff4444" : "#007bff"}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={styles.announcementPreviewTitle} numberOfLines={1}>
                                            {announcement.title}
                                        </Text>
                                    </View>
                                    {isAnnouncementUnread(announcement) && <View style={styles.unreadDot} />}
                                </View>
                                <Text style={styles.announcementPreviewContent} numberOfLines={2}>
                                    {announcement.content}
                                </Text>
                                <Text style={styles.announcementPreviewMeta}>
                                    By {announcement.createdByName} • {formatTimestamp(announcement.createdAt)}
                                </Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No announcement from supervisors</Text>
                    )}

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setShowAnnouncementsModal(true)}
                    >
                        <Text style={styles.actionButtonText}>View All ({announcements.length})</Text>
                        <Ionicons name="chevron-forward" size={16} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderActivityLogsCard = () => {
        if (user.role !== 'admin') return null;

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Recent Activity</Text>
                <View style={styles.cardContent}>
                    {activityLogs && activityLogs.length > 0 ? (
                        activityLogs.slice(0, 3).map((log, index) => (
                            <View key={index} style={[
                                styles.logItem,
                                index === activityLogs.slice(0, 3).length - 1 && { borderBottomWidth: 0 }
                            ]}>
                                <View style={styles.logIconContainer}>
                                    <Ionicons
                                        name={getLogIcon(log.action).name}
                                        size={16}
                                        color={getLogIcon(log.action).color}
                                    />
                                </View>
                                <View style={styles.logContent}>
                                    <Text style={styles.logDescription} numberOfLines={2}>{log.description}</Text>
                                    <Text style={styles.logTimestamp}>{formatTimestamp(log.timestamp)}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No activity logged yet</Text>
                    )}

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            fetchAllLogs('all');
                            setShowLogsModal(true);
                        }}
                    >
                        <Text style={styles.actionButtonText}>View All ({activityLogs.length})</Text>
                        <Ionicons name="chevron-forward" size={16} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // --- Modal Renders ---

    const renderAnnouncementDetailsModal = () => (
        <Modal
            visible={detailsModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setDetailsModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, styles.detailsModalContent]}>
                    <View style={styles.detailsHeader}>
                        <Text style={styles.detailsModalTitle}>Announcement Details</Text>
                        <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {selectedAnnouncement && (
                            <View style={styles.detailsContainer}>
                                <Text style={[styles.detailsTitle, selectedAnnouncement.isUrgent && styles.urgentText]}>
                                    {selectedAnnouncement.isUrgent && '🚨 '}{selectedAnnouncement.title}
                                </Text>
                                <View style={styles.detailsMeta}>
                                    <Text style={styles.detailsAuthor}>By {selectedAnnouncement.createdByName}</Text>
                                    <Text style={styles.detailsDate}>{formatTimestamp(selectedAnnouncement.createdAt)}</Text>
                                </View>
                                <Text style={styles.detailsContent}>{selectedAnnouncement.content}</Text>
                                {selectedAnnouncement.media && (
                                    <View style={styles.detailsMediaContainer}>
                                        {selectedAnnouncement.mediaType === 'image' ? (
                                            <Image source={{ uri: selectedAnnouncement.media }} style={styles.detailsImage} resizeMode="contain" />
                                        ) : (
                                            <VideoPlayer videoUri={selectedAnnouncement.media} style={styles.detailsVideoPlayer} />
                                        )}
                                        <View style={styles.mediaActionContainer}>
                                            <TouchableOpacity
                                                style={styles.saveToGalleryButton}
                                                onPress={() => saveToGallery(selectedAnnouncement.media, selectedAnnouncement.mediaType)}
                                                disabled={savingToGallery}
                                            >
                                                <Ionicons name={savingToGallery ? "hourglass" : "download"} size={20} color="#007bff" />
                                                <Text style={styles.saveToGalleryText}>{savingToGallery ? 'Saving...' : 'Save to Gallery'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderAnnouncementsModal = () => (
        <Modal visible={showAnnouncementsModal} animationType="slide" transparent={false}>
            <SafeAreaView style={styles.fullScreenModal}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Site Announcements</Text>
                    <TouchableOpacity onPress={() => setShowAnnouncementsModal(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={announcements}
                    renderItem={renderAnnouncementItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAnnouncements} />}
                    ListEmptyComponent={<Text style={styles.emptyText}>No announcements found</Text>}
                />
            </SafeAreaView>
        </Modal>
    );

    const renderLogsModal = () => (
        <Modal visible={showLogsModal} animationType="slide" transparent={false}>
            <SafeAreaView style={styles.fullScreenModal}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Activity Logs</Text>
                    <TouchableOpacity onPress={() => setShowLogsModal(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
                {/* Filter buttons can be added here similar to existing code if needed */}
                <FlatList
                    data={activityLogs}
                    renderItem={({ item }) => (
                        <View style={styles.logItemModal}>
                            <View style={[styles.logIconContainerModal, { backgroundColor: getLogIcon(item.action).color }]}>
                                <Ionicons name={getLogIcon(item.action).name} size={18} color="#fff" />
                            </View>
                            <View style={styles.logContentModal}>
                                <Text style={styles.logDescriptionModal}>{item.description}</Text>
                                <Text style={styles.logTimestampModal}>{formatTimestamp(item.timestamp)} • {item.performedByName}</Text>
                            </View>
                        </View>
                    )}
                    keyExtractor={item => item._id}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchAllLogs('all')} />}
                    ListEmptyComponent={<Text style={styles.emptyText}>No logs found</Text>}
                />
            </SafeAreaView>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#2094f3" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.headerTitleBlock}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.headerTitle}>{site.siteName}</Text>
                        <View style={styles.roleBadge}><Text style={styles.roleText}>SITE</Text></View>
                    </View>
                    <Text style={styles.headerSubtitle}>📍 {site.location}</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { fetchSiteDetails(); fetchAnnouncements(); }} />}
            >
                {renderStatsContainer()}
                {renderPricingStatusBar()}

                <View style={styles.gridContainer}>
                    {renderSupervisorsCard()}
                    {renderSuppliesCard()}
                    

                    {renderActivityLogsCard()}
                </View>
            </ScrollView>

            {renderAnnouncementDetailsModal()}
            {renderAnnouncementsModal()}
            {renderLogsModal()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f4f6f9' },
    header: {
        backgroundColor: '#fff',
        paddingVertical: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        elevation: 2,
    },
    backButton: { marginRight: 15 },
    headerTitleBlock: { flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
    headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    roleBadge: { backgroundColor: '#007bff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    contentContainer: { padding: 20 },

    // Stats
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2
    },
    statNumber: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 5 },
    statLabel: { fontSize: 12, color: '#666' },

    // Pricing Bar
    pricingStatusBar: {
        backgroundColor: '#fff5f5', marginBottom: 20, borderRadius: 12, borderWidth: 1, borderColor: '#ffcccc',
        padding: 12
    },
    pricingStatusBarSuccess: {
        backgroundColor: '#f0fdf4', marginBottom: 20, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0',
        padding: 12
    },
    pricingStatusContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pricingStatusLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    pricingStatusText: { color: '#dc2626', fontSize: 14, fontWeight: '600', marginLeft: 10 },
    pricingStatusTextSuccess: { color: '#16a34a', fontSize: 14, fontWeight: '600', marginLeft: 10 },

    // Cards
    gridContainer: { gap: 20 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, elevation: 2, marginBottom: 5 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    cardContent: {},
    emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },

    // Attendance
    attendanceProgressContainer: { marginBottom: 15 },
    attendanceProgressBar: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden', marginBottom: 5 },
    attendanceProgress: { height: '100%', backgroundColor: '#007bff' },
    attendancePercentageText: { textAlign: 'center', fontSize: 12, color: '#666', fontWeight: '600' },
    attendanceSummaryStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
    attendanceStat: { alignItems: 'center' },
    attendanceStatDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 5 },
    attendanceStatNumber: { fontWeight: 'bold', color: '#333' },
    attendanceStatLabel: { fontSize: 10, color: '#666' },
    attendanceAlert: { flexDirection: 'row', backgroundColor: '#fff3cd', padding: 10, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
    attendanceAlertText: { marginLeft: 8, color: '#856404', fontSize: 12, flex: 1 },

    // Action Button
    actionButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f0f4f8', padding: 12, borderRadius: 8, marginTop: 10
    },
    actionButtonText: { color: '#007bff', fontWeight: '600', marginRight: 5 },

    // Supply items
    supplyItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    supplyName: { fontSize: 16, color: '#333', fontWeight: '500' },
    supplyMeta: { fontSize: 12, color: '#666', marginTop: 2 },

    // Supervisors
    supervisorItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    supervisorIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    supervisorName: { fontSize: 16, color: '#333' },

    // Announcement
    announcementPreview: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    announcementPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    announcementIconTitle: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    announcementPreviewTitle: { fontWeight: '600', color: '#333', flex: 1 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007bff', marginLeft: 5 },
    announcementPreviewContent: { fontSize: 13, color: '#555', marginBottom: 4 },
    announcementPreviewMeta: { fontSize: 11, color: '#999' },

    // Logs
    logItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    logIconContainer: { marginRight: 10, marginTop: 2 },
    logContent: { flex: 1 },
    logDescription: { color: '#333', fontSize: 14, marginBottom: 2 },
    logTimestamp: { color: '#999', fontSize: 11 },

    // Full Screen Modal
    fullScreenModal: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },

    // Modal Items
    logItemModal: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    logIconContainerModal: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    logContentModal: { flex: 1 },
    logDescriptionModal: { fontSize: 14, color: '#333', marginBottom: 4 },
    logTimestampModal: { fontSize: 12, color: '#888' },

    // Details Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
    detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    detailsModalTitle: { fontSize: 18, fontWeight: 'bold' },
    detailsContainer: { padding: 20 },
    detailsTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#333' },
    urgentText: { color: '#ff4444' },
    detailsMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    detailsAuthor: { fontWeight: '600', color: '#555' },
    detailsDate: { color: '#888' },
    detailsContent: { fontSize: 16, lineHeight: 24, color: '#333', marginBottom: 20 },
    detailsImage: { width: '100%', height: 200, borderRadius: 8 },
    detailsVideoPlayer: { width: '100%', height: 250, backgroundColor: '#000', borderRadius: 8 },
    mediaActionContainer: { marginTop: 15, alignItems: 'center' },
    saveToGalleryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0f2fe', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
    saveToGalleryText: { color: '#007bff', fontWeight: '600', marginLeft: 8 },
});

export default SiteDetailsScreen;
