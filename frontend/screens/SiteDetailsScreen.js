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
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
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
        if (!user || !user.id) {
            console.log('User not available, skipping fetchSiteDetails');
            return;
        }

        try {
            setLoading(true);
            console.log(`Fetching site details with adminId=${user.id} for site ${site._id}`);

            // Add adminId to the query params
            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}?adminId=${user.id}`);
            console.log('Site details response:', response.data);

            if (response.data.success) {
                setSite(response.data.data);

                // Get recent activity logs (last 10 for quick view)
                if (response.data.data.recentActivityLogs) {
                    setActivityLogs(response.data.data.recentActivityLogs.slice(0, 10));
                }
            } else {
                Alert.alert('Error', 'Failed to fetch site details');
            }
        } catch (error) {
            console.error('Fetch site details error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Request URL:', `${API_BASE_URL}/api/sites/${site._id}?adminId=${user.id}`);
            Alert.alert('Error', 'Failed to fetch site details');
        } finally {
            setLoading(false);
        }
    };

    const fetchAnnouncements = async () => {
        if (!user || !user.id) {
            console.log('User not available, skipping fetchAnnouncements');
            return;
        }

        try {
            console.log(`Fetching announcements with adminId=${user.id} for site ${site._id}`);
            // Add adminId to the query params
            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}/announcements?adminId=${user.id}`);
            if (response.data.success) {
                setAnnouncements(response.data.data);
            }
        } catch (error) {
            console.error('Fetch announcements error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Request URL:', `${API_BASE_URL}/api/sites/${site._id}/announcements?adminId=${user.id}`);
        }
    };

    const fetchAllLogs = async (filter = 'all') => {
        if (!user || !user.id) {
            console.log('User not available, skipping fetchAllLogs');
            return;
        }

        try {
            setLoading(true);
            // Add adminId to the query params
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
            console.error('Fetch logs error:', error);
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
                { adminId: user.id } // Include adminId in the request body
            );
            fetchAnnouncements();
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const isAnnouncementUnread = (announcement) => {
        if (!user) return false;
        return !announcement.readBy.some(read => read.user === user.id);
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

            // Request permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant media library permissions to save files.');
                return;
            }

            // Check if the media URI is accessible
            const fileInfo = await FileSystem.getInfoAsync(mediaUri);
            if (!fileInfo.exists) {
                Alert.alert('Error', 'Media file not found or no longer accessible.');
                return;
            }

            // Create asset in gallery
            const asset = await MediaLibrary.createAssetAsync(mediaUri);

            // Get or create album
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
            Alert.alert('Error', 'Failed to save to gallery. Please try again.');
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

    // Get attendance percentage for better visualization
    const getAttendancePercentage = () => {
        const attendance = getTodayAttendance();
        if (attendance.total === 0) return 0;
        return Math.round((attendance.present / attendance.total) * 100);
    };

    const getSuppliesStats = () => {
        console.log('Calculating supplies stats for:', site?.supplies);

        if (!site || !site.supplies || !Array.isArray(site.supplies)) {
            return { items: 0, totalValue: 0 };
        }

        const totalValue = site.supplies.reduce((sum, supply) => {
            // Safety check for supply object
            if (!supply) return sum;

            // Use cost first, then currentPrice, then entryPrice as fallback
            const price = supply.cost || supply.currentPrice || supply.entryPrice || 0;
            const quantity = parseFloat(supply.quantity) || 0;
            const itemValue = price * quantity;

            console.log(`Supply ${supply.itemName || 'Unknown'}:`, {
                cost: supply.cost,
                currentPrice: supply.currentPrice,
                entryPrice: supply.entryPrice,
                usedPrice: price,
                quantity,
                itemValue
            });

            return sum + itemValue;
        }, 0);

        console.log('Total supplies stats:', { items: site.supplies.length, totalValue });

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

    const renderActivityLogItem = ({ item }) => {
        const iconInfo = getLogIcon(item.action);

        return (
            <View style={styles.logItemModal}>
                <View style={[styles.logIconContainerModal, { backgroundColor: iconInfo.color }]}>
                    <Ionicons
                        name={iconInfo.name}
                        size={18}
                        color="#fff"
                    />
                </View>
                <View style={styles.logContentModal}>
                    <Text style={styles.logDescriptionModal}>{item.description}</Text>
                    <Text style={styles.logTimestampModal}>
                        {formatTimestamp(item.timestamp)} • {item.performedByName}
                    </Text>
                </View>
            </View>
        );
    };


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
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setDetailsModalVisible(false)}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {selectedAnnouncement && (
                            <View style={styles.detailsContainer}>
                                <Text style={[
                                    styles.detailsTitle,
                                    selectedAnnouncement.isUrgent && styles.urgentText
                                ]}>
                                    {selectedAnnouncement.isUrgent && '🚨 '}
                                    {selectedAnnouncement.title}
                                </Text>

                                <View style={styles.detailsMeta}>
                                    <Text style={styles.detailsAuthor}>
                                        By {selectedAnnouncement.createdByName}
                                    </Text>
                                    <Text style={styles.detailsDate}>
                                        {formatTimestamp(selectedAnnouncement.createdAt)}
                                    </Text>
                                </View>

                                <Text style={styles.detailsContent}>
                                    {selectedAnnouncement.content}
                                </Text>

                                {selectedAnnouncement.media && (
                                    <View style={styles.detailsMediaContainer}>
                                        {selectedAnnouncement.mediaType === 'image' ? (
                                            <View style={styles.mediaWrapper}>
                                                <Image
                                                    source={{ uri: selectedAnnouncement.media }}
                                                    style={styles.detailsImage}
                                                    resizeMode="contain"
                                                />
                                                <View style={styles.mediaActionContainer}>
                                                    <View style={styles.mediaDivider} />
                                                    <TouchableOpacity
                                                        style={styles.saveToGalleryButton}
                                                        onPress={() => saveToGallery(selectedAnnouncement.media, 'image')}
                                                        disabled={savingToGallery}
                                                    >
                                                        <View style={styles.saveButtonContent}>
                                                            <Ionicons
                                                                name={savingToGallery ? "hourglass" : "download"}
                                                                size={20}
                                                                color="#007bff"
                                                            />
                                                            <Text style={styles.saveToGalleryText}>
                                                                {savingToGallery ? 'Saving...' : 'Save to Gallery'}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={styles.mediaWrapper}>
                                                <VideoPlayer
                                                    videoUri={selectedAnnouncement.media}
                                                    style={styles.detailsVideoPlayer}
                                                />
                                                <View style={styles.mediaActionContainer}>
                                                    <View style={styles.mediaDivider} />
                                                    <TouchableOpacity
                                                        style={styles.saveToGalleryButton}
                                                        onPress={() => saveToGallery(selectedAnnouncement.media, 'video')}
                                                        disabled={savingToGallery}
                                                    >
                                                        <View style={styles.saveButtonContent}>
                                                            <Ionicons
                                                                name={savingToGallery ? "hourglass" : "download"}
                                                                size={20}
                                                                color="#007bff"
                                                            />
                                                            <Text style={styles.saveToGalleryText}>
                                                                {savingToGallery ? 'Saving...' : 'Save Video to Gallery'}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* {selectedAnnouncement.readBy && (
                                    <Text style={styles.detailsReadStatus}>
                                        Read by {selectedAnnouncement.readBy.length} {selectedAnnouncement.readBy.length === 1 ? 'person' : 'people'}
                                    </Text>
                                )} */}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

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
                        <Text style={[
                            styles.announcementTitle,
                            item.isUrgent && styles.urgentText
                        ]}>
                            {item.isUrgent && '🚨 '}
                            {item.title}
                        </Text>
                        {isUnread && <View style={styles.unreadDot} />}
                    </View>
                    <View style={styles.announcementMeta}>
                        <Text style={styles.authorText}>By {item.createdByName}</Text>
                        <Text style={styles.dateText}>{formatTimestamp(item.createdAt)}</Text>
                    </View>
                </View>

                <Text style={styles.announcementContent} numberOfLines={3}>
                    {item.content}
                </Text>

                {item.media && (
                    <TouchableOpacity
                        style={styles.mediaIndicator}
                        onPress={() => handleAnnouncementPress(item)}
                    >
                        <Ionicons
                            name={item.mediaType === 'image' ? 'image' : 'videocam'}
                            size={16}
                            color="#007bff"
                        />
                        <Text style={styles.mediaText}>
                            {item.mediaType === 'image' ? 'View Photo' : 'View Video'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Remove this block:
            {item.readBy && item.readBy.length > 0 && (
                <Text style={styles.readStatus}>
                    Read by {item.readBy.length} {item.readBy.length === 1 ? 'person' : 'people'}
                </Text>
            )}
            */}
            </TouchableOpacity>
        );
    };

    const renderAnnouncementsCard = () => {
        if (user.role !== 'admin') return null;

        const unreadCount = getUnreadAnnouncementsCount();
        const recentAnnouncements = announcements.slice(0, 3);

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Site Announcements</Text>
                <View style={styles.cardContent}>
                    {recentAnnouncements.length > 0 ? (
                        <>
                            {recentAnnouncements.map((announcement, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.announcementPreview,
                                        index === recentAnnouncements.length - 1 && { borderBottomWidth: 0 }
                                    ]}
                                    onPress={() => handleAnnouncementPress(announcement)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.announcementPreviewHeader}>
                                        <View style={styles.announcementIconTitle}>
                                            {announcement.isUrgent ? (
                                                <Ionicons name="warning" size={16} color="#ff4444" style={{ marginRight: 6 }} />
                                            ) : (
                                                <Ionicons name="mail" size={16} color="#007bff" style={{ marginRight: 6 }} />
                                            )}
                                            <Text style={styles.announcementPreviewTitle} numberOfLines={1}>
                                                {announcement.title}
                                            </Text>
                                        </View>
                                        {isAnnouncementUnread(announcement) && (
                                            <View style={styles.unreadDot} />
                                        )}
                                    </View>
                                    <Text style={styles.announcementPreviewContent} numberOfLines={2}>
                                        {announcement.content}
                                    </Text>
                                    <View style={styles.announcementPreviewMeta}>
                                        <Text style={styles.announcementPreviewAuthor}>
                                            By {announcement.createdByName}
                                        </Text>
                                        <Text style={styles.announcementPreviewDate}>
                                            {formatTimestamp(announcement.createdAt)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    ) : (
                        <Text style={styles.emptyText}>No announcements from supervisors yet</Text>
                    )}

                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => setShowAnnouncementsModal(true)}
                    >
                        <Text style={styles.viewAllText}>
                            View All Announcements ({announcements.length})
                        </Text>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
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
                        <>
                            {activityLogs.slice(0, 3).map((log, index) => (
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
                                        <Text style={styles.logDescription} numberOfLines={2}>
                                            {log.description}
                                        </Text>
                                        <Text style={styles.logTimestamp}>
                                            {formatTimestamp(log.timestamp)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    ) : (
                        <Text style={styles.emptyText}>No activity logged yet</Text>
                    )}

                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => {
                            fetchAllLogs('all');
                            setShowLogsModal(true);
                        }}
                    >
                        <Text style={styles.viewAllText}>
                            View All Activity ({activityLogs.length} total)
                        </Text>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>
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
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContainerContent}
            >
                {filters.map((filter) => (
                    <TouchableOpacity
                        key={filter.key}
                        style={[
                            styles.filterButtonModal,
                            logFilter === filter.key && styles.filterButtonActiveModal
                        ]}
                        onPress={() => fetchAllLogs(filter.key)}
                    >
                        <Ionicons
                            name={filter.icon}
                            size={16}
                            color={logFilter === filter.key ? '#fff' : filter.key === 'all' ? '#fff' : '#007bff'}
                            style={{ marginRight: 5 }}
                        />
                        <Text style={[
                            styles.filterTextModal,
                            logFilter === filter.key && styles.filterTextActiveModal
                        ]}>
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };
    const renderAnnouncementsModal = () => (
        <Modal
            visible={showAnnouncementsModal}
            animationType="slide"
            transparent={false}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Site Announcements</Text>
                    <TouchableOpacity onPress={() => setShowAnnouncementsModal(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={announcements}
                    renderItem={renderAnnouncementItem}
                    keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                    style={styles.announcementsList}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={fetchAnnouncements}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyLogsContainer}>
                            <Ionicons name="megaphone-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyLogsText}>No announcements yet</Text>
                            <Text style={styles.emptyLogsSubtext}>
                                Supervisors can create announcements to keep everyone informed
                            </Text>
                        </View>
                    }
                />
            </View>
        </Modal>
    );

    const renderLogsModal = () => (
        <Modal
            visible={showLogsModal}
            animationType="slide"
            transparent={false}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Activity Logs</Text>
                    <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowLogsModal(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {renderLogFilterButtons()}

                <FlatList
                    data={activityLogs}
                    renderItem={renderActivityLogItem}
                    keyExtractor={(item, index) => index.toString()}
                    style={styles.logsList}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={() => fetchAllLogs(logFilter)}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyLogsContainer}>
                            <Ionicons name="document-text-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyLogsText}>No activity logs found</Text>
                        </View>
                    }
                />
            </View>
        </Modal>
    );

    // Update the renderSuppliesCard function
    const renderSuppliesCard = () => {
        const suppliesStats = getSuppliesStats();

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Supplies</Text>
                <View style={styles.cardContent}>
                    {site.supplies && Array.isArray(site.supplies) && site.supplies.length > 0 ? (
                        <>
                            {site.supplies.slice(0, 3).map((supply, index) => (
                                supply ? ( // Add safety check for supply object
                                    <View key={index} style={[
                                        styles.listItem,
                                        index === site.supplies.slice(0, 3).length - 1 && { borderBottomWidth: 0 }
                                    ]}>
                                        <Text style={styles.itemName}>{supply.itemName || 'Unknown Item'}</Text>
                                        <Text style={styles.itemDetails}>
                                            Qty: {supply.quantity || 0} {supply.unit || ''} | Cost: {supply.cost ? `${currencyUnit}${supply.cost}` : 'Pending'}
                                        </Text>
                                    </View>
                                ) : null
                            ))}
                        </>
                    ) : (
                        <Text style={styles.emptyText}>No supplies added yet</Text>
                    )}

                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('ManageSupplies', {
                            site,
                            canEdit: true,
                            adminId: user.role === 'admin' ? user.id : undefined,
                            currencyUnit: currencyUnit
                        })}
                    >
                        <Text style={styles.viewAllText}>
                            {user.role === 'admin' ? 'Manage Supplies' : 'Check Supplies'}
                        </Text>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadCurrencyPreference();
        });

        return unsubscribe;
    }, [navigation]);
    const renderAttendanceCard = () => {
        const attendance = getTodayAttendance();
        const attendancePercentage = getAttendancePercentage();

        return (
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Today's Attendance</Text>
                <View style={styles.cardContent}>
                    <View style={styles.attendanceProgressContainer}>
                        <View style={styles.attendanceProgressBar}>
                            <View
                                style={[
                                    styles.attendanceProgress,
                                    { width: `${attendancePercentage}%` }
                                ]}
                            />
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
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('ManageWorkers', {
                            site,
                            adminId: user.id
                        })}
                    >
                        <Text style={styles.viewAllText}>Check Workers & Attendance</Text>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderSupervisorsCard = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Supervisors</Text>
            <View style={styles.cardContent}>
                {site.supervisors && site.supervisors.length > 0 ? (
                    <>
                        {site.supervisors.map((supervisor, index) => (
                            <View key={index} style={[
                                styles.listItem,
                                index === site.supervisors.length - 1 && { borderBottomWidth: 0 }
                            ]}>
                                <Text style={styles.itemName}>{supervisor.username}</Text>
                            </View>
                        ))}
                    </>
                ) : (
                    <Text style={styles.emptyText}>No supervisors assigned</Text>
                )}

                {user.role === 'admin' && (
                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('ManageSupervisors', {
                            site,
                            adminId: user.id
                        })}
                    >
                        <Text style={styles.viewAllText}>Manage Supervisors</Text>
                        <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#007bff" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderPricingStatusBar = () => {
        // Only show to admin
        if (user.role !== 'admin') return null;

        // Add proper null/undefined checks
        if (!site || !site.supplies || !Array.isArray(site.supplies) || site.supplies.length === 0) {
            return null;
        }

        console.log('Checking pricing status for supplies:', site.supplies.map(s => ({
            itemName: s.itemName,
            cost: s.cost,
            status: s.status,
            isPriced: s.isPriced,
            currentPrice: s.currentPrice
        })));

        // More comprehensive check for pending pricing with safety checks
        const pendingSupplies = site.supplies.filter(supply => {
            // Safety checks first
            if (!supply) return false;

            const hasCost = supply.cost && !isNaN(supply.cost) && Number(supply.cost) > 0;
            const isPriced = supply.isPriced === true || supply.status === 'priced';
            const hasCurrentPrice = supply.currentPrice && !isNaN(supply.currentPrice) && Number(supply.currentPrice) > 0;

            // A supply needs pricing if it doesn't have cost OR isn't marked as priced OR has pending status
            const needsPricing = !hasCost && !isPriced && !hasCurrentPrice;

            console.log(`Supply ${supply.itemName || 'Unknown'}:`, {
                hasCost,
                isPriced,
                hasCurrentPrice,
                needsPricing,
                status: supply.status
            });

            return needsPricing;
        });

        const pendingCount = pendingSupplies ? pendingSupplies.length : 0;

        console.log('Pending supplies count:', pendingCount);
        console.log('Pending supplies:', pendingSupplies ? pendingSupplies.map(s => s.itemName || 'Unknown') : []);

        if (pendingCount > 0) {
            return (
                <TouchableOpacity
                    style={styles.pricingStatusBar}
                    onPress={() => navigation.navigate('ManageSupplies', {
                        site,
                        canEdit: true,
                        adminId: user.id,
                        currencyUnit: currencyUnit
                    })}
                    activeOpacity={0.8}
                >
                    <View style={styles.pricingStatusContent}>
                        <View style={styles.pricingStatusLeft}>
                            <Ionicons name="alert-circle" size={20} color="#ff4444" />
                            <Text style={styles.pricingStatusText}>
                                {pendingCount} {pendingCount === 1 ? 'supply item needs' : 'supply items need'} pricing
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
                            <Text style={styles.pricingStatusTextSuccess}>
                                All supplies priced
                            </Text>
                        </View>
                    </View>
                </View>
            );
        }
    };

    // Stats Container
    const renderStatsContainer = () => {
        const attendance = getTodayAttendance();
        const suppliesStats = getSuppliesStats();
        const totalValue = suppliesStats.totalValue || 0; // Ensure it's never undefined

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Ionicons name="cube-outline" size={isIpad ? 40 : 32} color="#007bff" />
                    <Text style={styles.statNumber}>{suppliesStats.items}</Text>
                    <Text style={styles.statLabel}>Supply Items</Text>
                </View>

                <View style={styles.statCard}>
                    <Ionicons name="cash-outline" size={isIpad ? 40 : 32} color="#28a745" />
                    <Text style={styles.statNumber}>{currencyUnit}{totalValue.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Total Value</Text>
                </View>

                <View style={styles.statCard}>
                    <Ionicons name="people-outline" size={isIpad ? 40 : 32} color="#ffc107" />
                    <Text style={styles.statNumber}>{attendance.present}/{attendance.total}</Text>
                    <Text style={styles.statLabel}>Present Today</Text>
                </View>
            </View>
        );
    };

    // Show a loading indicator if user isn't available yet
    if (!user) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ marginTop: 20, color: '#fff' }}>Loading user data...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#2094f3" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Site Details</Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={isIpad ? 28 : 24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={() => {
                            fetchSiteDetails();
                            fetchAnnouncements();
                        }}
                        colors={['#fff']}
                        tintColor="#fff"
                    />
                }
            >
                {/* Site Info Card */}
                <View style={styles.welcomeContainer}>
                    <View style={styles.siteInfoCard}>
                        <Text style={styles.siteName}>{site.siteName}</Text>
                        <Text style={styles.siteLocation}>📍 {site.location}</Text>
                        {site.description && (
                            <Text style={styles.siteDescription}>{site.description}</Text>
                        )}
                    </View>
                </View>

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
            </ScrollView>
        </SafeAreaView>
    );
};

