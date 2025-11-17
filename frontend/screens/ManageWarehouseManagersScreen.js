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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const ORANGE = '#E69138';
const ORANGE_DARK = '#C97713';

const ManageWarehouseManagersScreen = ({ route }) => {
    const { warehouse } = route.params;
    const { API_BASE_URL, user } = useAuth();

    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Create Manager
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    // Credentials Modal
    const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
    const [selectedManager, setSelectedManager] = useState(null);

    // Reset Password Modal
    const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

    const resetForm = () => {
        setFormData({ username: '', password: '' });
        setShowPassword(false);
    };

    /** -------- Fetch all managers -------- */
    const fetchManagers = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/warehouses/${warehouse._id}/managers?userId=${user.id}`
            );
            if (res.data?.success) {
                setManagers(res.data.data || []);
            } else {
                Alert.alert('Error', 'Failed to fetch managers');
            }
        } catch (e) {
            console.log('Error fetching managers:', e?.response?.data || e.message);
            Alert.alert('Error', 'Failed to fetch managers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchManagers();
    }, [user?.id]);

    /** -------- Create Manager -------- */
    const createManager = async () => {
        if (!formData.username || !formData.password) {
            Alert.alert('Error', 'Please enter username and password');
            return;
        }
        if (!user?.id) {
            Alert.alert('Error', 'You must be logged in as admin');
            return;
        }

        try {
            setLoading(true);
            const res = await axios.post(
                `${API_BASE_URL}/api/warehouses/${warehouse._id}/managers`,
                { username: formData.username, password: formData.password, adminId: user.id }
            );

            if (res.data?.success) {
                await fetchManagers();
                setSelectedManager({
                    _id: res.data.data?.id,
                    username: formData.username,
                    password: formData.password,
                    isNew: true,
                });
                setCredentialsModalVisible(true);
                setModalVisible(false);
                resetForm();
            } else {
                Alert.alert('Error', res.data?.message || 'Failed to create manager');
            }
        } catch (e) {
            console.log('Error creating manager:', e?.response?.data || e.message);
            Alert.alert('Error', e?.response?.data?.message || 'Failed to create manager');
        } finally {
            setLoading(false);
        }
    };

    /** -------- Reset Password -------- */
    const resetManagerPassword = async () => {
        if (!newPassword) {
            Alert.alert('Error', 'Please enter a new password');
            return;
        }
        if (!user?.id) {
            Alert.alert('Error', 'You must be logged in as admin');
            return;
        }

        setResetPasswordLoading(true);
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/warehouses/${warehouse._id}/managers/${selectedManager._id}/reset-password`,
                { newPassword, adminId: user.id }
            );

            if (res.data?.success) {
                setSelectedManager({
                    ...selectedManager,
                    password: newPassword,
                    isReset: true,
                });
                setResetPasswordModalVisible(false);
                setCredentialsModalVisible(true);
                setNewPassword('');
                setShowNewPassword(false);
            } else {
                Alert.alert('Error', res.data?.message || 'Failed to reset password');
            }
        } catch (e) {
            console.log('Error resetting password:', e?.response?.data || e.message);
            Alert.alert('Error', 'Failed to reset manager password');
        } finally {
            setResetPasswordLoading(false);
        }
    };

    const openResetPasswordModal = () => {
        setCredentialsModalVisible(false);
        setTimeout(() => setResetPasswordModalVisible(true), 300);
    };

    /** -------- Delete Manager -------- */
    const deleteManager = async (managerId, username) => {
        if (!user?.id) {
            Alert.alert('Error', 'You must be logged in as admin');
            return;
        }

        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to remove warehouse manager "${username}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await axios.delete(
                                `${API_BASE_URL}/api/warehouses/${warehouse._id}/managers/${managerId}?userId=${user.id}`
                            );
                            await fetchManagers();
                            Alert.alert('Success', `Manager "${username}" removed successfully`);
                        } catch (e) {
                            console.log('Error deleting manager:', e?.response?.data || e.message);
                            Alert.alert('Error', 'Failed to remove manager');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const showCredentials = (manager) => {
        setSelectedManager({ ...manager, password: '', isNew: false, isReset: false });
        setCredentialsModalVisible(true);
    };

    const renderManagerItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.info}>
                <Text style={styles.name}>{item.username}</Text>
                <Text style={styles.role}>Warehouse Manager</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.viewButton} onPress={() => showCredentials(item)}>
                    <Ionicons name="key-outline" size={isIpad ? 26 : 22} color={ORANGE} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteManager(item._id, item.username)}>
                    <Ionicons name="trash-outline" size={isIpad ? 26 : 22} color="#ff4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    /** -------- UI -------- */
    if (!user) {
        return (
            <LinearGradient colors={[ORANGE, ORANGE_DARK]} style={styles.gradient}>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={{ marginTop: 20, color: '#fff', fontSize: isIpad ? 18 : 16 }}>Loading user data...</Text>
                </View>
            </LinearGradient>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={ORANGE} />
            <LinearGradient colors={[ORANGE, ORANGE_DARK]} style={styles.gradient}>
                <SafeAreaView style={styles.safeArea}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.mainContainer}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={styles.title}>Warehouse Managers</Text>
                                <Text style={styles.subtitle}>{warehouse.warehouseName}</Text>
                            </View>

                            {/* Content */}
                            <View style={styles.contentArea}>
                                <FlatList
                                    data={managers}
                                    renderItem={renderManagerItem}
                                    keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
                                    contentContainerStyle={styles.listContainer}
                                    refreshing={loading}
                                    onRefresh={fetchManagers}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <Ionicons name="person-outline" size={isIpad ? 80 : 64} color="#9CA3AF" />
                                            <Text style={styles.emptyText}>No managers assigned</Text>
                                            <Text style={styles.emptySubtext}>Tap the + button to add a warehouse manager</Text>
                                        </View>}
                                />

                                <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                                    <Ionicons name="add" size={isIpad ? 30 : 24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </SafeAreaView>
            </LinearGradient>

            {/* Create Manager Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Create Warehouse Manager</Text>
                            {/* Username & Password fields */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="person" size={20} color={ORANGE} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    value={formData.username}
                                    onChangeText={(text) => setFormData({ ...formData, username: text })}
                                    autoCapitalize="none"
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed" size={20} color={ORANGE} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    value={formData.password}
                                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.visibilityButton}>
                                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={ORANGE} />
                                </TouchableOpacity>
                            </View>

                            {/* Buttons */}
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.createButton]} onPress={createManager}>
                                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createButtonText}>Create</Text>}
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
                            {selectedManager?.isNew ? (
                                <Ionicons name="checkmark-circle" size={isIpad ? 56 : 48} color="#34c759" />
                            ) : selectedManager?.isReset ? (
                                <Ionicons name="refresh-circle" size={isIpad ? 56 : 48} color={ORANGE} />
                            ) : (
                                <Ionicons name="key" size={isIpad ? 56 : 48} color={ORANGE} />
                            )}
                            <Text style={styles.credentialsTitle}>
                                {selectedManager?.isNew ? 'Manager Created' :
                                    selectedManager?.isReset ? 'Password Reset Successfully' :
                                        'Manager Credentials'}
                            </Text>
                        </View>

                        <Text style={styles.credentialsSubtitle}>
                            {selectedManager?.isNew ?
                                'Save these credentials in a secure place:' :
                                selectedManager?.isReset ?
                                    'New password has been set. The manager will need to log in again.' :
                                    'Login credentials for this manager:'}
                        </Text>

                        <View style={styles.credentialBox}>
                            <View style={styles.credentialItem}>
                                <Text style={styles.credentialLabel}>Username:</Text>
                                <Text style={styles.credentialValue}>{selectedManager?.username}</Text>
                            </View>
                            <View style={styles.credentialItem}>
                                <Text style={styles.credentialLabel}>Password:</Text>
                                <Text style={styles.credentialValue}>
                                    {(selectedManager?.isNew || selectedManager?.isReset) ?
                                        selectedManager?.password : '••••••••'}
                                </Text>
                            </View>
                        </View>

                        {(selectedManager?.isNew || selectedManager?.isReset) && (
                            <Text style={styles.credentialsWarning}>
                                This password will not be shown again!
                            </Text>
                        )}

                        {!selectedManager?.isNew && !selectedManager?.isReset && (
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

                            {selectedManager && (
                                <Text style={styles.resetPasswordInfo}>
                                    You are resetting the password for manager "{selectedManager.username}".
                                    This will force the manager to log in again.
                                </Text>
                            )}

                            <View style={styles.inputContainer}>
                                <Ionicons
                                    name="lock-closed"
                                    size={isIpad ? 24 : 20}
                                    color={ORANGE}
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
                                        color={ORANGE}
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
                                    onPress={resetManagerPassword}
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

/** -------- Styles -------- */
const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    mainContainer: { flex: 1 },
    header: { padding: 20, marginTop: 60 },
    title: { color: '#fff', fontWeight: 'bold', fontSize: 24 },
    subtitle: { color: '#fff', fontSize: 16 },
    contentArea: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    role: { fontSize: 14, color: '#666' },
    actions: { flexDirection: 'row' },
    viewButton: {
        padding: 10,
        backgroundColor: 'rgba(230,145,56,0.1)',
        borderRadius: 8,
        marginRight: 10,
    },
    deleteButton: {
        padding: 10,
        backgroundColor: 'rgba(255,68,68,0.1)',
        borderRadius: 8
    },
    addButton: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: ORANGE,
        width: 60,
        height: 60,
        borderRadius: 30,
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        backgroundColor: '#fff',
        width: screenWidth * 0.9,
        maxWidth: 400,
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 12,
        paddingHorizontal: 10,
        height: 50,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        color: '#333',
    },
    inputIcon: { marginRight: 8 },
    visibilityButton: { padding: 8 },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20
    },
    button: {
        flex: 1,
        marginHorizontal: 5,
        borderRadius: 8,
        alignItems: 'center',
        paddingVertical: 12
    },
    cancelButton: { backgroundColor: '#eee' },
    cancelButtonText: { color: '#333', fontWeight: 'bold' },
    createButton: { backgroundColor: ORANGE },
    createButtonText: { color: '#fff', fontWeight: 'bold' },
    resetButton: { backgroundColor: ORANGE },
    resetButtonText: { color: '#fff', fontWeight: 'bold' },
    listContainer: { paddingBottom: 80 },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        marginTop: 80
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
        marginTop: 10
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 5,
        textAlign: 'center',
    },

    // Credentials Modal Styles
    credentialsModalContent: {
        backgroundColor: '#fff',
        width: screenWidth * 0.9,
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    credentialsHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    credentialsTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 12,
        textAlign: 'center',
    },
    credentialsSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    credentialBox: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        marginBottom: 16,
    },
    credentialItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
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
        fontFamily: isIOS ? 'Courier' : 'monospace',
    },
    credentialsWarning: {
        fontSize: 12,
        color: '#ff6b6b',
        textAlign: 'center',
        marginBottom: 16,
        fontStyle: 'italic',
    },
    resetPasswordButton: {
        backgroundColor: ORANGE,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginBottom: 12,
        width: '100%',
    },
    resetPasswordText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    closeButton: {
        backgroundColor: '#f5f5f5',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
    },
    closeButtonText: {
        color: '#333',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    resetPasswordInfo: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
});

export default ManageWarehouseManagersScreen;