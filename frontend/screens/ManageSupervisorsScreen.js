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
    StatusBar,
    ImageBackground,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;


const ManageSupervisorsScreen = ({ route, navigation }) => {
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
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#007ADC' }]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={{ marginTop: 20, color: '#FFFFFF', fontSize: isIpad ? 18 : 16 }}>Loading user data...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            {/* Header Section */}
            <View style={styles.headerWrapper}>
                <ImageBackground
                    // source={{ uri: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop' }}
                    style={styles.headerBackground}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['#007ADC99', '#007ADC99']}
                        style={styles.headerGradient}
                    >
                        <SafeAreaView style={styles.safeArea}>
                            <View style={styles.headerContent}>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <Ionicons name="arrow-back" size={24} color="#fff" />
                                </TouchableOpacity>
                                <View style={styles.headerTitleBlock}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Text style={styles.headerTitle}>Site Supervisors</Text>
                                    </View>
                                    <Text style={styles.headerSubtitle}>
                                        {site.siteName ? `${site.siteName} • ` : ''}{site.location || 'Site Details'}
                                    </Text>
                                </View>
                            </View>
                        </SafeAreaView>
                    </LinearGradient>
                </ImageBackground>
            </View>

            {/* Content Section */}
            <View style={styles.contentContainer}>
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

                    {/* Floating Buttons */}
                    <TouchableOpacity
                        style={[styles.addButton, { bottom: screenHeight * (isIpad ? 0.04 : 0.03) + 70, backgroundColor: '#fff', borderWidth: 1, borderColor: '#007ADC' }]}
                        onPress={() => {
                            fetchAvailableSupervisors();
                            setAssignModalVisible(true);
                        }}
                    >
                        <Ionicons name="people" size={isIpad ? 30 : 24} color="#007ADC" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Ionicons name="add" size={isIpad ? 30 : 24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

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
    container: {
        flex: 1,
        backgroundColor: '#007ADC',
    },
    headerWrapper: {
        height: screenHeight * 0.22,
        width: '100%',
    },
    headerBackground: {
        flex: 1,
        width: '100%',
    },
    headerGradient: {
        flex: 1,
        justifyContent: 'center',
    },
    safeArea: {
        flex: 1,
    },
    headerContent: {
        paddingHorizontal: screenWidth * 0.05,
        flexDirection: 'row',
        alignItems: 'center',
        height: '100%',
        paddingBottom: 20, // Adjust for spacing
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginRight: 15,
    },
    headerTitleBlock: {
        flex: 1,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: isIpad ? 28 : 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: isIpad ? 16 : 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#F2F4F8',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        overflow: 'hidden',
    },
    contentArea: {
        flex: 1,
        paddingHorizontal: screenWidth * (isIpad ? 0.04 : 0.05),
        paddingTop: 24,
    },
    listContainer: {
        paddingBottom: 100,
    },
    supervisorCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    supervisorInfo: {
        flex: 1,
    },
    supervisorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    supervisorRole: {
        fontSize: 14,
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewButton: {
        padding: 8,
        marginRight: 8,
        backgroundColor: '#E6F2FF',
        borderRadius: 8,
    },
    deleteButton: {
        padding: 8,
        backgroundColor: '#FFE6EA',
        borderRadius: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginTop: 20,
        fontWeight: '500',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    addButton: {
        position: 'absolute',
        bottom: screenHeight * (isIpad ? 0.04 : 0.03),
        right: screenWidth * (isIpad ? 0.04 : 0.05),
        backgroundColor: '#007ADC',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007ADC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
    },
    inputIcon: {
        padding: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    visibilityButton: {
        padding: 12,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        gap: 12
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontWeight: 'bold',
        fontSize: 16,
    },
    createButton: {
        backgroundColor: '#007ADC',
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    resetButton: {
        backgroundColor: '#007ADC',
    },
    resetButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Credentials Modal
    credentialsModalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
        elevation: 10,
    },
    credentialsHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    credentialsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
        textAlign: 'center',
    },
    credentialsSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    credentialBox: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    credentialItem: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'center',
    },
    credentialLabel: {
        fontSize: 14,
        color: '#6B7280',
        width: '35%',
        fontWeight: '500',
    },
    credentialValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
        flex: 1,
    },
    credentialsWarning: {
        fontSize: 12,
        color: '#ff4444',
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    resetPasswordButton: {
        backgroundColor: '#F9FAFB',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#007ADC',
        width: '100%',
        alignItems: 'center'
    },
    resetPasswordText: {
        color: '#007ADC',
        fontSize: 14,
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: '#007ADC',
        paddingVertical: 12,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default ManageSupervisorsScreen;