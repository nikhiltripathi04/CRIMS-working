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
    Platform,
    ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

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
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

            {/* Header Section */}
            <View style={styles.headerWrapper}>
                <ImageBackground
                    // source={{ uri: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop' }}
                    style={styles.headerBackground}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['#4CAF50CC', '#2E7D32CC']} // Green gradient
                        style={styles.headerGradient}
                    >
                        <SafeAreaView style={styles.safeArea}>
                            <View style={styles.headerContent}>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <Ionicons name="arrow-back" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>Create Supervisor</Text>
                                <View style={{ width: 40 }} />
                            </View>
                        </SafeAreaView>
                    </LinearGradient>
                </ImageBackground>
            </View>

            {/* Content Area */}
            <View style={styles.contentContainer}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={styles.scrollContainer}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.formCard}>

                            {/* Helper Info */}
                            <View style={styles.cardHeader}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="briefcase" size={24} color="#4CAF50" />
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
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#4CAF50', // Base background matches header
    },
    headerWrapper: {
        height: screenWidth * 0.55,
        maxHeight: 220,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#F2F4F8',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        overflow: 'hidden',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
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
        backgroundColor: '#E8F5E9', // Light green
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
        backgroundColor: '#4CAF50',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonDisabled: {
        backgroundColor: '#81C784',
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
