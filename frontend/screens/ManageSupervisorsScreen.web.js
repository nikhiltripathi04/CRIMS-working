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



// Web conversion: Define static dimensions used in the old styling logic

const screenWidth = 800;

const screenHeight = 600;

const isIOS = Platform.OS === 'ios';

const isIpad = false;



const ManageSupervisorsScreen = ({ route }) => {

    const navigation = useNavigation();

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
    const [loading, setLoading] = useState(false);

    // Add states for reset password functionality
    const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
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
            // Assuming this endpoint returns all supervisors visible to the admin
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



            const response = await axios.post(`${API_BASE_URL}/api/sites/${site._id}/supervisors`, {
                username: formData.username,
                password: formData.password,
                fullName: formData.name, // Send Full Name
                adminId: user.id
            });



            if (response.data.success) {

                await fetchSupervisors();



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

            password: '',

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



            const response = await axios.put(

                `${API_BASE_URL}/api/sites/${site._id}/supervisors/${selectedSupervisor._id}/reset-password`,

                {

                    newPassword: newPassword,

                    adminId: user.id

                }

            );



            console.log('Reset password response:', response.data);



            if (response.data.success) {

                setSelectedSupervisor({

                    ...selectedSupervisor,

                    password: newPassword,

                    isReset: true

                });



                setResetPasswordModalVisible(false);

                setCredentialsModalVisible(true);



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

        }, 300);

    };



    const deleteSupervisor = async (supervisorId, username) => {

        if (!user || !user.id) {

            Alert.alert('Error', 'You must be logged in to delete a supervisor');

            return;

        }



        const confirmed = window.confirm(

            `Are you sure you want to remove supervisor "${username}"?`

        );



        if (!confirmed) return;



        try {

            setLoading(true);

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

                        size={22}

                        color="#2094F3"

                    />

                </TouchableOpacity>



                <TouchableOpacity

                    style={styles.deleteButton}

                    onPress={() => deleteSupervisor(item._id, item.username)}

                >

                    <Ionicons

                        name="trash-outline"

                        size={22}

                        color="#ff4444"

                    />

                </TouchableOpacity>

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

            {/* Web Back Button */}

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

                        {/* 🌟 UPDATED HEADER: Includes Add Button 🌟 */}

                        <View style={styles.header}>

                            <View style={styles.headerContent}>

                                <Text style={styles.title}>Site Supervisors</Text>

                                <Text style={styles.subtitle}>Site: {site.siteName}</Text>

                            </View>



                            {/* NEW LOCATION FOR ADD BUTTON */}

                            {/* NEW LOCATION FOR ADD BUTTON */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <TouchableOpacity
                                    style={{
                                        ...styles.headerAddButton,
                                        backgroundColor: '#fff',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255,255,255,0.3)',
                                        backgroundColor: 'rgba(255,255,255,0.15)'
                                    }}
                                    onPress={() => {
                                        fetchAvailableSupervisors();
                                        setAssignModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="people" size={24} color="#fff" />
                                    <Text style={styles.headerAddButtonText}>Assign Existing</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.headerAddButton}
                                    onPress={() => {
                                        setModalVisible(true);
                                        resetForm();
                                    }}
                                >
                                    <Ionicons name="add-circle" size={32} color="#fff" />
                                    <Text style={styles.headerAddButtonText}>Add New</Text>
                                </TouchableOpacity>
                            </div>
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
                                            size={64}
                                            color="#9CA3AF"
                                        />
                                        <Text style={styles.emptyText}>No supervisors assigned</Text>
                                        <Text style={styles.emptySubtext}>
                                            Use the 'Assign Existing' or 'Add New' buttons above.
                                        </Text>
                                    </View>
                                }
                            />

                            {/* REMOVED: Floating addButton */}
                        </View>

                    </View>
                </View>
            </LinearGradient>

            {/* Assign Supervisor Modal */}
            <Modal
                visible={assignModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAssignModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setAssignModalVisible(false)}
                >
                    <Pressable style={styles.modalContent} onPress={() => { }}>
                        <Text style={styles.modalTitle}>Assign Existing Supervisor</Text>
                        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>
                            Select a supervisor to assign to {site.siteName}
                        </Text>

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
                            style={{ ...styles.button, backgroundColor: '#f1f3f5', marginTop: 20, width: '100%' }}
                            onPress={() => setAssignModalVisible(false)}
                        >
                            <Text style={{ ...styles.cancelButtonText, color: '#555' }}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
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

                <Pressable

                    style={styles.modalOverlay}

                    onPress={() => {

                        setModalVisible(false);

                        resetForm();

                    }}

                >

                    <Pressable style={styles.modalContent} onPress={() => { /* Prevents closing when clicking inside */ }}>

                        <Text style={styles.modalTitle}>Create New Supervisor</Text>



                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="person-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#999"
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                    autoCapitalize="words"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="at-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter username"
                                    placeholderTextColor="#999"
                                    value={formData.username}
                                    onChangeText={(text) => setFormData({ ...formData, username: text })}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>



                        <View style={styles.inputContainer}>

                            <Ionicons

                                name="lock-closed"

                                size={20}

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

                                    size={20}

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

                                disabled={loading}

                            >

                                <Text style={styles.cancelButtonText}>Cancel</Text>

                            </TouchableOpacity>



                            <TouchableOpacity

                                style={[styles.button, styles.saveButton]}

                                onPress={createSupervisor}

                                disabled={loading}

                            >

                                {loading ? (

                                    <ActivityIndicator size="small" color="#fff" />

                                ) : (

                                    <Text style={styles.saveButtonText}>Create</Text>

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

                <Pressable style={styles.modalOverlay} onPress={() => setCredentialsModalVisible(false)}>

                    <Pressable style={styles.credentialsModalContent} onPress={() => { /* Prevents closing when clicking inside */ }}>

                        <View style={styles.credentialsHeader}>

                            {selectedSupervisor?.isNew ? (

                                <Ionicons name="checkmark-circle" size={48} color="#34c759" />

                            ) : selectedSupervisor?.isReset ? (

                                <Ionicons name="refresh-circle" size={48} color="#2094F3" />

                            ) : (

                                <Ionicons name="key" size={48} color="#2094F3" />

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

                                        selectedSupervisor?.password : '••••••••'}

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

                    </Pressable>

                </Pressable>

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

                <Pressable

                    style={styles.modalOverlay}

                    onPress={() => {

                        setResetPasswordModalVisible(false);

                        setNewPassword('');

                        setShowNewPassword(false);

                    }}

                >

                    <Pressable style={styles.modalContent} onPress={() => { /* Prevents closing when clicking inside */ }}>

                        <Text style={styles.modalTitle}>Reset Password</Text>



                        {selectedSupervisor && (

                            <Text style={styles.resetPasswordInfo}>

                                You're resetting the password for supervisor "**{selectedSupervisor.username}**". This action will force them to log in again.

                            </Text>

                        )}



                        <View style={styles.inputContainer}>

                            <Ionicons

                                name="lock-closed"

                                size={20}

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

                                    size={20}

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

                                style={[styles.button, styles.saveButton]}

                                onPress={resetSupervisorPassword}

                                disabled={resetPasswordLoading}

                            >

                                {resetPasswordLoading ? (

                                    <ActivityIndicator size="small" color="#fff" />

                                ) : (

                                    <Text style={styles.saveButtonText}>Reset Password</Text>

                                )}

                            </TouchableOpacity>

                        </View>

                    </Pressable>

                </Pressable>

            </Modal>

        </View>

    );

};



const styles = StyleSheet.create({

    // --- General Layout Styles ---

    container: {

        flex: 1,

        backgroundColor: '#f8f9fa',

        minHeight: '100vh',

    },

    gradient: {

        flex: 1,

        minHeight: 250,

    },

    safeAreaWeb: {

        flex: 1,

    },

    mainContainer: {

        width: '100%',

        maxWidth: 1200,

        alignSelf: 'center',

    },

    // --- Web Back Button Style ---

    webBackButton: {

        position: 'absolute',

        top: 20,

        left: 20,

        flexDirection: 'row',

        alignItems: 'center',

        backgroundColor: 'rgba(255, 255, 255, 0.2)',

        borderRadius: 20,

        paddingVertical: 8,

        paddingHorizontal: 15,

        zIndex: 10,

        cursor: 'pointer',

    },

    webBackButtonText: {

        color: '#FFFFFF',

        fontSize: 16,

        fontWeight: '600',

        marginLeft: 8,

    },

    // --- Header Styles ---

    header: {

        paddingHorizontal: 30,

        paddingTop: 80,

        paddingBottom: 40,

        flexDirection: 'row',

        justifyContent: 'space-between', // Align content and button

        alignItems: 'flex-start',

    },

    headerContent: {

        flex: 1,

        marginRight: 20, // Space for button

    },

    title: {

        color: '#FFFFFF',

        fontSize: 32,

        fontWeight: 'bold',

        marginBottom: 8,

    },

    subtitle: {

        color: 'rgba(255, 255, 255, 0.8)',

        fontSize: 14,

        fontWeight: '400',

    },

    // --- NEW HEADER ADD BUTTON STYLE ---

    headerAddButton: {

        flexDirection: 'row',

        alignItems: 'center',

        backgroundColor: 'rgba(255, 255, 255, 0.2)',

        paddingHorizontal: 15,

        paddingVertical: 8,

        borderRadius: 10,

        marginTop: 5, // Slight vertical alignment adjustment

        cursor: 'pointer',

        height: 50,

    },

    headerAddButtonText: {

        color: '#FFFFFF',

        fontSize: 16,

        fontWeight: '600',

        marginLeft: 8,

    },

    // --- Content Area ---

    contentArea: {

        flex: 1,

        backgroundColor: '#E5E7EB',

        borderTopLeftRadius: 30,

        borderTopRightRadius: 30,

        paddingHorizontal: 30,

        paddingTop: 30,

        paddingBottom: 60,

        minHeight: '75vh',

    },

    listContainer: {

        paddingBottom: 80,

    },

    // --- Supervisor Card Styles ---

    supervisorCard: {

        backgroundColor: '#FFFFFF',

        borderRadius: 12,

        marginBottom: 15,

        padding: 20,

        flexDirection: 'row',

        alignItems: 'center',

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.1,

        shadowRadius: 6,

        elevation: 4,

        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',

    },

    supervisorInfo: {

        flex: 1,

    },

    supervisorName: {

        fontSize: 18,

        fontWeight: 'bold',

        color: '#333',

        marginBottom: 3,

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

        padding: 10,

        marginRight: 10,

        backgroundColor: 'rgba(33, 150, 243, 0.1)',

        borderRadius: 8,

        cursor: 'pointer',

    },

    deleteButton: {

        padding: 10,

        backgroundColor: 'rgba(255, 68, 68, 0.1)',

        borderRadius: 8,

        cursor: 'pointer',

    },

    // --- Empty State ---

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

    // --- Floating addButton (REMOVED: Keeping style name `addButton` for floating buttons in other screens) ---

    // Floating button styles removed.



    // --- Modal Styles ---

    modalOverlay: {

        flex: 1,

        backgroundColor: 'rgba(0, 0, 0, 0.5)',

        justifyContent: 'center',

        alignItems: 'center',

        position: 'fixed',

        top: 0,

        bottom: 0,

        left: 0,

        right: 0,

    },

    modalContent: {

        backgroundColor: '#fff',

        borderRadius: 15,

        padding: 30,

        width: '90%',

        maxWidth: 500,

        maxHeight: '90vh',

        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',

    },

    modalTitle: {

        fontSize: 20,

        fontWeight: 'bold',

        marginBottom: 20,

        textAlign: 'center',

        color: '#333',

    },

    // --- Input Field Styles ---

    inputContainer: {

        flexDirection: 'row',

        alignItems: 'center',

        marginBottom: 15,

        borderWidth: 1,

        borderColor: '#E5E7EB',

        borderRadius: 8,

        backgroundColor: '#F9FAFB',

        overflow: 'hidden',

    },

    inputIcon: {

        padding: 14,

    },

    input: {

        flex: 1,

        paddingVertical: 9,

        fontSize: 16,

        color: '#333',

        outlineStyle: 'none',

    },

    visibilityButton: {

        padding: 14,

        cursor: 'pointer',

    },

    // --- Modal Button Styles ---

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

        color: '#6B7280',

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

    // --- Credentials Modal Styles ---

    credentialsModalContent: {

        backgroundColor: '#fff',

        borderRadius: 15,

        padding: 30,

        width: '90%',

        maxWidth: 500,

        alignItems: 'center',

        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',

    },

    credentialsHeader: {

        alignItems: 'center',

        marginBottom: 18,

    },

    credentialsTitle: {

        fontSize: 20,

        fontWeight: 'bold',

        color: '#333',

        marginTop: 9,

        textAlign: 'center',

    },

    credentialsSubtitle: {

        fontSize: 16,

        color: '#666',

        marginBottom: 18,

        textAlign: 'center',

        paddingHorizontal: 8,

    },

    credentialBox: {

        width: '100%',

        backgroundColor: '#F9FAFB',

        borderRadius: 8,

        padding: 18,

        marginBottom: 18,

        borderWidth: 1,

        borderColor: '#E5E7EB',

    },

    credentialItem: {

        flexDirection: 'row',

        marginBottom: 9,

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

        marginBottom: 18,

        fontStyle: 'italic',

    },

    resetPasswordButton: {

        backgroundColor: '#F9FAFB',

        paddingVertical: 9,

        paddingHorizontal: 24,

        borderRadius: 8,

        marginBottom: 18,

        borderWidth: 1,

        borderColor: '#2094F3',

        cursor: 'pointer',

    },

    resetPasswordText: {

        color: '#2094F3',

        fontSize: 14,

        fontWeight: 'bold',

    },

    closeButton: {

        backgroundColor: '#2094F3',

        paddingVertical: 12,

        paddingHorizontal: 32,

        borderRadius: 8,

        width: '70%',

        alignItems: 'center',

        cursor: 'pointer',

    },

    closeButtonText: {

        color: '#fff',

        fontSize: 16,

        fontWeight: 'bold',

    },

    resetPasswordInfo: {

        fontSize: 14,

        color: '#666',

        marginBottom: 18,

        textAlign: 'center',

    },

});



export default ManageSupervisorsScreen;