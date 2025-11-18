import React, { useState, useEffect } from 'react';
import { useNavigation } from "@react-navigation/native"; // 1. Import useNavigation
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Dimensions,
    Platform, // Kept Platform for conceptual clarity, but sizing variables removed
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";

// 3. Simplified Sizing (Using fixed values)
const isIpad = false; // Forced to false for simpler fixed styling

const ManageWorkersScreen = ({ route }) => {
    // 1. Initialize navigation
    const navigation = useNavigation();

    // Use route.params directly
    const { site, canEdit = false } = route.params;
    
    // Workers state structure remains the same
    const [workers, setWorkers] = useState(site.workers || []);
    const [filteredWorkers, setFilteredWorkers] = useState(site.workers || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [editingWorker, setEditingWorker] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        role: '',
        phoneNumber: ''
    });
    const { API_BASE_URL, user } = useAuth();

    // Search function - search by name or role
    const handleSearch = (query) => {
        setSearchQuery(query);

        if (query.trim() === '') {
            setFilteredWorkers(workers);
        } else {
            const filtered = workers.filter(worker =>
                worker.name.toLowerCase().includes(query.toLowerCase()) ||
                worker.role.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredWorkers(filtered);
        }
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setFilteredWorkers(workers);
    };

    // Update filtered workers when workers change
    useEffect(() => {
        // Re-filter if search query is active, otherwise reset to full list
        if (searchQuery.trim() !== '') {
            handleSearch(searchQuery);
        } else {
            setFilteredWorkers(workers);
        }
    }, [workers]); // Dependency: workers array

    const resetForm = () => {
        setFormData({
            name: '',
            role: '',
            phoneNumber: ''
        });
        setEditingWorker(null);
    };

    const openModal = (worker = null) => {
        if (worker) {
            setFormData({
                name: worker.name,
                role: worker.role,
                phoneNumber: worker.phoneNumber
            });
            setEditingWorker(worker);
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const saveWorker = async () => {
        if (!formData.name || !formData.role) {
            window.alert('Error', 'Please fill in name and role'); // 4. Replaced Alert
            return;
        }

        try {
            const workerData = {
                ...formData,
                supervisorId: user?.id
            };

            let response;
            if (editingWorker) {
                response = await axios.put(
                    `${API_BASE_URL}/api/sites/${site._id}/workers/${editingWorker._id}`,
                    workerData
                );
            } else {
                response = await axios.post(
                    `${API_BASE_URL}/api/sites/${site._id}/workers`,
                    workerData
                );
            }

            if (response.data.success) {
                setWorkers(response.data.data.workers);
                setModalVisible(false);
                resetForm();
                window.alert('Success', `Worker ${editingWorker ? 'updated' : 'added'} successfully`); // 4. Replaced Alert
            }
        } catch (error) {
            console.error('Save worker error:', error);
            window.alert('Error', 'Failed to save worker'); // 4. Replaced Alert
        }
    };

    const markAttendance = async (workerId, status) => {
        try {
            const today = new Date();
            const attendanceData = {
                date: today,
                status: status,
                supervisorId: user?.id
            };

            const response = await axios.post(
                `${API_BASE_URL}/api/sites/${site._id}/workers/${workerId}/attendance`,
                attendanceData
            );

            if (response.data.success) {
                setWorkers(response.data.data.workers);
                window.alert('Success', `Attendance marked as ${status}`); // 4. Replaced Alert
            } else {
                window.alert('Error', 'Failed to mark attendance'); // 4. Replaced Alert
            }
        } catch (error) {
            console.error('Attendance error:', error);
            window.alert('Error', 'Failed to mark attendance'); // 4. Replaced Alert
        }
    };

    const getTodayAttendance = (worker) => {
        const today = new Date().toDateString();
        const sortedAttendance = worker.attendance?.sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        ) || [];

        const todayAttendance = sortedAttendance.find(
            att => new Date(att.date).toDateString() === today
        );

        return todayAttendance?.status || 'not_marked';
    };

    const deleteWorker = async (workerId) => {
        const confirmed = window.confirm('Are you sure you want to delete this worker?'); // 4. Replaced Alert

        if (!confirmed) return;

        try {
            const response = await axios.delete(
                `${API_BASE_URL}/api/sites/${site._id}/workers/${workerId}?supervisorId=${user?.id}`
            );

            if (response.data.success) {
                setWorkers(response.data.data.workers);
                window.alert('Success', 'Worker deleted successfully'); // 4. Replaced Alert
            }
        } catch (error) {
            console.error('Delete worker error:', error);
            window.alert('Error', 'Failed to delete worker'); // 4. Replaced Alert
        }
    };

    const renderWorkerItem = ({ item }) => {
        const todayStatus = getTodayAttendance(item);

        return (
            <View style={styles.workerCard}>
                <View style={styles.workerContent}>
                    <View style={styles.workerHeader}>
                        <View style={styles.workerMainInfo}>
                            <Text style={styles.workerName}>{item.name}</Text>
                            <Text style={styles.workerRole}>{item.role}</Text>
                        </View>
                        <View style={[
                            styles.attendanceBadge,
                            todayStatus === 'present' && styles.presentBadge,
                            todayStatus === 'absent' && styles.absentBadge,
                            todayStatus === 'not_marked' && styles.notMarkedBadge
                        ]}>
                            <Text style={[
                                styles.attendanceLabel,
                                todayStatus === 'present' && styles.presentText,
                                todayStatus === 'absent' && styles.absentText,
                                todayStatus === 'not_marked' && styles.notMarkedText
                            ]}>
                                {todayStatus === 'present' ? 'Present' :
                                    todayStatus === 'absent' ? 'Absent' : 'Not Marked'}
                            </Text>
                        </View>
                    </View>

                    {item.phoneNumber && (
                        <Text style={styles.workerPhone}>📱 {item.phoneNumber}</Text>
                    )}

                    {canEdit && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => {
                                    setSelectedWorker(item);
                                    setAttendanceModalVisible(true);
                                }}
                            >
                                <Ionicons name="calendar-outline" size={18} color="#2094F3" />
                                <Text style={styles.actionButtonText}>Attendance</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => openModal(item)}
                            >
                                <Ionicons name="pencil-outline" size={18} color="#2094F3" />
                                <Text style={styles.actionButtonText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {canEdit && (
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteWorker(item._id)}
                    >
                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Removed StatusBar */}
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                {/* Replaced SafeAreaView with simple View */}
                <View style={styles.safeAreaWeb}>
                    <View style={styles.mainContainer}>
                        <View style={styles.header}>
                            {/* 2. Web Back Button Implementation */}
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.webBackButton}
                            >
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                                <Text style={styles.webBackButtonText}>Back</Text>
                            </TouchableOpacity>

                            <View style={styles.headerContent}>
                                <Text style={styles.title}>Workers Management</Text>
                                <Text style={styles.subtitle}>
                                    Total Workers: {workers.length} • {site.siteName}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.contentArea}>
                            {/* Search Bar */}
                            <View style={styles.searchContainer}>
                                <View style={styles.searchBar}>
                                    <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search workers by name or role..."
                                        placeholderTextColor="#9CA3AF"
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {searchQuery.length > 0 && (
                                    <View style={styles.searchResultsInfo}>
                                        <Text style={styles.searchResultsText}>
                                            {filteredWorkers.length} result{filteredWorkers.length !== 1 ? 's' : ''} found
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <FlatList
                                data={filteredWorkers}
                                renderItem={renderWorkerItem}
                                keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                                contentContainerStyle={styles.listContainer}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={64} color="#9CA3AF" />
                                        <Text style={styles.emptyText}>
                                            {searchQuery.length > 0 ? 'No workers found matching your search' : 'No workers added yet'}
                                        </Text>
                                        {canEdit && searchQuery.length === 0 && (
                                            <Text style={styles.emptySubtext}>
                                                Tap the + button to add your first worker
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
                                    <Ionicons name="add" size={24} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Add/Edit Worker Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setModalVisible(false);
                    resetForm();
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingWorker ? 'Edit Worker' : 'Add New Worker'}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Worker Name *"
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Role/Position *"
                            value={formData.role}
                            onChangeText={(text) => setFormData({ ...formData, role: text })}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            value={formData.phoneNumber}
                            onChangeText={(text) => setFormData({ ...formData, phoneNumber: text.replace(/[^0-9+]/g, '') })} // Allow + for international
                            keyboardType="phone-pad"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={saveWorker}
                            >
                                <Text style={styles.saveButtonText}>
                                    {editingWorker ? 'Update' : 'Add'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Attendance Modal */}
            <Modal
                visible={attendanceModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAttendanceModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Mark Attendance</Text>

                        {selectedWorker ? (
                            <>
                                <Text style={styles.workerNameInModal}>{selectedWorker.name}</Text>
                                <Text style={styles.dateText}>
                                    Date: {new Date().toLocaleDateString()}
                                </Text>

                                <View style={styles.attendanceButtons}>
                                    <TouchableOpacity
                                        style={[styles.attendanceBtn, styles.presentBtn]}
                                        onPress={() => {
                                            markAttendance(selectedWorker._id, 'present');
                                            setAttendanceModalVisible(false);
                                        }}
                                    >
                                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                        <Text style={styles.attendanceBtnText}>Present</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.attendanceBtn, styles.absentBtn]}
                                        onPress={() => {
                                            markAttendance(selectedWorker._id, 'absent');
                                            setAttendanceModalVisible(false);
                                        }}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#fff" />
                                        <Text style={styles.attendanceBtnText}>Absent</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <Text style={styles.emptyText}>Loading worker information...</Text>
                        )}

                        <TouchableOpacity
                            style={styles.cancelAttendanceButton}
                            onPress={() => setAttendanceModalVisible(false)}
                        >
                            <Text style={styles.cancelAttendanceText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};


const styles = StyleSheet.create({
    // --- Web Layout Styles ---
    container: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa',
        height: '100vh',
        overflow: 'hidden',
    },
    gradient: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    safeAreaWeb: {
        flex: 1,
    },
    mainContainer: {
        width: '100%',
        maxWidth: 800,
        alignSelf: 'center',
        display: 'flex',
        flexDirection: 'column',
    },
    // Web Back Button Style
    webBackButton: {
        position: 'absolute',
        top: 40, 
        left: 30,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        zIndex: 10,
        cursor: 'pointer',
    },
    webBackButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    // Header adjustments
    header: {
        paddingHorizontal: 30,
        paddingTop: 80,
        paddingBottom: 30,
        flexDirection: 'row',
        flexShrink: 0,
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: 100, // Push content slightly right if needed, or adjust structure
    },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '400',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingTop: 25,
        paddingBottom: 50,
        minHeight: '75vh',
        boxShadow: '0 -4px 10px rgba(0,0,0,0.1)',
        overflowY: 'auto',
    },
    listContainer: {
        paddingBottom: 80,
    },
    // --- End Web Layout Styles ---

    // --- Component Styles (using fixed pixel values) ---
    searchContainer: {
        marginBottom: 15,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginHorizontal: 0,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        paddingVertical: 0,
        outlineStyle: 'none', // Web-specific
    },
    clearButton: {
        paddingLeft: 10,
        cursor: 'pointer', // Web-specific
    },
    searchResultsInfo: {
        paddingHorizontal: 5,
        paddingVertical: 8,
    },
    searchResultsText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    workerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 15,
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        elevation: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    workerContent: {
        flex: 1,
        padding: 20,
    },
    workerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    workerMainInfo: {
        flex: 1,
    },
    workerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    workerRole: {
        fontSize: 14,
        color: '#666',
    },
    workerPhone: {
        fontSize: 14,
        color: '#666',
        marginTop: 10,
        marginBottom: 15,
    },
    attendanceBadge: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        minWidth: 100,
    },
    presentBadge: {
        backgroundColor: '#d4edda',
    },
    absentBadge: {
        backgroundColor: '#f8d7da',
    },
    notMarkedBadge: {
        backgroundColor: '#fff3cd',
    },
    attendanceLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    presentText: {
        color: '#155724',
    },
    absentText: {
        color: '#721c24',
    },
    notMarkedText: {
        color: '#856404',
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 15,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderRadius: 8,
        marginRight: 15,
        cursor: 'pointer',
    },
    actionButtonText: {
        fontSize: 14,
        color: '#2094F3',
        fontWeight: '500',
        marginLeft: 5,
    },
    deleteButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'rgba(255, 0, 0, 0.08)',
        padding: 8,
        borderRadius: 20,
        width: 35,
        height: 35,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    addButton: {
        position: 'fixed', // Use fixed for web floating button
        bottom: 30,
        right: 30,
        backgroundColor: '#2094F3',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        zIndex: 100,
    },
    emptyState: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 50,
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginTop: 20,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 10,
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed', // Web-specific
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 25,
        width: '90%',
        maxWidth: 400,
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    workerNameInModal: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#2094F3',
        marginBottom: 10,
    },
    dateText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        marginBottom: 15,
        borderRadius: 8,
        fontSize: 16,
        backgroundColor: '#F9FAFB',
        outlineStyle: 'none', // Web-specific
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
        cursor: 'pointer',
    },
    cancelButton: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cancelButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#2094F3',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    attendanceButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
    },
    attendanceBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 5,
        cursor: 'pointer',
    },
    presentBtn: {
        backgroundColor: '#28a745',
    },
    absentBtn: {
        backgroundColor: '#dc3545',
    },
    attendanceBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    },
    cancelAttendanceButton: {
        marginTop: 15,
        padding: 10,
        alignItems: 'center',
        cursor: 'pointer',
    },
    cancelAttendanceText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    }
});

export default ManageWorkersScreen;