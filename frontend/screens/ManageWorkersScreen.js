import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Modal,
    TextInput,
    Switch,
    Dimensions,
    Platform,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const ManageWorkersScreen = ({ route }) => {
    const { site, canEdit = false } = route.params;
    const [workers, setWorkers] = useState(site.workers || []);
    const [filteredWorkers, setFilteredWorkers] = useState(site.workers || []); // For search
    const [searchQuery, setSearchQuery] = useState(''); // Search state
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
        setFilteredWorkers(workers);
    }, [workers]);

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
            Alert.alert('Error', 'Please fill in name and role');
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
                Alert.alert('Success', `Worker ${editingWorker ? 'updated' : 'added'} successfully`);
            }
        } catch (error) {
            console.error('Save worker error:', error);
            Alert.alert('Error', 'Failed to save worker');
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
                Alert.alert('Success', `Attendance marked as ${status}`);
            } else {
                Alert.alert('Error', 'Failed to mark attendance');
            }
        } catch (error) {
            console.error('Attendance error:', error);
            Alert.alert('Error', 'Failed to mark attendance');
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
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this worker?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await axios.delete(
                                `${API_BASE_URL}/api/sites/${site._id}/workers/${workerId}?supervisorId=${user?.id}`
                            );

                            if (response.data.success) {
                                setWorkers(response.data.data.workers);
                                Alert.alert('Success', 'Worker deleted successfully');
                            }
                        } catch (error) {
                            console.error('Delete worker error:', error);
                            Alert.alert('Error', 'Failed to delete worker');
                        }
                    }
                }
            ]
        );
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
                                <Ionicons name="calendar-outline" size={isIpad ? 22 : 18} color="#2094F3" />
                                <Text style={styles.actionButtonText}>Attendance</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => openModal(item)}
                            >
                                <Ionicons name="pencil-outline" size={isIpad ? 22 : 18} color="#2094F3" />
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
                        <Ionicons name="trash-outline" size={isIpad ? 22 : 20} color="#ff4444" />
                    </TouchableOpacity>
                )}
            </View>
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
                        <View style={styles.header}>
                            <View>
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
                                    <Ionicons name="search-outline" size={isIpad ? 24 : 20} color="#9CA3AF" style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search workers by name or role..."
                                        placeholderTextColor="#9CA3AF"
                                        value={searchQuery}
                                        onChangeText={handleSearch}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                                            <Ionicons name="close-circle" size={isIpad ? 22 : 18} color="#9CA3AF" />
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
                                        <Ionicons name="people-outline" size={isIpad ? 80 : 64} color="#9CA3AF" />
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
                                    <Ionicons name="add" size={isIpad ? 30 : 24} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Add/Edit Worker Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
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
                            onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
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
    searchContainer: {
        marginBottom: screenHeight * (isIpad ? 0.02 : 0.015),
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: screenWidth * 0.03,
        paddingHorizontal: screenWidth * (isIpad ? 0.025 : 0.035),
        paddingVertical: screenHeight * (isIpad ? 0.015 : 0.012),
        marginHorizontal: screenWidth * (isIpad ? 0.01 : 0.005),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: screenWidth * 0.02,
    },
    searchInput: {
        flex: 1,
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        color: '#333',
        paddingVertical: 0, // Remove default padding
    },
    clearButton: {
        paddingLeft: screenWidth * 0.02,
    },
    searchResultsInfo: {
        paddingHorizontal: screenWidth * (isIpad ? 0.025 : 0.035),
        paddingVertical: screenHeight * (isIpad ? 0.01 : 0.008),
    },
    searchResultsText: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.032),
        color: '#666',
        fontStyle: 'italic',
    },
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
    workerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: screenWidth * 0.04,
        marginBottom: screenHeight * (isIpad ? 0.025 : 0.02),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    workerContent: {
        flex: 1,
        padding: screenWidth * (isIpad ? 0.03 : 0.04),
    },
    workerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: screenHeight * (isIpad ? 0.02 : 0.015),
    },
    workerMainInfo: {
        flex: 1,
    },
    workerName: {
        fontSize: screenWidth * (isIpad ? 0.03 : 0.045),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: screenHeight * (isIpad ? 0.01 : 0.005),
    },
    workerRole: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#666',
    },
    workerPhone: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#666',
        marginTop: screenHeight * (isIpad ? 0.01 : 0.005),
        marginBottom: screenHeight * (isIpad ? 0.02 : 0.015),
    },
    attendanceBadge: {
        paddingHorizontal: screenWidth * (isIpad ? 0.02 : 0.03),
        paddingVertical: screenHeight * (isIpad ? 0.01 : 0.008),
        borderRadius: screenWidth * 0.05,
        alignItems: 'center',
        minWidth: screenWidth * (isIpad ? 0.11 : 0.2),
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
        fontSize: screenWidth * (isIpad ? 0.018 : 0.03),
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
        marginTop: screenHeight * (isIpad ? 0.02 : 0.015),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: screenWidth * (isIpad ? 0.015 : 0.02),
        borderRadius: screenWidth * 0.02,
        marginRight: screenWidth * (isIpad ? 0.02 : 0.03),
    },
    actionButtonText: {
        fontSize: screenWidth * (isIpad ? 0.018 : 0.03),
        color: '#2094F3',
        fontWeight: '500',
        marginLeft: screenWidth * 0.015,
    },
    deleteButton: {
        position: 'absolute',
        bottom: screenHeight * (isIpad ? 0.03 : 0.02),
        right: screenWidth * (isIpad ? 0.03 : 0.04),
        backgroundColor: 'rgba(255, 0, 0, 0.08)',
        padding: screenWidth * (isIpad ? 0.013 : 0.02),
        borderRadius: screenWidth * 0.05,
        width: screenWidth * (isIpad ? 0.055 : 0.09),
        height: screenWidth * (isIpad ? 0.055 : 0.09),
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        position: 'absolute',
        bottom: screenHeight * (isIpad ? 0.04 : 0.025),
        right: screenWidth * (isIpad ? 0.04 : 0.05),
        backgroundColor: '#2094F3',
        width: screenWidth * (isIpad ? 0.08 : 0.14),
        height: screenWidth * (isIpad ? 0.08 : 0.14),
        borderRadius: screenWidth * (isIpad ? 0.04 : 0.07),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: screenWidth * (isIpad ? 0.08 : 0.1),
        marginTop: screenHeight * (isIpad ? 0.15 : 0.12),
    },
    emptyText: {
        fontSize: screenWidth * (isIpad ? 0.028 : 0.045),
        color: '#666',
        marginTop: screenHeight * (isIpad ? 0.03 : 0.025),
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#888',
        marginTop: screenHeight * (isIpad ? 0.015 : 0.012),
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: screenWidth * 0.04,
        padding: screenWidth * (isIpad ? 0.04 : 0.05),
        width: isIpad ? '60%' : '90%',
        maxWidth: isIpad ? 500 : '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: screenWidth * (isIpad ? 0.03 : 0.045),
        fontWeight: 'bold',
        marginBottom: screenHeight * (isIpad ? 0.03 : 0.025),
        textAlign: 'center',
        color: '#333',
    },
    workerNameInModal: {
        fontSize: screenWidth * (isIpad ? 0.028 : 0.045),
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#2094F3',
        marginBottom: screenHeight * (isIpad ? 0.02 : 0.012),
    },
    dateText: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        textAlign: 'center',
        color: '#666',
        marginBottom: screenHeight * (isIpad ? 0.03 : 0.025),
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: screenWidth * (isIpad ? 0.02 : 0.03),
        marginBottom: screenHeight * (isIpad ? 0.025 : 0.02),
        borderRadius: screenWidth * 0.025,
        fontSize: screenWidth * (isIpad ? 0.023 : 0.04),
        backgroundColor: '#F9FAFB',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: screenHeight * (isIpad ? 0.03 : 0.025),
    },
    button: {
        flex: 1,
        padding: screenWidth * (isIpad ? 0.023 : 0.0375),
        borderRadius: screenWidth * 0.025,
        alignItems: 'center',
        marginHorizontal: screenWidth * 0.0125,
    },
    cancelButton: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginHorizontal: screenWidth * 0.0125,
    },
    cancelButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
    },
    saveButton: {
        backgroundColor: '#2094F3',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
    },
    attendanceButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: screenHeight * (isIpad ? 0.02 : 0.012),
    },
    attendanceBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: screenWidth * (isIpad ? 0.023 : 0.0375),
        borderRadius: screenWidth * 0.025,
        marginHorizontal: screenWidth * 0.0125,
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
        marginLeft: screenWidth * 0.02,
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
    }
});

export default ManageWorkersScreen;
