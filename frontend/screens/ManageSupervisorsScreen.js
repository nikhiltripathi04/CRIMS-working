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
    Platform,
    SafeAreaView,
    TouchableWithoutFeedback,
    Keyboard,
    Dimensions,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;


const ManageSupervisorsScreen = ({ route }) => {
    const { site } = route.params;
    const [supervisors, setSupervisors] = useState(site.supervisors || []);
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [selectedSupervisor, setSelectedSupervisor] = useState(null);
    const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
    const { API_BASE_URL, user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Add states for reset password functionality
    const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

    // New State for Assigning Existing Supervisors
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [availableSupervisors, setAvailableSupervisors] = useState([]);

    const resetForm = () => {
        setFormData({
            name: '',
            username: '',
            password: ''
        });
        setShowPassword(false);
    };

    // Fetch all supervisors for the company to show in the "Assign Existing" list
    const fetchAvailableSupervisors = async () => {
        if (!user || !user.id) return;

        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`);

            if (response.data.success) {
                const allSupervisors = response.data.data || [];
                // Filter out supervisors who are already assigned to this site
                const currentSupervisorIds = supervisors.map(s => s._id);
                const available = allSupervisors.filter(s => !currentSupervisorIds.includes(s._id));
                setAvailableSupervisors(available);
            }
        } catch (error) {
            console.error('Error fetching available supervisors:', error);
            Alert.alert('Error', 'Failed to load available supervisors');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignSupervisor = async (supervisorId) => {
        try {
            setLoading(true);
            const response = await axios.post(`${API_BASE_URL}/api/sites/${site._id}/assign-supervisor`, {
                supervisorId,
                adminId: user.id
            });

            if (response.data.success) {
                Alert.alert('Success', 'Supervisor assigned successfully');
                setAssignModalVisible(false);
                fetchSupervisors(); // Refresh the main list
            }
        } catch (error) {
            console.error('Error assigning supervisor:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to assign supervisor');
        } finally {
            setLoading(false);
        }
    };

    const fetchSupervisors = async () => {
        if (!user || !user.id) {
            console.log('User not available, skipping fetchSupervisors');
            return;
        }

        setLoading(true);
        try {
            console.log(`Fetching site with supervisors for adminId=${user.id}, siteId=${site._id}`);
            const response = await axios.get(`${API_BASE_URL}/api/sites/${site._id}?adminId=${user.id}`);

            if (response.data.success) {
                setSupervisors(response.data.data.supervisors || []);
            }
        } catch (error) {
            console.error('Error fetching supervisors:', error);
            console.error('Error response:', error.response?.data);
            console.error('Request URL:', `${API_BASE_URL}/api/sites/${site._id}?adminId=${user.id}`);

            Alert.alert('Error', 'Failed to fetch supervisors. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.id) {
            fetchSupervisors();
        }
    }, [user]);

    const createSupervisor = async () => {
        if (!formData.username || !formData.password || !formData.name) {
            Alert.alert('Error', 'Please enter full name, username, and password');
            return;
        }

        if (!user || !user.id) {
            Alert.alert('Error', 'You must be logged in to create a supervisor');
            return;
        }

        try {
            setLoading(true);
            console.log(`Creating supervisor with adminId=${user.id}`);

            // Include adminId in request body
            const response = await axios.post(`${API_BASE_URL}/api/sites/${site._id}/supervisors`, {
                username: formData.username,
                password: formData.password,
                fullName: formData.name, // Send Full Name
                adminId: user.id
            });

            if (response.data.success) {
                await fetchSupervisors();

                // Store credentials for display
                setSelectedSupervisor({
                    username: formData.username,
                    password: formData.password,
                    fullName: formData.name,
                    _id: response.data.data.id,
                    isNew: true
                });

                setCredentialsModalVisible(true);
                setModalVisible(false);
                resetForm();
            }
        } catch (error) {
            console.error('Error creating supervisor:', error);
            console.error('Error response:', error.response?.data);

            Alert.alert('Error', error.response?.data?.message || 'Failed to create supervisor');
        } finally {
            setLoading(false);
        }
    };

    const showCredentials = (supervisor) => {
        setSelectedSupervisor({
            ...supervisor,
            password: '', // In a real app, you'd retrieve this securely from the backend
            isNew: false,
            isReset: false
        });

        setCredentialsModalVisible(true);
    };

    const resetSupervisorPassword = async () => {
        if (!newPassword) {
            Alert.alert('Error', 'Please enter a new password');
            return;
        }

        if (!user || !user.id) {
            Alert.alert('Error', 'You must be logged in to reset a password');
            return;
        }

        setResetPasswordLoading(true);

        try {
            console.log('Resetting password for supervisor:', selectedSupervisor._id);
            console.log('Site ID:', site._id);
            console.log('Admin ID:', user.id);

            // Include adminId in request body
            const response = await axios.put(
                `${API_BASE_URL}/api/sites/${site._id}/supervisors/${selectedSupervisor._id}/reset-password`,
                {
                    newPassword: newPassword,
                    adminId: user.id
                }
            );

            console.log('Reset password response:', response.data);

            if (response.data.success) {
                // Update the selected supervisor with new password for display
                setSelectedSupervisor({
                    ...selectedSupervisor,
                    password: newPassword,
                    isReset: true
                });

                // Close reset modal and show credentials modal
                setResetPasswordModalVisible(false);
                setCredentialsModalVisible(true);

                // Reset state
                setNewPassword('');
                setShowNewPassword(false);
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            console.error('Error response:', error.response?.data);
            console.error('Status code:', error.response?.status);

            Alert.alert(
                'Error',
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Failed to reset supervisor password. Check server logs for details.'
            );
        } finally {
            setResetPasswordLoading(false);
        }
    };

    const openResetPasswordModal = () => {
        setCredentialsModalVisible(false);
        setTimeout(() => {
            setResetPasswordModalVisible(true);
        }, 300); // Slight delay for better UX
    };

    const deleteSupervisor = async (supervisorId, username) => {
        if (!user || !user.id) {
            Alert.alert('Error', 'You must be logged in to delete a supervisor');
            return;
        }

        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to remove supervisor "${username}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            // Include adminId as query parameter
                            await axios.delete(`${API_BASE_URL}/api/sites/${site._id}/supervisors/${supervisorId}?adminId=${user.id}`);
                            await fetchSupervisors();
                            Alert.alert('Success', `Supervisor "${username}" removed successfully`);
                        } catch (error) {
                            console.error('Error deleting supervisor:', error);
                            console.error('Error response:', error.response?.data);
                            Alert.alert('Error', 'Failed to remove supervisor');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderSupervisorItem = ({ item }) => (
        <View style={styles.supervisorCard}>
            <View style={styles.supervisorInfo}>
                <Text style={styles.supervisorName}>{item.username}</Text>
                <Text style={styles.supervisorRole}>Site Supervisor</Text>
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => showCredentials(item)}
                >
                    <Ionicons
                        name="key-outline"
                        size={isIpad ? 26 : 22}
                        color="#2094F3"
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteSupervisor(item._id, item.username)}
                >
                    <Ionicons
                        name="trash-outline"
                        size={isIpad ? 26 : 22}
                        color="#ff4444"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    // Show loading indicator if user isn't available yet
    if (!user) {
        return (
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={{ marginTop: 20, color: '#FFFFFF', fontSize: isIpad ? 18 : 16 }}>Loading user data...</Text>
                </View>
            </LinearGradient>
        );
    }

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
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.mainContainer}>
                            {/* Header */}
                            <View style={styles.header}>
                                <View>
                                    <Text style={styles.title}>Site Supervisors</Text>
                                    <Text style={styles.subtitle}>{site.siteName}</Text>
                                </View>
                            </View>

                            {/* Content Area */}
                            <View style={styles.contentArea}>
                                <FlatList
                                    data={supervisors}
                                    renderItem={renderSupervisorItem}
                                    keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                                    contentContainerStyle={styles.listContainer}
                                    refreshing={loading}
                                    onRefresh={fetchSupervisors}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <Ionicons
                                                name="person-outline"
                                                size={isIpad ? 80 : 64}
                                                color="#9CA3AF"
                                            />
                                            <Text style={styles.emptyText}>No supervisors assigned</Text>
                                            <Text style={styles.emptySubtext}>
                                                Tap the + button to add a supervisor
                                            </Text>
                                        </View>
                                    }
                                />

                                <TouchableOpacity
                                    style={[styles.addButton, { bottom: screenHeight * (isIpad ? 0.04 : 0.03) + 70, backgroundColor: '#fff', borderWidth: 1, borderColor: '#2094F3' }]}
                                    onPress={() => {
                                        fetchAvailableSupervisors();
                                        setAssignModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="people" size={isIpad ? 30 : 24} color="#2094F3" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => setModalVisible(true)}
                                >
                                    <Ionicons name="add" size={isIpad ? 30 : 24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </SafeAreaView>
            </LinearGradient>

            {/* Assign Supervisor Modal */}
            <Modal
                visible={assignModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAssignModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setAssignModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={() => { }}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Assign Existing Supervisor</Text>

                                {availableSupervisors.length > 0 ? (
                                    <FlatList
                                        data={availableSupervisors}
                                        keyExtractor={(item) => item._id}
                                        style={{ maxHeight: 300, width: '100%' }}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={{
                                                    padding: 15,
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: '#eee',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}
                                                onPress={() => handleAssignSupervisor(item._id)}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <View style={{
                                                        width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f2f5',
                                                        alignItems: 'center', justifyContent: 'center', marginRight: 12
                                                    }}>
                                                        <Ionicons name="person" size={20} color="#666" />
                                                    </View>
                                                    <View>
                                                        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.username}</Text>
                                                        {item.fullName && <Text style={{ fontSize: 13, color: '#888' }}>{item.fullName}</Text>}
                                                    </View>
                                                </View>
                                                <Ionicons name="add-circle-outline" size={24} color="#2094F3" />
                                            </TouchableOpacity>
                                        )}
                                    />
                                ) : (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: '#888' }}>No available supervisors found.</Text>
                                        <Text style={{ color: '#aaa', fontSize: 12, marginTop: 5 }}>
                                            All supervisors might already be assigned.
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton, { marginTop: 20, width: '100%' }]}
                                    onPress={() => setAssignModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>



            {/* Create Supervisor Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setModalVisible(false);
                    resetForm();
                }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Create New Supervisor</Text>

                            <View style={styles.inputContainer}>
                                <Ionicons
                                    name="person"
                                    size={isIpad ? 24 : 20}
                                    color="#2094F3"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons
                                    name="at"
                                    size={isIpad ? 24 : 20}
                                    color="#2094F3"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    value={formData.username}
                                    onChangeText={(text) => setFormData({ ...formData, username: text })}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons
                                    name="lock-closed"
                                    size={isIpad ? 24 : 20}
                                    color="#2094F3"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    value={formData.password}
                                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholderTextColor="#9CA3AF"
                                />
                                <TouchableOpacity
                                    style={styles.visibilityButton}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off" : "eye"}
                                        size={isIpad ? 24 : 20}
                                        color="#2094F3"
                                    />
                                </TouchableOpacity>
                            </View>

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
                                    style={[styles.button, styles.createButton]}
                                    onPress={createSupervisor}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.createButtonText}>Create</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Credentials Modal */}
            <Modal
                visible={credentialsModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setCredentialsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.credentialsModalContent}>
                        <View style={styles.credentialsHeader}>
                            {selectedSupervisor?.isNew ? (
                                <Ionicons name="checkmark-circle" size={isIpad ? 56 : 48} color="#34c759" />
                            ) : selectedSupervisor?.isReset ? (
                                <Ionicons name="refresh-circle" size={isIpad ? 56 : 48} color="#2094F3" />
                            ) : (
                                <Ionicons name="key" size={isIpad ? 56 : 48} color="#2094F3" />
                            )}
                            <Text style={styles.credentialsTitle}>
                                {selectedSupervisor?.isNew ? 'Supervisor Created' :
                                    selectedSupervisor?.isReset ? 'Password Reset Successfully' :
                                        'Supervisor Credentials'}
                            </Text>
                        </View>

                        <Text style={styles.credentialsSubtitle}>
                            {selectedSupervisor?.isNew ?
                                'Save these credentials in a secure place:' :
                                selectedSupervisor?.isReset ?
                                    'New password has been set. The supervisor will need to log in again.' :
                                    'Login credentials for this supervisor:'}
                        </Text>

                        <View style={styles.credentialBox}>
                            <View style={styles.credentialItem}>
                                <Text style={styles.credentialLabel}>Username:</Text>
                                <Text style={styles.credentialValue}>{selectedSupervisor?.username}</Text>
                            </View>
                            <View style={styles.credentialItem}>
                                <Text style={styles.credentialLabel}>Password:</Text>
                                <Text style={styles.credentialValue}>
                                    {(selectedSupervisor?.isNew || selectedSupervisor?.isReset) ?
                                        selectedSupervisor?.password : ''}
                                </Text>
                            </View>
                        </View>

                        {(selectedSupervisor?.isNew || selectedSupervisor?.isReset) && (
                            <Text style={styles.credentialsWarning}>
                                This password will not be shown again!
                            </Text>
                        )}

                        {!selectedSupervisor?.isNew && !selectedSupervisor?.isReset && (
                            <TouchableOpacity
                                style={styles.resetPasswordButton}
                                onPress={openResetPasswordModal}
                            >
                                <Text style={styles.resetPasswordText}>Reset Password</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setCredentialsModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                visible={resetPasswordModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => {
                    setResetPasswordModalVisible(false);
                    setNewPassword('');
                    setShowNewPassword(false);
                }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Reset Password</Text>

                            {selectedSupervisor && (
                                <Text style={styles.resetPasswordInfo}>
                                    You are resetting the password for supervisor "{selectedSupervisor.username}".
                                    This will force the supervisor to log in again.
                                </Text>
                            )}

                            <View style={styles.inputContainer}>
                                <Ionicons
                                    name="lock-closed"
                                    size={isIpad ? 24 : 20}
                                    color="#2094F3"
                                    style={styles.inputIcon}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showNewPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    placeholderTextColor="#9CA3AF"
                                />
                                <TouchableOpacity
                                    style={styles.visibilityButton}
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                >
                                    <Ionicons
                                        name={showNewPassword ? "eye-off" : "eye"}
                                        size={isIpad ? 24 : 20}
                                        color="#2094F3"
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={() => {
                                        setResetPasswordModalVisible(false);
                                        setNewPassword('');
                                        setShowNewPassword(false);
                                    }}
                                    disabled={resetPasswordLoading}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.button, styles.resetButton]}
                                    onPress={resetSupervisorPassword}
                                    disabled={resetPasswordLoading}
                                >
                                    {resetPasswordLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.resetButtonText}>Reset Password</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    credentialsModalContent: {
        backgroundColor: '#fff',
        borderRadius: screenWidth * 0.04,
        padding: screenWidth * (isIpad ? 0.06 : 0.05),
        width: screenWidth * (isIpad ? 0.7 : 0.9),
        maxWidth: isIpad ? 600 : 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    credentialsHeader: {
        alignItems: 'center',
        marginBottom: screenHeight * 0.03,
    },
    credentialsTitle: {
        fontSize: screenWidth * (isIpad ? 0.035 : 0.05),
        fontWeight: 'bold',
        color: '#333',
        marginTop: screenHeight * 0.015,
        textAlign: 'center',
    },
    credentialsSubtitle: {
        fontSize: screenWidth * (isIpad ? 0.024 : 0.04),
        color: '#666',
        marginBottom: screenHeight * 0.03,
        textAlign: 'center',
        paddingHorizontal: screenWidth * 0.02,
    },
    credentialBox: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: screenWidth * 0.03,
        padding: screenWidth * (isIpad ? 0.05 : 0.045),
        marginBottom: screenHeight * 0.03,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    credentialItem: {
        flexDirection: 'row',
        marginBottom: screenHeight * 0.015,
        alignItems: 'center',
    },
    credentialLabel: {
        fontSize: screenWidth * (isIpad ? 0.025 : 0.035),
        color: '#6B7280',
        width: '35%',
        fontWeight: '500',
    },
    credentialValue: {
        fontSize: screenWidth * (isIpad ? 0.025 : 0.04),
        color: '#333',
        fontWeight: 'bold',
        flex: 1,
    },
    credentialsWarning: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.032),
        color: '#ff4444',
        textAlign: 'center',
        marginBottom: screenHeight * 0.03,
        fontStyle: 'italic',
    },
    resetPasswordButton: {
        backgroundColor: '#F9FAFB',
        paddingVertical: screenHeight * 0.015,
        paddingHorizontal: screenWidth * 0.06,
        borderRadius: screenWidth * 0.03,
        marginBottom: screenHeight * 0.03,
        borderWidth: 1,
        borderColor: '#2094F3',
    },
    resetPasswordText: {
        color: '#2094F3',
        fontSize: screenWidth * (isIpad ? 0.025 : 0.035),
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: '#2094F3',
        paddingVertical: screenHeight * 0.018,
        paddingHorizontal: screenWidth * 0.08,
        borderRadius: screenWidth * 0.03,
        width: '70%',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: screenWidth * (isIpad ? 0.025 : 0.035),
        fontWeight: 'bold',
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
    },
    header: {
        paddingHorizontal: screenWidth * (isIpad ? 0.04 : 0.05),
        paddingTop: screenHeight * (isIpad ? 0.07 : 0.06),
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
        fontSize: screenWidth * (isIpad ? 0.022 : 0.035),
        fontWeight: '400',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderTopLeftRadius: screenWidth * 0.06,
        borderTopRightRadius: screenWidth * 0.06,
        paddingHorizontal: screenWidth * (isIpad ? 0.04 : 0.045),
        paddingTop: screenHeight * (isIpad ? 0.04 : 0.03),
        paddingBottom: screenHeight * (isIpad ? 0.06 : 0.045),
        minHeight: screenHeight * 0.75,
    },
    listContainer: {
        paddingBottom: screenHeight * 0.12,
    },
    supervisorCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: screenWidth * 0.035,
        marginBottom: screenHeight * (isIpad ? 0.03 : 0.02),
        padding: screenWidth * (isIpad ? 0.06 : 0.045),
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    supervisorInfo: {
        flex: 1,
    },
    supervisorName: {
        fontSize: screenWidth * (isIpad ? 0.03 : 0.045),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: screenHeight * 0.005,
    },
    supervisorRole: {
        fontSize: screenWidth * (isIpad ? 0.02 : 0.035),
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewButton: {
        padding: screenWidth * (isIpad ? 0.03 : 0.02),
        marginRight: screenWidth * (isIpad ? 0.04 : 0.03),
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderRadius: 8,
    },
    deleteButton: {
        padding: screenWidth * (isIpad ? 0.03 : 0.02),
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        borderRadius: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: screenHeight * (isIpad ? 0.08 : 0.06),
        marginTop: screenHeight * (isIpad ? 0.2 : 0.15),
    },
    emptyText: {
        fontSize: isIpad ? screenWidth * 0.028 : screenWidth * 0.045,
        color: '#666',
        marginTop: screenHeight * 0.025,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: isIpad ? screenWidth * 0.02 : screenWidth * 0.035,
        color: '#888',
        marginTop: screenHeight * 0.012,
        textAlign: 'center',
    },
    addButton: {
        position: 'absolute',
        bottom: screenHeight * (isIpad ? 0.04 : 0.03),
        right: screenWidth * (isIpad ? 0.04 : 0.05),
        backgroundColor: '#2094F3',
        width: screenWidth * (isIpad ? 0.08 : 0.13),
        height: screenWidth * (isIpad ? 0.08 : 0.13),
        borderRadius: screenWidth * (isIpad ? 0.04 : 0.065),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: screenWidth * (isIpad ? 0.04 : 0.05),
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: screenWidth * 0.04,
        padding: screenWidth * (isIpad ? 0.06 : 0.05),
        width: screenWidth * (isIpad ? 0.7 : 0.9),
        maxWidth: isIpad ? 600 : 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    modalTitle: {
        fontSize: screenWidth * (isIpad ? 0.035 : 0.05),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: screenHeight * 0.03,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: screenHeight * 0.025,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: screenWidth * 0.03,
        backgroundColor: '#F9FAFB',
        overflow: 'hidden',
    },
    inputIcon: {
        padding: screenWidth * (isIpad ? 0.04 : 0.035),
    },
    input: {
        flex: 1,
        paddingVertical: screenHeight * (isIpad ? 0.02 : 0.015),
        fontSize: screenWidth * (isIpad ? 0.025 : 0.04),
        color: '#333',
    },
    visibilityButton: {
        padding: screenWidth * (isIpad ? 0.04 : 0.035),
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: screenHeight * 0.02,
    },
    button: {
        flex: 1,
        paddingVertical: screenHeight * (isIpad ? 0.025 : 0.02),
        borderRadius: screenWidth * 0.03,
        alignItems: 'center',
        marginHorizontal: screenWidth * 0.015,
    },
    cancelButton: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontWeight: 'bold',
        fontSize: screenWidth * (isIpad ? 0.025 : 0.04),
    },
    createButton: {
        backgroundColor: '#2094F3',
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: screenWidth * (isIpad ? 0.025 : 0.04),
    },

});

export default ManageSupervisorsScreen;