import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Modal,
    TextInput,
    RefreshControl,
    Image,
    Switch,
    ScrollView,
    Linking,
    Platform,
    ActivityIndicator,
    Dimensions,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../context/AuthContext';
import * as MediaLibrary from 'expo-media-library';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const Announcements = ({ route, navigation }) => {
    const { site, canEdit = false } = route.params;
    const [announcements, setAnnouncements] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        isUrgent: false
    });
    const { API_BASE_URL, user } = useAuth();

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const resetForm = () => {
        setFormData({
            title: '',
            content: '',
            isUrgent: false
        });
        setEditingAnnouncement(null);
    };

    const showAnnouncementDetails = (announcement) => {
        setSelectedAnnouncement(announcement);
        setDetailsModalVisible(true);
    };

    const openModal = (announcement = null) => {
        if (announcement) {
            setFormData({
                title: announcement.title,
                content: announcement.content,
                isUrgent: announcement.isUrgent
            });
            setEditingAnnouncement(announcement);
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const saveAnnouncement = async () => {
        if (!formData.title || !formData.content) {
            Alert.alert('Error', 'Please fill in title and content');
            return;
        }

        try {
            // Determine which authentication parameter to use
            const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';

            const announcementData = {
                title: formData.title,
                content: formData.content,
                isUrgent: formData.isUrgent,
                [authParam]: user.id, // Use the appropriate auth parameter
                createdByName: user?.username || (user.role === 'admin' ? 'Admin' : 'Supervisor')
            };

            let response;
            if (editingAnnouncement) {
                response = await axios.put(
                    `${API_BASE_URL}/api/sites/${site._id}/announcements/${editingAnnouncement._id}?${authParam}=${user.id}`,
                    announcementData
                );
            } else {
                response = await axios.post(
                    `${API_BASE_URL}/api/sites/${site._id}/announcements?${authParam}=${user.id}`,
                    announcementData
                );
            }

            if (response.data.success) {
                fetchAnnouncements();
                setModalVisible(false);
                resetForm();
                Alert.alert('Success', `Announcement ${editingAnnouncement ? 'updated' : 'created'} successfully`);
            }
        } catch (error) {
            console.error('Save announcement error:', error);
            Alert.alert('Error', 'Failed to save announcement');
        }
    };

    // Quick delete function for list items
    const quickDeleteAnnouncement = async (announcementId, event) => {
        event.stopPropagation(); // Prevent opening the announcement details

        Alert.alert(
            'Delete Announcement',
            'Are you sure you want to delete this announcement?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';

                            const response = await axios.delete(
                                `${API_BASE_URL}/api/sites/${site._id}/announcements/${announcementId}?${authParam}=${user.id}`
                            );

                            if (response.data.success) {
                                fetchAnnouncements();
                                Alert.alert('Success', 'Announcement deleted successfully');
                            }
                        } catch (error) {
                            console.error('Delete announcement error:', error);
                            Alert.alert('Error', 'Failed to delete announcement');
                        }
                    }
                }
            ]
        );
    };

    const deleteAnnouncement = async (announcementId) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this announcement?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';

                            const response = await axios.delete(
                                `${API_BASE_URL}/api/sites/${site._id}/announcements/${announcementId}?${authParam}=${user.id}`
                            );

                            if (response.data.success) {
                                fetchAnnouncements();
                                setDetailsModalVisible(false);
                                Alert.alert('Success', 'Announcement deleted successfully');
                            }
                        } catch (error) {
                            console.error('Delete announcement error:', error);
                            Alert.alert('Error', 'Failed to delete announcement');
                        }
                    }
                }
            ]
        );
    };

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);

            // Use the appropriate auth parameter based on user role
            const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';

            const response = await axios.get(
                `${API_BASE_URL}/api/sites/${site._id}/announcements?${authParam}=${user.id}`
            );

            if (response.data.success) {
                setAnnouncements(response.data.data);
            }
        } catch (error) {
            console.error('Fetch announcements error:', error);
            Alert.alert('Error', 'Failed to fetch announcements');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setDetailsModalVisible(false)}
                        >
                            <Ionicons name="close" size={isIpad ? 28 : 24} color="#333" />
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
                                        {formatDate(selectedAnnouncement.createdAt)}
                                    </Text>
                                </View>

                                <Text style={styles.detailsContent}>
                                    {selectedAnnouncement.content}
                                </Text>

                                {canEdit && selectedAnnouncement.createdBy === user?.id && (
                                    <View style={styles.detailsActions}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.editActionButton]}
                                            onPress={() => {
                                                setDetailsModalVisible(false);
                                                openModal(selectedAnnouncement);
                                            }}
                                        >
                                            <Ionicons name="pencil" size={isIpad ? 24 : 20} color="#fff" />
                                            <Text style={styles.actionButtonText}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.deleteActionButton]}
                                            onPress={() => {
                                                deleteAnnouncement(selectedAnnouncement._id);
                                            }}
                                        >
                                            <Ionicons name="trash" size={isIpad ? 24 : 20} color="#fff" />
                                            <Text style={styles.actionButtonText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderAnnouncementItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={[
                    styles.announcementCard,
                    item.isUrgent && styles.urgentAnnouncement
                ]}
                onPress={() => showAnnouncementDetails(item)}
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
                        <View style={styles.announcementActions}>
                            {canEdit && (
                                <TouchableOpacity
                                    onPress={(event) => quickDeleteAnnouncement(item._id, event)}
                                    style={styles.quickDeleteButton}
                                >
                                    <Ionicons name="trash-outline" size={isIpad ? 24 : 20} color="#ff4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    <View style={styles.announcementMeta}>
                        <Text style={styles.authorText}>By {item.createdByName}</Text>
                        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                    </View>
                </View>

                <Text style={styles.announcementContent} numberOfLines={3}>
                    {item.content}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>
                                    {canEdit ? 'Site Announcements' : 'Announcements'}
                                </Text>
                                {announcements.length > 0 && (
                                    <Text style={styles.subtitle}>
                                        {site.siteName}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Content Area */}
                        <View style={styles.contentArea}>
                            <FlatList
                                data={announcements}
                                renderItem={renderAnnouncementItem}
                                keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                                contentContainerStyle={styles.listContainer}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={loading}
                                        onRefresh={fetchAnnouncements}
                                        colors={["#2094F3"]}
                                        tintColor="#2094F3"
                                    />
                                }
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Ionicons name="megaphone-outline" size={isIpad ? 80 : 64} color="#9CA3AF" />
                                        <Text style={styles.emptyText}>No announcements yet</Text>
                                        {canEdit && (
                                            <Text style={styles.emptySubtext}>
                                                Create your first announcement to keep everyone informed
                                            </Text>
                                        )}
                                    </View>
                                }
                            />

                            {canEdit && (
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => openModal()}
                                >
                                    <Ionicons name="add" size={isIpad ? 30 : 24} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {renderAnnouncementDetailsModal()}

            {/* Create/Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={() => {
                    setModalVisible(false);
                    resetForm();
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.createModalContent}>
                        <View style={styles.createModalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                            </Text>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Ionicons name="close" size={isIpad ? 28 : 24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.createModalBody}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Title *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter announcement title"
                                    value={formData.title}
                                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                                    maxLength={100}
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Content *</Text>
                                <TextInput
                                    style={[styles.input, styles.contentInput]}
                                    placeholder="Enter announcement content"
                                    value={formData.content}
                                    onChangeText={(text) => setFormData({ ...formData, content: text })}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    maxLength={1000}
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.switchContainer}>
                                <View style={styles.switchLabelContainer}>
                                    <Text style={styles.switchLabel}>Mark as Urgent</Text>
                                    <Text style={styles.switchDescription}>
                                        Urgent announcements will be highlighted
                                    </Text>
                                </View>
                                <Switch
                                    value={formData.isUrgent}
                                    onValueChange={(value) => setFormData({ ...formData, isUrgent: value })}
                                    trackColor={{ false: '#e1e1e1', true: '#ff4444' }}
                                    thumbColor={formData.isUrgent ? '#fff' : '#f4f3f4'}
                                />
                            </View>

                            {formData.isUrgent && (
                                <View style={styles.urgentWarning}>
                                    <Ionicons name="warning" size={isIpad ? 24 : 20} color="#ff4444" />
                                    <Text style={styles.urgentWarningText}>
                                        This announcement will be highlighted and prioritized for all users
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.createModalFooter}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelModalButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelModalButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.createModalButton]}
                                onPress={saveAnnouncement}
                            >
                                <Text style={styles.createModalButtonText}>
                                    {editingAnnouncement ? 'Update' : 'Create'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    mainContainer: {
        flex: 1,
        maxWidth: '100%',
        alignSelf: 'center',
        width: '100%',
        marginTop: screenHeight * 0.025,
    },
    header: {
        paddingHorizontal: screenWidth * (isIpad ? 0.04 : 0.05),
        paddingTop: screenHeight * (isIpad ? 0.08 : 0.06),
        paddingBottom: screenHeight * (isIpad ? 0.04 : 0.03),
    },
    title: {
        color: '#FFFFFF',
        fontSize: screenWidth * (isIpad ? 0.04 : 0.06),
        fontWeight: 'bold',
        marginBottom: screenHeight * (isIpad ? 0.01 : 0.005),
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: screenWidth * (isIpad ? 0.023 : 0.035),
        fontWeight: '400',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderTopLeftRadius: screenWidth * 0.08,
        borderTopRightRadius: screenWidth * 0.08,
        paddingHorizontal: screenWidth * (isIpad ? 0.04 : 0.04),
        paddingTop: screenHeight * (isIpad ? 0.04 : 0.03),
        paddingBottom: screenHeight * (isIpad ? 0.06 : 0.04),
        minHeight: screenHeight * (isIpad ? 0.7 : 0.75),
    },
    listContainer: {
        paddingBottom: screenHeight * 0.1,
    },
    announcementCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: isIpad ? 20 : 16,
        padding: isIpad ? 24 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f1f3f4',
    },
    urgentAnnouncement: {
        borderLeftWidth: 5,
        borderLeftColor: '#ff4444',
        backgroundColor: '#fffbfb',
    },
    unreadAnnouncement: {
        borderWidth: 2,
        borderColor: '#2094F3',
        backgroundColor: '#f8f9ff',
    },
    announcementHeader: {
        marginBottom: isIpad ? 16 : 12,
    },
    announcementTitleContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: isIpad ? 12 : 8,
    },
    announcementTitle: {
        fontSize: isIpad ? 22 : 18,
        fontWeight: '600',
        color: '#212529',
        flex: 1,
        marginRight: 12,
        lineHeight: isIpad ? 28 : 24,
    },
    urgentText: {
        color: '#ff4444',
    },
    announcementActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    unreadDot: {
        width: isIpad ? 12 : 10,
        height: isIpad ? 12 : 10,
        borderRadius: isIpad ? 6 : 5,
        backgroundColor: '#2094F3',
    },
    quickDeleteButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#fff5f5',
    },
    announcementMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    authorText: {
        fontSize: isIpad ? 16 : 14,
        color: '#6c757d',
        fontWeight: '500',
    },
    dateText: {
        fontSize: isIpad ? 16 : 14,
        color: '#6c757d',
    },
    announcementContent: {
        fontSize: isIpad ? 18 : 16,
        color: '#495057',
        lineHeight: isIpad ? 26 : 22,
        marginBottom: isIpad ? 16 : 12,
    },
    mediaContainer: {
        marginTop: isIpad ? 16 : 12,
        borderRadius: 8,
        overflow: 'hidden',
    },
    mediaImage: {
        width: '100%',
        height: isIpad ? 250 : 200,
        borderRadius: 8,
    },
    listVideoPlayer: {
        width: '100%',
        height: isIpad ? 250 : 200,
        borderRadius: 8,
    },
    readStatus: {
        fontSize: isIpad ? 14 : 12,
        color: '#6c757d',
        marginTop: isIpad ? 16 : 12,
        fontStyle: 'italic',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: isIpad ? 60 : 40,
        marginTop: isIpad ? 120 : 80,
    },
    emptyText: {
        fontSize: isIpad ? 24 : 20,
        color: '#6c757d',
        marginTop: isIpad ? 24 : 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: isIpad ? 18 : 16,
        color: '#adb5bd',
        marginTop: isIpad ? 12 : 8,
        textAlign: 'center',
        lineHeight: isIpad ? 26 : 22,
    },
    addButton: {
        position: 'absolute',
        right: isIpad ? 32 : 20,
        bottom: isIpad ? 32 : 20,
        width: isIpad ? 64 : 56,
        height: isIpad ? 64 : 56,
        borderRadius: isIpad ? 32 : 28,
        backgroundColor: '#2094F3',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#2094F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: isIpad ? 60 : 40,
        paddingHorizontal: isIpad ? 40 : 20,
    },
    createModalContent: {
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: isIpad ? 600 : 400,
        height: isIpad ? '80%' : '85%',
        borderRadius: 16,
        overflow: 'hidden',
        margin: 0,
        flexDirection: 'column',
        justifyContent: 'flex-start',
    },
    modalContent: {
        backgroundColor: '#fff',
        width: isIpad ? '80%' : '90%',
        maxHeight: isIpad ? '85%' : '80%',
        borderRadius: 16,
        padding: isIpad ? 32 : 20,
    },
    detailsModalContent: {
        maxHeight: isIpad ? '90%' : '90%',
    },
    createModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isIpad ? 24 : 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        backgroundColor: '#fff',
        flexShrink: 0,
    },
    createModalBody: {
        flex: 1,
        padding: isIpad ? 24 : 20,
        backgroundColor: '#fff',
        minHeight: 0,
    },
    createModalFooter: {
        flexDirection: 'row',
        padding: isIpad ? 24 : 20,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        gap: 12,
        backgroundColor: '#fff',
        flexShrink: 0,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: isIpad ? 20 : 15,
    },
    closeButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#f8f9fa',
    },
    modalCloseButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#f8f9fa',
    },
    detailsContainer: {
        paddingBottom: isIpad ? 32 : 20,
    },
    detailsTitle: {
        fontSize: isIpad ? 28 : 24,
        fontWeight: '700',
        color: '#212529',
        marginBottom: isIpad ? 20 : 16,
        lineHeight: isIpad ? 36 : 30,
    },
    detailsMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isIpad ? 24 : 20,
        paddingBottom: isIpad ? 20 : 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    detailsAuthor: {
        fontSize: isIpad ? 18 : 16,
        color: '#6c757d',
        fontWeight: '600',
    },
    detailsDate: {
        fontSize: isIpad ? 18 : 16,
        color: '#6c757d',
    },
    detailsContent: {
        fontSize: isIpad ? 20 : 18,
        color: '#495057',
        lineHeight: isIpad ? 30 : 26,
        marginBottom: isIpad ? 24 : 20,
    },
    detailsMediaContainer: {
        marginBottom: isIpad ? 24 : 20,
        borderRadius: 12,
        overflow: 'hidden',
    },
    detailsImage: {
        width: '100%',
        height: isIpad ? 350 : 250,
        borderRadius: 12,
    },
    detailsVideoPlayer: {
        width: '100%',
        height: isIpad ? 350 : 250,
        borderRadius: 12,
    },
    detailsReadStatus: {
        fontSize: isIpad ? 18 : 16,
        color: '#6c757d',
        marginBottom: isIpad ? 24 : 20,
        fontStyle: 'italic',
    },
    detailsActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: isIpad ? 24 : 20,
        gap: isIpad ? 16 : 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: isIpad ? 28 : 24,
        paddingVertical: isIpad ? 16 : 12,
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
    },
    editActionButton: {
        backgroundColor: '#2094F3',
    },
    deleteActionButton: {
        backgroundColor: '#dc3545',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: isIpad ? 18 : 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    modalTitle: {
        fontSize: isIpad ? 24 : 20,
        fontWeight: '700',
        color: '#212529',
    },
    inputContainer: {
        marginBottom: isIpad ? 24 : 20,
    },
    inputLabel: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: '600',
        color: '#495057',
        marginBottom: isIpad ? 10 : 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        padding: isIpad ? 18 : 16,
        fontSize: isIpad ? 18 : 16,
        backgroundColor: '#fff',
        color: '#495057',
    },
    contentInput: {
        height: isIpad ? 150 : 100,
        textAlignVertical: 'top',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isIpad ? 24 : 20,
        padding: isIpad ? 20 : 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    switchLabelContainer: {
        flex: 1,
    },
    switchLabel: {
        fontSize: isIpad ? 18 : 16,
        fontWeight: '600',
        color: '#495057',
        marginBottom: 4,
    },
    switchDescription: {
        fontSize: isIpad ? 16 : 14,
        color: '#6c757d',
    },
    urgentWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f5',
        padding: isIpad ? 20 : 16,
        borderRadius: 8,
        marginBottom: isIpad ? 24 : 20,
        borderWidth: 1,
        borderColor: '#ffebee',
    },
    urgentWarningText: {
        fontSize: isIpad ? 16 : 14,
        color: '#d32f2f',
        marginLeft: 12,
        flex: 1,
        lineHeight: isIpad ? 24 : 20,
    },
    mediaPickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: '#2094F3',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: isIpad ? 20 : 16,
        marginBottom: isIpad ? 24 : 20,
        backgroundColor: '#f8f9ff',
    },
    mediaPickerText: {
        color: '#2094F3',
        fontSize: isIpad ? 18 : 16,
        fontWeight: '600',
        flex: 1,
        marginLeft: 12,
    },
    mediaPreviewContainer: {
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderRadius: 12,
        padding: isIpad ? 20 : 16,
        marginBottom: isIpad ? 24 : 20,
        backgroundColor: '#f8f9fa',
    },
    mediaPreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isIpad ? 16 : 12,
    },
    mediaTypeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mediaTypeText: {
        fontSize: isIpad ? 16 : 14,
        color: '#495057',
        fontWeight: '600',
        marginLeft: 8,
    },
    removeMediaButton: {
        padding: 4,
    },
    mediaPreviewContent: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: isIpad ? 220 : 180,
        borderRadius: 8,
    },
    previewVideoPlayer: {
        width: '100%',
        height: isIpad ? 220 : 180,
        borderRadius: 8,
    },
    modalButton: {
        flex: 1,
        padding: isIpad ? 18 : 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelModalButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    createModalButton: {
        backgroundColor: '#2094F3',
    },
    cancelModalButtonText: {
        color: '#6c757d',
        fontSize: isIpad ? 18 : 16,
        fontWeight: '600',
    },
    createModalButtonText: {
        color: '#fff',
        fontSize: isIpad ? 18 : 16,
        fontWeight: '600',
    },
    // Video player styles
    videoContainer: {
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: isIpad ? 250 : 200,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoControls: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 8,
    },
    playButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: isIpad ? 45 : 35,
        width: isIpad ? 90 : 70,
        height: isIpad ? 90 : 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenButton: {
        position: 'absolute',
        bottom: isIpad ? 16 : 12,
        right: isIpad ? 16 : 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: isIpad ? 25 : 20,
        width: isIpad ? 50 : 40,
        height: isIpad ? 50 : 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoLoading: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: isIpad ? 24 : 20,
    },
    videoLoadingText: {
        color: '#2094F3',
        fontSize: isIpad ? 18 : 16,
        marginTop: isIpad ? 12 : 10,
        fontWeight: '500',
    },
    videoErrorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: isIpad ? 24 : 20,
    },
    videoError: {
        color: '#6c757d',
        fontSize: isIpad ? 18 : 16,
        textAlign: 'center',
        marginBottom: isIpad ? 10 : 8,
        marginTop: isIpad ? 12 : 10,
        fontWeight: '600',
    },
    videoErrorDetail: {
        color: '#adb5bd',
        fontSize: isIpad ? 16 : 14,
        textAlign: 'center',
        marginBottom: isIpad ? 20 : 16,
        paddingHorizontal: isIpad ? 24 : 20,
        lineHeight: isIpad ? 24 : 20,
    },
    retryButton: {
        backgroundColor: '#2094F3',
        paddingHorizontal: isIpad ? 24 : 20,
        paddingVertical: isIpad ? 12 : 10,
        borderRadius: 6,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: isIpad ? 16 : 14,
        fontWeight: '600',
    },
    // Video modal styles
    videoModalContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoModalHeader: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? (isIpad ? 70 : 60) : (isIpad ? 50 : 40),
        right: isIpad ? 32 : 20,
        zIndex: 1,
    },
    closeVideoButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: isIpad ? 25 : 20,
        width: isIpad ? 50 : 40,
        height: isIpad ? 50 : 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenVideo: {
        width: '100%',
        height: '100%',
    },
    mediaPickerButtonDisabled: {
        backgroundColor: '#f0f0f0',
        borderColor: '#e0e0e0',
    },
    mediaPickerTextDisabled: {
        color: '#aaa',
    },
});

export default Announcements;
