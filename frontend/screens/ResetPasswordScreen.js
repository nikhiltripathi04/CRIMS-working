// screens/ResetPasswordScreen.js
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

const ResetPasswordScreen = () => {
    const [step, setStep] = useState(1);
    const [verificationData, setVerificationData] = useState({
        username: '',
        email: '',
        phoneNumber: ''
    });
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigation = useNavigation();
    const { API_BASE_URL } = useAuth();

    const handleVerificationChange = (field, value) => {
        setVerificationData(prev => ({ ...prev, [field]: value }));
    };

    const handlePasswordChange = (field, value) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
    };

    const validateVerificationForm = () => {
        const { username, email, phoneNumber } = verificationData;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!username || !email || !phoneNumber) {
            Alert.alert('Error', 'Please fill in all required fields');
            return false;
        }
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email');
            return false;
        }
        if (phoneNumber.length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return false;
        }
        return true;
    };

    const validatePasswordForm = () => {
        const { newPassword, confirmPassword } = passwordData;

        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please enter and confirm your new password');
            return false;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }
        return true;
    };

    const handleVerifyIdentity = async () => {
        if (!validateVerificationForm()) return;
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/verify-identity`, verificationData);
            setLoading(false);

            if (response.data.success) {
                setStep(2);
            } else {
                Alert.alert('Verification Failed', response.data.message || 'Please check your info.');
            }
        } catch (error) {
            setLoading(false);
            const message = error.response?.data?.message || 'Could not verify identity.';
            Alert.alert('Verification Failed', message);
        }
    };

    const handleResetPassword = async () => {
        if (!validatePasswordForm()) return;
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
                username: verificationData.username,
                newPassword: passwordData.newPassword
            });
            setLoading(false);

            if (response.data.success) {
                Alert.alert(
                    'Success',
                    'Your password has been reset. Please log in.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                );
            } else {
                Alert.alert('Reset Failed', response.data.message || 'Try again.');
            }
        } catch (error) {
            setLoading(false);
            const message = error.response?.data?.message || 'Password reset failed.';
            Alert.alert('Reset Failed', message);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.topContainer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                        <Text style={styles.backButtonText}>
                            {step === 2 ? "Back to Verification" : "Back to Login"}
                        </Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {step === 1 ? "Verify Identity" : "Reset Password"}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {step === 1
                            ? "Please provide your account details"
                            : "Enter your new password"}
                    </Text>
                </View>

                <View style={styles.bottomContainer}>
                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <View style={styles.formContainer}>
                            {step === 1 ? (
                                <>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Username *"
                                            value={verificationData.username}
                                            onChangeText={val => handleVerificationChange('username', val)}
                                            placeholderTextColor="#000000"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Email *"
                                            value={verificationData.email}
                                            onChangeText={val => handleVerificationChange('email', val)}
                                            placeholderTextColor="#000000"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Phone Number *"
                                            value={verificationData.phoneNumber}
                                            onChangeText={val => handleVerificationChange('phoneNumber', val)}
                                            placeholderTextColor="#000000"
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                    <Text style={styles.requiredNote}>* Required fields</Text>

                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={handleVerifyIdentity}
                                        disabled={loading}
                                    >
                                        {loading ? <ActivityIndicator color="#fff" /> : (
                                            <Text style={styles.actionButtonText}>VERIFY</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <View style={styles.inputWrapper}>
                                        <View style={styles.passwordInputContainer}>
                                            <TextInput
                                                style={styles.passwordInput}
                                                placeholder="New Password *"
                                                placeholderTextColor="#000000"
                                                secureTextEntry={!showPassword}
                                                value={passwordData.newPassword}
                                                onChangeText={(val) => handlePasswordChange('newPassword', val)}
                                            />
                                            <TouchableOpacity
                                                style={styles.passwordVisibilityButton}
                                                onPress={() => setShowPassword(!showPassword)}
                                            >
                                                <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#666" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.inputWrapper}>
                                        <View style={styles.passwordInputContainer}>
                                            <TextInput
                                                style={styles.passwordInput}
                                                placeholder="Confirm New Password *"
                                                placeholderTextColor="#000000"
                                                secureTextEntry={!showConfirmPassword}
                                                value={passwordData.confirmPassword}
                                                onChangeText={(val) => handlePasswordChange('confirmPassword', val)}
                                            />
                                            <TouchableOpacity
                                                style={styles.passwordVisibilityButton}
                                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={24} color="#666" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <Text style={styles.requiredNote}>Password must be at least 6 characters.</Text>

                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={handleResetPassword}
                                        disabled={loading}
                                    >
                                        {loading ? <ActivityIndicator color="#fff" /> : (
                                            <Text style={styles.actionButtonText}>RESET</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
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
    topContainer: {
        backgroundColor: '#0088E0',
        alignItems: 'center',
        paddingTop: isIpad ? 50 : 50,
        paddingBottom: isIpad ? 80 : 40,
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
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingLeft: isIpad ? 40 : 20,
        marginBottom: 10,
    },
    backButtonText: {
        fontSize: isIpad ? 16 : 14,
        color: '#fff',
        marginLeft: 8,
        fontFamily: 'Akatab',
    },
    headerTitle: {
        fontSize: isIpad ? 36 : 26,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Akatab',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: isIpad ? 18 : 14,
        color: '#fff',
        textAlign: 'center',
        marginTop: 6,
        fontFamily: 'Akatab',
    },
    formContainer: {
        flex: 1,
    },
    inputWrapper: {
        backgroundColor: '#FFFFFF',
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
    actionButton: {
        backgroundColor: '#0088E0',
        borderRadius: 12,
        padding: isIpad ? 22 : 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: isIpad ? 20 : 16,
        fontWeight: '700',
        fontFamily: 'Akatab',
    },
    poweredBy: {
        textAlign: 'center',
        fontSize: isIpad ? 20 : 16,
        color: '#000',
        fontStyle: 'italic',
        marginTop: '90%',
        fontFamily: 'Akatab',
    },
});

export default ResetPasswordScreen;
