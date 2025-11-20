// screens/SignUpScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Dimensions,
    Platform,
    SafeAreaView,
    KeyboardAvoidingView,
    ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

const SignUpScreen = () => {
    const [formData, setFormData] = useState({
        email: '',
        phoneNumber: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigation = useNavigation();
    const { API_BASE_URL } = useAuth();

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        if (!formData.email || !formData.phoneNumber || !formData.username ||
            !formData.password || !formData.confirmPassword) {
            Alert.alert('Error', 'Please fill in all required fields');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return false;
        }

        if (formData.phoneNumber.length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return false;
        }

        if (formData.username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            Alert.alert('Error', 'Username must be at least 3 characters and contain only letters, numbers, and underscores');
            return false;
        }

        if (formData.password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        return true;
    };

    const handleSignUp = async () => {
        if (!validateForm()) return;

        setLoading(true);
        const fullUrl = `${API_BASE_URL}/api/auth/register`;
        const payload = {
            username: formData.username,
            password: formData.password,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            firmName: formData.firmName
        };

        try {
            const response = await axios.post(fullUrl, payload);
            setLoading(false);

            if (response.data.success) {
                console.log('✅ Signup Successful');
                if (Platform.OS === 'web') {
                    window.alert('Account created successfully! You can now log in.');
                    navigation.navigate('Login');
                } else {
                    Alert.alert('Success', 'Account created successfully! You can now log in.', [
                        { text: 'OK', onPress: () => navigation.navigate('Login') }
                    ]);
                }
            }
        } catch (error) {
            console.log('❌ Signup Error Details:', JSON.stringify({
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                url: fullUrl
            }, null, 2));
            setLoading(false);
            const errorData = error.response?.data;

            if (errorData) {
                console.log('⚠️ Handling error type:', errorData.errorType);
                switch (errorData.errorType) {
                    case 'USERNAME_EXISTS':
                        Alert.alert(
                            'Username Taken',
                            errorData.suggestedUsername
                                ? `${errorData.message}\n\nSuggested: ${errorData.suggestedUsername}`
                                : errorData.message,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                ...(errorData.suggestedUsername ? [{
                                    text: 'Use Suggested',
                                    onPress: () => setFormData(prev => ({ ...prev, username: errorData.suggestedUsername }))
                                }] : [])
                            ]
                        );
                        break;
                    case 'EMAIL_EXISTS':
                        Alert.alert('Email Already Registered', errorData.message || 'This email is already in use.');
                        break;
                    default:
                        console.log('⚠️ Hit default error handler');
                        const msg = errorData.message || 'An unknown error occurred.';
                        if (Platform.OS === 'web') {
                            window.alert('Registration Failed: ' + msg);
                        } else {
                            Alert.alert('Registration Failed', msg);
                        }
                        break;
                }
            } else {
                Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <View style={styles.topContainer}>
                    <Text style={styles.headerTitle}>Create Admin Account</Text>
                    <Text style={styles.headerSubtitle}>
                        Sign up to manage your construction sites efficiently
                    </Text>
                </View>

                <View style={styles.bottomContainer}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.formContainer}>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email *"
                                    placeholderTextColor="#000000"
                                    value={formData.email}
                                    onChangeText={(value) => handleChange('email', value)}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Phone Number *"
                                    placeholderTextColor="#000000"
                                    value={formData.phoneNumber}
                                    onChangeText={(value) => handleChange('phoneNumber', value)}
                                    keyboardType="phone-pad"
                                />
                            </View>



                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username *"
                                    placeholderTextColor="#000000"
                                    value={formData.username}
                                    onChangeText={(value) => handleChange('username', value)}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={styles.passwordInputContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Password *"
                                        placeholderTextColor="#000000"
                                        value={formData.password}
                                        onChangeText={(value) => handleChange('password', value)}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        style={styles.passwordVisibilityButton}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye" : "eye-off"}
                                            size={24}
                                            color="#666"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={styles.passwordInputContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Confirm Password *"
                                        placeholderTextColor="#000000"
                                        value={formData.confirmPassword}
                                        onChangeText={(value) => handleChange('confirmPassword', value)}
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity
                                        style={styles.passwordVisibilityButton}
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? "eye" : "eye-off"}
                                            size={24}
                                            color="#666"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.requiredNote}>* Required fields</Text>

                            <TouchableOpacity
                                style={styles.signupButton}
                                onPress={handleSignUp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.signupButtonText}>SIGN UP</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.loginContainer}>
                                <Text style={styles.alreadyAccountText}>Already have an account? </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={styles.loginText}>Log In</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.poweredBy}>Powered by FeathrTech</Text>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0088E0',
    },
    keyboardAvoid: {
        flex: 1,
    },
    topContainer: {
        backgroundColor: '#0088E0',
        alignItems: 'center',
        paddingTop: isIpad ? 40 : 40,
        paddingBottom: isIpad ? 20 : 15,
    },
    headerTitle: {
        fontSize: isIpad ? 36 : 26,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Akatab',
    },
    headerSubtitle: {
        fontSize: isIpad ? 18 : 14,
        color: '#fff',
        textAlign: 'center',
        marginTop: 6,
        fontFamily: 'Akatab',
        paddingBottom: isIpad ? 20 : 25,
    },
    bottomContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: isIpad ? 25 : 20,
        paddingHorizontal: isIpad ? '15%' : '8%',
    },
    scrollContainer: {
        paddingBottom: 30,
    },
    formContainer: {
        paddingTop: isIpad ? '15%' : '8%',
        flex: 1,
    },
    inputWrapper: {
        backgroundColor: '#EEEEEE',
        borderRadius: 12,
        marginBottom: isIpad ? 20 : 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    input: {
        padding: isIpad ? 20 : 14,
        fontSize: isIpad ? 18 : 14,
        color: '#333',
        fontFamily: 'Akatab',
    },
    passwordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        padding: isIpad ? 20 : 14,
        fontSize: isIpad ? 18 : 14,
        color: '#333',
        fontFamily: 'Akatab',
    },
    passwordVisibilityButton: {
        padding: isIpad ? 15 : 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    requiredNote: {
        fontSize: isIpad ? 16 : 13,
        color: '#666',
        marginBottom: isIpad ? 22 : 16,
        fontFamily: 'Akatab',
    },
    signupButton: {
        backgroundColor: '#0088E0',
        borderRadius: 12,
        padding: isIpad ? 22 : 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    signupButtonText: {
        color: '#FFFFFF',
        fontSize: isIpad ? 20 : 16,
        fontWeight: '700',
        fontFamily: 'Akatab',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: isIpad ? 30 : 20,
    },
    alreadyAccountText: {
        color: '#666',
        fontSize: isIpad ? 16 : 13,
        fontFamily: 'Akatab',
    },
    loginText: {
        color: '#0088E0',
        fontSize: isIpad ? 16 : 13,
        fontWeight: '600',
        fontFamily: 'Akatab',
    },
    poweredBy: {
        textAlign: 'center',
        fontSize: isIpad ? 20 : 16,
        color: '#000',
        fontStyle: 'italic',
        marginTop: 120,
        fontFamily: 'Akatab',
    },
});

export default SignUpScreen;
