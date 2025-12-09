import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ImageBackground,
    SafeAreaView,
    Dimensions,
    Platform,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const TestScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Background Image Section */}
            <View style={styles.topSection}>
                <ImageBackground
                    source={{ uri: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop' }}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['rgba(6, 121, 214, 0.6)', 'rgba(6, 121, 214, 0.6)']}
                        style={styles.overlay}
                    >
                        <SafeAreaView style={styles.headerContainer}>
                            <Text style={styles.greetingText}>Hello!</Text>
                        </SafeAreaView>
                    </LinearGradient>
                </ImageBackground>
            </View>

            {/* Bottom Sheet Section */}
            <View style={styles.bottomSheet}>
                <Text style={styles.loginHeader}>Login</Text>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#A0A0A0"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#A0A0A0"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity style={styles.forgotPasswordContainer}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.loginButton}>
                        <LinearGradient
                            colors={['#0679D6', '#0679D6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            <Text style={styles.loginButtonText}>LOGIN</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.signupContainer}>
                        <Text style={styles.signupText}>Don't have an account? </Text>
                        <TouchableOpacity>
                            <Text style={styles.signupLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    topSection: {
        height: height * 0.4, // Takes up top 40% roughly
        width: '100%',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
    },
    overlay: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    headerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start', // Left align "Hello!"
        paddingBottom: 40,
    },

    greetingText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 40,
        marginLeft: 10,
    },
    bottomSheet: {
        flex: 1,
        backgroundColor: '#F5F6FA',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -40, // Overlap the image
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    loginHeader: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 30,
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        elevation: 2, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    input: {
        height: 50,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#333',
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: '#333',
        fontSize: 14,
    },
    loginButton: {
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#007BFF', // Blue shadow for button
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginBottom: 20,
    },
    gradientButton: {
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    signupText: {
        color: '#333',
        fontSize: 14,
    },
    signupLink: {
        color: '#007BFF',
        fontSize: 14,
        fontWeight: 'normal',
    },
});

export default TestScreen;