// Updated styles to match the provided SupervisorDashboard styling
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#2094f3',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
    },
    container: {
        flex: 1,
        backgroundColor: '#2094f3',
    },
    header: {
        backgroundColor: '#2094f3',
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1
    },
    title: {

        fontSize: isIpad ? 28 : 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    backButton: {
        backgroundColor: '#000',
        borderRadius: 25,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#2094f3',
    },
    welcomeContainer: {
        padding: 20,
        backgroundColor: '#2094f3',
        marginBottom: 20,
    },
    siteInfoCard: {
        backgroundColor: '#FFFFFF',
        padding: isIpad ? 24 : 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    siteName: {
        fontSize: isIpad ? 22 : 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    siteLocation: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        marginBottom: 10,
    },
    siteDescription: {
        fontSize: isIpad ? 14 : 12,
        color: '#777',
        fontStyle: 'italic',
        lineHeight: 18,
    },
    pricingStatusBar: {
        backgroundColor: '#fff5f5',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ffcccc',
        overflow: 'hidden',
    },
    pricingStatusBarSuccess: {
        backgroundColor: '#f0fdf4',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        overflow: 'hidden',
    },
    pricingStatusContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    pricingStatusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    pricingStatusText: {
        color: '#dc2626',
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
        marginLeft: 10,
    },
    pricingStatusTextSuccess: {
        color: '#16a34a',
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
        marginLeft: 10,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        padding: isIpad ? 20 : 16,
        borderRadius: 15,
        alignItems: 'center',
        width: (screenWidth - 80) / 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statNumber: {
        fontSize: isIpad ? 20 : 14,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
        marginBottom: 4,
        textAlign: 'center', // Automatically reduce font size to fit
        numberOfLines: 1,            // Limit to one line      // Don't shrink smaller than 70% of original size
    },
    statLabel: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        margin: 20,
        marginTop: 0,
        marginBottom: 20,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden'
    },
    cardTitle: {
        fontSize: isIpad ? 20 : 18,
        fontWeight: 'bold',
        color: '#333',
        padding: isIpad ? 24 : 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    cardContent: {
        padding: isIpad ? 20 : 16,
        paddingTop: 10
    },
    attendanceProgressContainer: {
        marginBottom: 20,
    },
    attendanceProgressBar: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    attendanceProgress: {
        height: '100%',
        backgroundColor: '#FFB74D',
        borderRadius: 4,
    },
    attendancePercentageText: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        textAlign: 'center',
        fontWeight: '600',
    },
    attendanceSummaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
    },
    attendanceStat: {
        alignItems: 'center',
    },
    attendanceStatDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    attendanceStatNumber: {
        fontSize: isIpad ? 26 : 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    attendanceStatLabel: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        textAlign: 'center',
    },
    attendanceAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3cd',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
        marginBottom: 15
    },
    attendanceAlertText: {
        fontSize: isIpad ? 16 : 14,
        color: '#856404',
        marginLeft: 8,
        flex: 1,
    },
    listItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    itemName: {
        fontSize: isIpad ? 16 : 15,
        fontWeight: '500',
        color: '#000',
        marginBottom: 4
    },
    itemDetails: {
        fontSize: isIpad ? 14 : 13,
        color: '#666',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        marginTop: 10
    },
    viewAllText: {
        color: '#007bff',
        fontSize: isIpad ? 16 : 14,
        fontWeight: '500'
    },
    emptyText: {
        fontSize: isIpad ? 16 : 14,
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 20,
    },
    // Announcements Styles
    announcementPreview: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    urgentPreview: {
        backgroundColor: '#fff5f5',
        borderLeftWidth: 3,
        borderLeftColor: '#ff4444',
        paddingLeft: 10,
        marginLeft: -10,
        borderRadius: 5
    },
    unreadPreview: {
        backgroundColor: '#f8f9ff',
        borderLeftWidth: 3,
        borderLeftColor: '#007bff',
        paddingLeft: 10,
        marginLeft: -10,
        borderRadius: 5
    },
    announcementPreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingRight: 10 // Add padding to ensure dot isn't cut off
    },
    announcementIconTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8 // Add margin to create space for the dot
    },
    announcementPreviewTitle: {
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginRight: 4 // Add margin to create space for the dot
    },
    urgentText: {
        color: '#ff4444'
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#007bff',
        marginLeft: 4
    },
    announcementPreviewContent: {
        fontSize: isIpad ? 15 : 13,
        color: '#666',
        lineHeight: isIpad ? 20 : 18,
        marginBottom: 8
    },
    announcementPreviewMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    announcementPreviewAuthor: {
        fontSize: isIpad ? 13 : 11,
        color: '#999',
        fontWeight: '500'
    },
    announcementPreviewDate: {
        fontSize: isIpad ? 13 : 11,
        color: '#999'
    },
    // Activity Logs Styles
    logItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    logIconContainer: {
        marginRight: 12,
        marginTop: 2
    },
    logContent: {
        flex: 1
    },
    logDescription: {
        fontSize: isIpad ? 15 : 13,
        color: '#333',
        lineHeight: isIpad ? 22 : 20
    },
    logTimestamp: {
        fontSize: isIpad ? 13 : 11,
        color: '#888',
        marginTop: 4
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isIpad ? 24 : 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingTop: Platform.OS === 'ios' ? (isIpad ? 36 : 50) : 20
    },
    modalTitle: {
        fontSize: isIpad ? 22 : 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeModalButton: {
        padding: 8,
    },
    filterContainer: {
        backgroundColor: '#f5f5f5',
        paddingVertical: isIpad ? 16 : 12,
        maxHeight: isIpad ? 80 : 70,
    },
    filterContainerContent: {
        paddingHorizontal: isIpad ? 16 : 12,
    },
    filterButtonModal: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: isIpad ? 18 : 15,
        paddingVertical: isIpad ? 10 : 8,
        marginRight: isIpad ? 12 : 8,
        borderRadius: 30,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterButtonActiveModal: {
        backgroundColor: '#2094f3',
        borderColor: '#2094f3',
    },
    filterTextModal: {
        fontSize: isIpad ? 15 : 13,
        color: '#333',
        fontWeight: '500',
    },
    filterTextActiveModal: {
        color: '#fff',
    },

    // Log Item Styles
    logItemModal: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: isIpad ? 16 : 12,
        paddingHorizontal: isIpad ? 20 : 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    logIconContainerModal: {
        width: isIpad ? 36 : 32,
        height: isIpad ? 36 : 32,
        borderRadius: isIpad ? 18 : 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: isIpad ? 16 : 12,
        marginTop: 2,
    },
    logContentModal: {
        flex: 1,
    },
    logDescriptionModal: {
        fontSize: isIpad ? 16 : 14,
        color: '#333',
        lineHeight: isIpad ? 22 : 20,
        marginBottom: 4,
    },
    logTimestampModal: {
        fontSize: isIpad ? 14 : 12,
        color: '#888',
    },

    // List Styles
    logsList: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 15,
        maxHeight: '90%',
        width: isIpad ? '80%' : '95%'
    },
    logsList: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 1
    },
    announcementsList: {
        flex: 1,
        backgroundColor: '#fff'
    },
    emptyLogsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 100
    },
    emptyLogsText: {
        fontSize: isIpad ? 18 : 16,
        color: '#888',
        marginTop: 15,
        textAlign: 'center'
    },
    emptyLogsSubtext: {
        fontSize: isIpad ? 16 : 14,
        color: '#999',
        marginTop: 10,
        textAlign: 'center'
    },
    // Announcement Modal Item Styles
    announcementItem: {
        backgroundColor: '#fff',
        margin: 10,
        padding: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    urgentAnnouncement: {
        borderLeftWidth: 4,
        borderLeftColor: '#ff4444'
    },
    unreadAnnouncement: {
        backgroundColor: '#f8f9ff',
        borderWidth: 1,
        borderColor: '#e3f2fd'
    },
    announcementHeader: {
        marginBottom: 10
    },
    announcementTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 5
    },
    announcementTitle: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1
    },
    announcementMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    authorText: {
        fontSize: isIpad ? 13 : 11,
        color: '#666',
        fontWeight: '500'
    },
    dateText: {
        fontSize: isIpad ? 13 : 11,
        color: '#999'
    },
    announcementContent: {
        fontSize: isIpad ? 16 : 14,
        color: '#333',
        lineHeight: isIpad ? 22 : 20,
        marginBottom: 10
    },
    mediaIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 10
    },
    mediaText: {
        fontSize: isIpad ? 14 : 12,
        color: '#007bff',
        marginLeft: 5
    },
    readStatus: {
        fontSize: isIpad ? 13 : 11,
        color: '#666',
        marginTop: 5,
        fontStyle: 'italic'
    },
    // Filter Styles
    filterContainer: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 15,
        maxHeight: isIpad ? 70 : 60
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginRight: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#007bff',
        backgroundColor: '#fff'
    },
    filterButtonActive: {
        backgroundColor: '#007bff',
        borderColor: '#007bff'
    },
    filterText: {
        fontSize: isIpad ? 14 : 12,
        color: '#007bff',
        marginLeft: 5,
        fontWeight: '500'
    },
    filterTextActive: {
        color: '#fff'
    },
    // Details Modal Styles
    detailsModalContent: {
        maxHeight: '90%',
        width: isIpad ? '80%' : '95%',
        backgroundColor: '#fff',
        borderRadius: 15,
        overflow: 'hidden'
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#f8f9fa'
    },
    detailsModalTitle: {
        fontSize: isIpad ? 20 : 18,
        fontWeight: 'bold',
        color: '#333'
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#fff'
    },
    detailsContainer: {
        padding: 20
    },
    detailsTitle: {
        fontSize: isIpad ? 26 : 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        lineHeight: isIpad ? 34 : 30
    },
    detailsMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    detailsAuthor: {
        fontSize: isIpad ? 18 : 16,
        color: '#666',
        fontWeight: '600'
    },
    detailsDate: {
        fontSize: isIpad ? 16 : 14,
        color: '#999'
    },
    detailsContent: {
        fontSize: isIpad ? 18 : 16,
        color: '#333',
        lineHeight: isIpad ? 28 : 24,
        marginBottom: 20
    },
    detailsMediaContainer: {
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        backgroundColor: '#fff'
    },
    mediaWrapper: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden'
    },
    mediaActionContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 0
    },
    mediaDivider: {
        height: 1,
        backgroundColor: '#e9ecef',
        marginVertical: 0
    },
    detailsImage: {
        width: '100%',
        height: isIpad ? 400 : 300,
        backgroundColor: '#f8f9fa'
    },
    detailsVideoPlayer: {
        width: '100%',
        height: isIpad ? 350 : 250,
        backgroundColor: '#000'
    },
    detailsReadStatus: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee'
    },
    // Video Player Styles
    videoContainer: {
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: 8,
        overflow: 'hidden'
    },
    video: {
        width: '100%',
        height: '100%'
    },
    // Save to Gallery Button Styles
    saveToGalleryButton: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 0,
        borderWidth: 0,
        marginTop: 0
    },
    saveToGalleryText: {
        color: '#007bff',
        fontSize: isIpad ? 18 : 16,
        fontWeight: '600',
        marginLeft: 8
    },
    saveButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
});

export default SiteDetailsScreen;
