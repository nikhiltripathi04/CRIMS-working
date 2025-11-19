import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Switch,
    ScrollView,
    ActivityIndicator,
    Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from '@react-navigation/native';

// --- Web Conversion Notes ---
// 1. Removed mobile-specific imports: StatusBar, SafeAreaView, Dimensions, Platform, Alert.
// 2. Replaced Alert with window.alert and window.confirm.
// 3. Replaced mobile-specific layout components (SafeAreaView) with web-friendly Views.
// 4. Adjusted styles to use fixed pixel values and percentages for a responsive desktop layout.
// 5. Added useNavigation for a standard web back button.
// 6. Removed RefreshControl as it's not standard on web. A manual refresh can be used.
// 7. Replaced TouchableWithoutFeedback with Pressable for modal overlays.
// 8. Removed unused imports like Video, ImagePicker, FileSystem, MediaLibrary.

const Announcements = ({ route }) => {
    const navigation = useNavigation();
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
        setFormData({ title: '', content: '', isUrgent: false });
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
            window.alert('Error: Please fill in title and content');
            return;
        }

        try {
            const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';
            const announcementData = {
                title: formData.title,
                content: formData.content,
                isUrgent: formData.isUrgent,
                [authParam]: user.id,
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
                window.alert(`Success: Announcement ${editingAnnouncement ? 'updated' : 'created'} successfully`);
            }
        } catch (error) {
            console.error('Save announcement error:', error);
            window.alert('Error: Failed to save announcement');
        }
    };

    const quickDeleteAnnouncement = async (announcementId, event) => {
        event.stopPropagation();
        const confirmed = window.confirm('Are you sure you want to delete this announcement?');
        if (confirmed) {
            try {
                const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';
                const response = await axios.delete(
                    `${API_BASE_URL}/api/sites/${site._id}/announcements/${announcementId}?${authParam}=${user.id}`
                );
                if (response.data.success) {
                    fetchAnnouncements();
                    window.alert('Success: Announcement deleted successfully');
                }
            } catch (error) {
                console.error('Delete announcement error:', error);
                window.alert('Error: Failed to delete announcement');
            }
        }
    };

    const deleteAnnouncement = async (announcementId) => {
        const confirmed = window.confirm('Are you sure you want to delete this announcement?');
        if (confirmed) {
            try {
                const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';
                const response = await axios.delete(
                    `${API_BASE_URL}/api/sites/${site._id}/announcements/${announcementId}?${authParam}=${user.id}`
                );
                if (response.data.success) {
                    fetchAnnouncements();
                    setDetailsModalVisible(false);
                    window.alert('Success: Announcement deleted successfully');
                }
            } catch (error) {
                console.error('Delete announcement error:', error);
                window.alert('Error: Failed to delete announcement');
            }
        }
    };

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const authParam = user.role === 'admin' ? 'adminId' : 'supervisorId';
            const response = await axios.get(
                `${API_BASE_URL}/api/sites/${site._id}/announcements?${authParam}=${user.id}`
            );
            if (response.data.success) {
                setAnnouncements(response.data.data);
            }
        } catch (error) {
            console.error('Fetch announcements error:', error);
            window.alert('Error: Failed to fetch announcements');
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
            <Pressable style={styles.modalOverlay} onPress={() => setDetailsModalVisible(false)}>
                <Pressable style={[styles.modalContent, styles.detailsModalContent]} onPress={() => {}}>
                    <View style={styles.detailsHeader}>
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
                                <Text style={[styles.detailsTitle, selectedAnnouncement.isUrgent && styles.urgentText]}>
                                    {selectedAnnouncement.isUrgent && '🚨 '}
                                    {selectedAnnouncement.title}
                                </Text>

                                <View style={styles.detailsMeta}>
                                    <Text style={styles.detailsAuthor}>By {selectedAnnouncement.createdByName}</Text>
                                    <Text style={styles.detailsDate}>{formatDate(selectedAnnouncement.createdAt)}</Text>
                                </View>

                                <Text style={styles.detailsContent}>{selectedAnnouncement.content}</Text>

                                {canEdit && selectedAnnouncement.createdBy === user?.id && (
                                    <View style={styles.detailsActions}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.editActionButton]}
                                            onPress={() => {
                                                setDetailsModalVisible(false);
                                                openModal(selectedAnnouncement);
                                            }}
                                        >
                                            <Ionicons name="pencil" size={20} color="#fff" />
                                            <Text style={styles.actionButtonText}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.deleteActionButton]}
                                            onPress={() => deleteAnnouncement(selectedAnnouncement._id)}
                                        >
                                            <Ionicons name="trash" size={20} color="#fff" />
                                            <Text style={styles.actionButtonText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );

    const renderAnnouncementItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.announcementCard, item.isUrgent && styles.urgentAnnouncement]}
            onPress={() => showAnnouncementDetails(item)}
            activeOpacity={0.7}
        >
            <View style={styles.announcementHeader}>
                <View style={styles.announcementTitleContainer}>
                    <Text style={[styles.announcementTitle, item.isUrgent && styles.urgentText]}>
                        {item.isUrgent && '🚨 '}
                        {item.title}
                    </Text>
                    <View style={styles.announcementActions}>
                        {canEdit && (
                            <TouchableOpacity
                                onPress={(event) => quickDeleteAnnouncement(item._id, event)}
                                style={styles.quickDeleteButton}
                            >
                                <Ionicons name="trash-outline" size={20} color="#ff4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View style={styles.announcementMeta}>
                    <Text style={styles.authorText}>By {item.createdByName}</Text>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>
            </View>
            <Text style={styles.announcementContent} numberOfLines={3}>{item.content}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            <View style={styles.headerContent}>
                                <Text style={styles.title}>{canEdit ? 'Site Announcements' : 'Announcements'}</Text>
                                {announcements.length > 0 && <Text style={styles.subtitle}>{site.siteName}</Text>}
                            </View>
                        </View>

                        <View style={styles.contentArea}>
                            <ScrollView style={styles.scrollView}>
                                {loading && announcements.length === 0 ? (
                                    <ActivityIndicator size="large" color="#2094F3" style={{ marginTop: 50 }} />
                                ) : announcements.length > 0 ? (
                                    <View style={styles.listContainer}>
                                        {announcements.map(item => (
                                            <View key={item._id?.toString() || Math.random().toString()}>
                                                {renderAnnouncementItem({ item })}
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="megaphone-outline" size={64} color="#9CA3AF" />
                                        <Text style={styles.emptyText}>No announcements yet</Text>
                                        {canEdit && <Text style={styles.emptySubtext}>Create the first announcement to keep everyone informed.</Text>}
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {canEdit && (
                <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            )}

            {renderAnnouncementDetailsModal()}

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => { setModalVisible(false); resetForm(); }}
            >
                <Pressable style={styles.modalOverlay} onPress={() => { setModalVisible(false); resetForm(); }}>
                    <Pressable style={styles.createModalContent} onPress={() => {}}>
                        <View style={styles.createModalHeader}>
                            <Text style={styles.modalTitle}>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</Text>
                            <TouchableOpacity style={styles.modalCloseButton} onPress={() => { setModalVisible(false); resetForm(); }}>
                                <Ionicons name="close" size={24} color="#666" />
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
                                    <Text style={styles.switchDescription}>Urgent announcements will be highlighted</Text>
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
                                    <Ionicons name="warning" size={20} color="#ff4444" />
                                    <Text style={styles.urgentWarningText}>This announcement will be highlighted and prioritized.</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.createModalFooter}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelModalButton]} onPress={() => { setModalVisible(false); resetForm(); }}>
                                <Text style={styles.cancelModalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.createModalButton]} onPress={saveAnnouncement}>
                                <Text style={styles.createModalButtonText}>{editingAnnouncement ? 'Update' : 'Create'}</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa', // Fallback color
        height: '100vh', // Ensure it fills the viewport on web
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    mainContainer: {
        flex: 1,
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        paddingHorizontal: 30,
        paddingTop: 40,
        paddingBottom: 30,
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0, // Prevent header from shrinking
    },
    backButton: {
        padding: 8,
        marginRight: 15,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 30,
        minHeight: 0, // Allow content area to shrink
        overflow: 'hidden', // Hide overflow, child will scroll
        display: 'flex', // Use flexbox for child
        flexDirection: 'column',
    },
    scrollView: {
        flex: 1, // Take up all available space in contentArea
        overflowY: 'auto', // Enable vertical scrolling
    },
    listContainer: {
        paddingBottom: 80,
    },
    announcementCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        padding: 20,
        boxShadow: '0 3px 6px rgba(0,0,0,0.1)',
        borderWidth: 1,
        borderColor: '#f1f3f4',
        cursor: 'pointer',
    },
    urgentAnnouncement: {
        borderLeftWidth: 5,
        borderLeftColor: '#ff4444',
        backgroundColor: '#fffbfb',
    },
    announcementHeader: {
        marginBottom: 12,
    },
    announcementTitleContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    announcementTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#212529',
        flex: 1,
        marginRight: 12,
        lineHeight: 24,
    },
    urgentText: {
        color: '#ff4444',
    },
    announcementActions: {
        flexDirection: 'row',
        alignItems: 'center',
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
        fontSize: 14,
        color: '#6c757d',
        fontWeight: '500',
    },
    dateText: {
        fontSize: 14,
        color: '#6c757d',
    },
    announcementContent: {
        fontSize: 16,
        color: '#495057',
        lineHeight: 22,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 80,
    },
    emptyText: {
        fontSize: 20,
        color: '#6c757d',
        marginTop: 20,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 16,
        color: '#adb5bd',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 22,
    },
    addButton: {
        position: 'fixed', // Use 'fixed' for web floating button
        right: 30,
        bottom: 30,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2094F3',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        zIndex: 1000, // Ensure it's above other content
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    createModalContent: {
        backgroundColor: '#fff',
        width: '90%',
        maxWidth: 500,
        maxHeight: '85vh',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '90%',
        maxWidth: 600,
        maxHeight: '90vh',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
    },
    detailsModalContent: {
        maxHeight: '90vh',
    },
    createModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        flexShrink: 0,
    },
    createModalBody: {
        flex: 1,
        padding: 20,
        overflowY: 'auto',
    },
    createModalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        gap: 12,
        flexShrink: 0,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 15,
    },
    closeButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#f8f9fa',
        cursor: 'pointer',
    },
    modalCloseButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#f8f9fa',
        cursor: 'pointer',
    },
    detailsContainer: {
        paddingBottom: 20,
    },
    detailsTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#212529',
        marginBottom: 16,
        lineHeight: 30,
    },
    detailsMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    detailsAuthor: {
        fontSize: 16,
        color: '#6c757d',
        fontWeight: '600',
    },
    detailsDate: {
        fontSize: 16,
        color: '#6c757d',
    },
    detailsContent: {
        fontSize: 18,
        color: '#495057',
        lineHeight: 26,
        marginBottom: 20,
        whiteSpace: 'pre-wrap',
    },
    detailsActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: '12px 24px',
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
        cursor: 'pointer',
    },
    editActionButton: {
        backgroundColor: '#2094F3',
    },
    deleteActionButton: {
        backgroundColor: '#dc3545',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#212529',
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#495057',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#495057',
        outlineStyle: 'none',
    },
    contentInput: {
        height: 120,
        textAlignVertical: 'top',
        resize: 'vertical',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    switchLabelContainer: {
        flex: 1,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#495057',
        marginBottom: 4,
    },
    switchDescription: {
        fontSize: 14,
        color: '#6c757d',
    },
    urgentWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff5f5',
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ffebee',
    },
    urgentWarningText: {
        fontSize: 14,
        color: '#d32f2f',
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        cursor: 'pointer',
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
        fontSize: 16,
        fontWeight: '600',
    },
    createModalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default Announcements;
