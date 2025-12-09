import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

// Get screen dimensions for responsive design
const { width: screenWidth } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const CreateSupervisorScreen = () => {
    const navigation = useNavigation();
    const { API_BASE_URL, token, user } = useAuth();

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCreateSupervisor = async () => {
        // 1. Validation
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a name');
            return;
        }
        if (!username.trim()) {
            Alert.alert('Error', 'Please enter a username');
            return;
        }
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter a password');
            return;
        }

        if (!user || !user.id) {
            Alert.alert('Error', 'You must be logged in to create a supervisor');
            return;
        }

        setLoading(true);

        try {
            // 2. API Call
            const supervisorData = {
                username: username.trim(),
                password: password.trim(),
                fullName: name.trim(),
                adminId: user.id
            };

            // Note: Supervisor creation in web uses /api/auth/create-supervisor and apparently doesn't need token if adminId is passed? 
            // Checking GlobalManageSupervisorsScreen.web.js, it sends adminId in body.
            // But typically we should also send token if authenticated.
            // The web version didn't explicitly show passing config with token, but axios might have interceptors.
            // We'll pass the token just in case.
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const res = await axios.post(`${API_BASE_URL}/api/auth/create-supervisor`, supervisorData, config);

            if (res.data.success) {
                // 3. Success Handling
                Alert.alert(
                    'Success',
                    `Supervisor created successfully!\n\nUsername: ${username}\nPassword: ${password}\n\nPlease save these credentials.`,
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                throw new Error(res.data.message || 'Failed to create supervisor');
            }

        } catch (err) {
            console.error(err);
            const msg = err?.response?.data?.message || err.message || 'Failed to create supervisor';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#2094f3" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Create Supervisor</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formCard}>

                        {/* Header Icon/Description inside Card */}
                        <View style={styles.cardHeader}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="briefcase" size={24} color="#6610f2" />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Supervisor Details</Text>
                                <Text style={styles.cardSubtitle}>Create account for site supervision</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Name <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter full name"
                                    placeholderTextColor="#999"
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Username Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="e.g. site_sup_01"
                                    placeholderTextColor="#999"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter password"
                                    placeholderTextColor="#999"
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={{ paddingHorizontal: 10 }}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye' : 'eye-off'}
                                        size={20}
                                        color="#666"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleCreateSupervisor}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size={isIpad ? "large" : "small"} />
                                ) : (
                                    <>
                                        <Ionicons name="add-circle-outline" size={isIpad ? 24 : 20} color="#fff" style={styles.buttonIcon} />
                                        <Text style={styles.buttonText}>
                                            Create Supervisor
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => navigation.goBack()}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="close-circle-outline" size={isIpad ? 24 : 20} color="#333" style={styles.buttonIcon} />
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#2094f3',
    },
    header: {
        backgroundColor: '#2094f3',
        paddingTop: Platform.OS === 'ios' ? (isIpad ? 20 : 40) : 20,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
        alignItems: 'center',
        marginTop: 10
    },
    headerTitle: {
        fontSize: isIpad ? 28 : 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    container: {
        flex: 1,
        backgroundColor: '#2094f3',
    },
    contentContainer: {
        padding: isIpad ? 40 : 20,
        paddingTop: isIpad ? 20 : 10,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: isIpad ? 30 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3e5f5', // Purple tint for supervisor
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardTitle: {
        fontSize: isIpad ? 20 : 18,
        fontWeight: '700',
        color: '#333',
    },
    cardSubtitle: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e5e5',
        marginVertical: isIpad ? 25 : 20,
    },
    inputGroup: {
        marginBottom: isIpad ? 30 : 20,
    },
    label: {
        fontSize: isIpad ? 18 : 16,
        marginBottom: isIpad ? 12 : 8,
        color: '#333',
        fontWeight: '600',
        paddingLeft: 4,
    },
    requiredStar: {
        color: '#ff3b30',
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    inputIcon: {
        paddingLeft: isIpad ? 16 : 12,
    },
    input: {
        flex: 1,
        padding: isIpad ? 18 : 15,
        fontSize: isIpad ? 18 : 16,
        color: '#333',
    },
    buttonContainer: {
        marginTop: isIpad ? 30 : 20,
    },
    button: {
        backgroundColor: '#6610f2', // Purple for supervisor
        padding: isIpad ? 18 : 15,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: isIpad ? 16 : 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: '#a384f5',
    },
    buttonText: {
        color: '#fff',
        fontSize: isIpad ? 18 : 16,
        fontWeight: 'bold',
    },
    buttonIcon: {
        marginRight: 8,
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        padding: isIpad ? 18 : 15,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        color: '#333',
        fontSize: isIpad ? 18 : 16,
        fontWeight: '500',
    }
});

export default CreateSupervisorScreen;
