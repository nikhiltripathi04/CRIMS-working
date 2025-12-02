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
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";

const GlobalManageSupervisorsScreen = () => {
    const navigation = useNavigation();
    const [supervisors, setSupervisors] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({
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

    const resetForm = () => {
        setFormData({
            username: '',
            password: ''
        });
        setShowPassword(false);
    };

    const fetchSupervisors = async () => {
        if (!user || !user.id) return;

        setLoading(true);
        try {
            console.log(`Fetching all supervisors for adminId=${user.id}`);
            const response = await axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`);

            if (response.data.success) {
                setSupervisors(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching supervisors:', error);
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
        if (!formData.username || !formData.password) {
            Alert.alert('Error', 'Please enter username and password');
            return;
        }

        if (!user || !user.id) {
            Alert.alert('Error', 'You must be logged in to create a supervisor');
            return;
        }

        try {
            setLoading(true);
            console.log(`Creating supervisor with adminId=${user.id}`);

            const response = await axios.post(`${API_BASE_URL}/api/auth/create-supervisor`, {
                username: formData.username,
                password: formData.password,
                adminId: user.id
            });

            if (response.data.success) {
                await fetchSupervisors();

                setSelectedSupervisor({
                    username: formData.username,
                    password: formData.password,
                    _id: response.data.data.id,
                    isNew: true
                });

                setCredentialsModalVisible(true);
                setModalVisible(false);
                resetForm();
            }
        } catch (error) {
            console.error('Error creating supervisor:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to create supervisor');
        } finally {
            setLoading(false);
        }
    };

    const showCredentials = (supervisor) => {
        setSelectedSupervisor({
            ...supervisor,
            password: '',
            isNew: false,
            isReset: false
        });
        setCredentialsModalVisible(true);
    };

    // Note: Reset password logic might need adjustment if it was site-dependent.
    // For now, assuming we can't easily reset password without site context or need a new endpoint.
    // Actually, the previous endpoint was /api/sites/:siteId/supervisors/:supId/reset-password
    // We might need a global reset password endpoint or just disable it here for now.
    // Let's disable it for now or implement a global one later.
    // Or better, update the backend to allow resetting password without siteId if admin matches.
    // For this iteration, I'll comment out the reset functionality or show a message.

    const renderSupervisorItem = ({ item }) => (
        <View style={styles.supervisorCard}>
            <View style={styles.supervisorInfo}>
                <Text style={styles.supervisorName}>{item.username}</Text>
                <Text style={styles.supervisorRole}>
                    {item.assignedSites && item.assignedSites.length > 0
                        ? `Assigned to ${item.assignedSites.length} site(s)`
                        : 'No sites assigned'}
                </Text>
                {item.assignedSites && item.assignedSites.length > 0 && (
                    <Text style={styles.siteList}>
                        {item.assignedSites.map(s => s.siteName).join(', ')}
                    </Text>
                )}
            </View>

            <View style={styles.actionButtons}>
                {/* 
                <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => showCredentials(item)}
                >
                    <Ionicons name="key-outline" size={22} color="#2094F3" />
                </TouchableOpacity>
                */}
                {/* Delete button logic would also need a global endpoint */}
            </View>
        </View>
    );

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
                    <Text style={{ marginTop: 20, color: '#FFFFFF', fontSize: 16 }}>Loading user data...</Text>
                </View>
            </LinearGradient>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.webBackButton}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
                <Text style={styles.webBackButtonText}>Back</Text>
            </TouchableOpacity>

            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.safeAreaWeb}>
                    <View style={styles.mainContainer}>
                        <View style={styles.header}>
                            <View style={styles.headerContent}>
                                <Text style={styles.title}>Manage Supervisors</Text>
                                <Text style={styles.subtitle}>All Supervisors</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.headerAddButton}
                                onPress={() => {
                                    setModalVisible(true);
                                    resetForm();
                                }}
                            >
                                <Ionicons name="add-circle" size={32} color="#fff" />
                                <Text style={styles.headerAddButtonText}>Create New</Text>
                            </TouchableOpacity>
                        </View>

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
                                            size={64}
                                            color="#9CA3AF"
                                        />
                                        <Text style={styles.emptyText}>No supervisors found</Text>
                                        <Text style={styles.emptySubtext}>
                                            Use the 'Create New' button above to create a supervisor account.
                                        </Text>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </View>
            </LinearGradient>

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
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => {
                        setModalVisible(false);
                        resetForm();
                    }}
                >
                    <Pressable style={styles.modalContent} onPress={() => { }}>
                        <Text style={styles.modalTitle}>Create New Supervisor</Text>

                        <View style={styles.inputContainer}>
                            <Ionicons name="person" size={20} color="#2094F3" style={styles.inputIcon} />
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
                            <Ionicons name="lock-closed" size={20} color="#2094F3" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                value={formData.password}
                                onChangeText={(text) => setFormData({ ...formData, password: text })}
                                secureTextEntry={!showPassword}
                                placeholderTextColor="#9CA3AF"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.createButton]}
                                onPress={createSupervisor}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.createButtonText}>Create</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Credentials Modal */}
            <Modal
                visible={credentialsModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setCredentialsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.successIconContainer}>
                            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                        </View>
                        <Text style={styles.modalTitle}>
                            {selectedSupervisor?.isNew ? 'Supervisor Created!' : 'Supervisor Credentials'}
                        </Text>

                        <View style={styles.credentialsContainer}>
                            <View style={styles.credentialRow}>
                                <Text style={styles.credentialLabel}>Username:</Text>
                                <Text style={styles.credentialValue}>{selectedSupervisor?.username}</Text>
                            </View>
                            {selectedSupervisor?.password ? (
                                <View style={styles.credentialRow}>
                                    <Text style={styles.credentialLabel}>Password:</Text>
                                    <Text style={styles.credentialValue}>{selectedSupervisor?.password}</Text>
                                </View>
                            ) : null}
                        </View>

                        {selectedSupervisor?.isNew && (
                            <Text style={styles.warningText}>
                                Please save these credentials now. The password will not be visible again.
                            </Text>
                        )}

                        <TouchableOpacity
                            style={[styles.modalButton, styles.createButton, { marginTop: 20, width: '100%' }]}
                            onPress={() => setCredentialsModalVisible(false)}
                        >
                            <Text style={styles.createButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    gradient: {
        flex: 1,
    },
    safeAreaWeb: {
        flex: 1,
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    webBackButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 8,
    },
    webBackButtonText: {
        color: '#fff',
        marginLeft: 5,
        fontWeight: '600',
    },
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 20,
    },
    header: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    headerAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2094F3',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        shadowColor: "#2094F3",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    headerAddButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    listContainer: {
        padding: 20,
    },
    supervisorCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#2094F3',
    },
    supervisorInfo: {
        flex: 1,
    },
    supervisorName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    supervisorRole: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    siteList: {
        fontSize: 13,
        color: '#888',
        fontStyle: 'italic',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewButton: {
        padding: 8,
        backgroundColor: '#e3f2fd',
        borderRadius: 8,
        marginRight: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 40,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 300,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 50,
        borderWidth: 1,
        borderColor: '#eee',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        gap: 12,
    },
    modalButton: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    createButton: {
        backgroundColor: '#2094F3',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    successIconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    credentialsContainer: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    credentialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    credentialLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    credentialValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    warningText: {
        color: '#ff9800',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 10,
        fontStyle: 'italic',
    },
});

export default GlobalManageSupervisorsScreen;
