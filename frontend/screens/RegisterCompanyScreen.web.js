import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

// Use localhost for web development
const API_URL = 'http://localhost:3000/api';

const RegisterCompanyScreen = () => {
    const navigation = useNavigation();
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        mobileNumber: '',
        companyName: '',
        companyRole: '',
        mail: '',
        gstin: '',
        address: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegister = async () => {
        // Detailed Check for Missing Fields
        const missingFields = [];
        if (!formData.name) missingFields.push('Name');
        if (!formData.mobileNumber) missingFields.push('Mobile Number');
        if (!formData.mail) missingFields.push('Email');
        if (!formData.companyName) missingFields.push('Company Name');
        if (!formData.companyRole) missingFields.push('Role in Company');
        if (!formData.gstin) missingFields.push('GSTIN');

        if (missingFields.length > 0) {
            const errorMessage = 'Please fill in the following required fields:\n- ' + missingFields.join('\n- ');

            if (Platform.OS === 'web') {
                window.alert(errorMessage);
            } else {
                Alert.alert('Missing Information', errorMessage);
            }
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/company/register`, formData);

            if (response.data.success) {
                const { credentials } = response.data;
                const message = credentials
                    ? `Registration Successful!\n\nUser: ${credentials.username}\nPass: ${credentials.password}\n\n(Please save these credentials)`
                    : 'Company registered successfully! Credentials have been sent to your email.';

                // Use window.alert for web to ensure visibility
                if (Platform.OS === 'web') {
                    window.alert(message);
                    navigation.navigate('Login');
                } else {
                    Alert.alert(
                        'Success',
                        message,
                        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                    );
                }
            }
        } catch (error) {
            console.error('Registration error details:', error);
            if (error.response) {
                console.error('Server Error Data:', error.response.data);
                console.error('Server Status:', error.response.status);
            }
            const errorMessage = error.response?.data?.message || 'Registration failed';

            if (Platform.OS === 'web') {
                window.alert(errorMessage);
            } else {
                Alert.alert('Error', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.formContainer}>
                <Text style={styles.title}>Register Company</Text>
                <Text style={styles.subtitle}>Join ConERP to manage your construction sites</Text>

                <ScrollView style={styles.scrollForm} showsVerticalScrollIndicator={false}>
                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="First Name"
                                value={formData.name}
                                onChangeText={(text) => handleChange('name', text)}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Surname</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Last Name"
                                value={formData.surname}
                                onChangeText={(text) => handleChange('surname', text)}
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Mobile Number *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Mobile Number"
                        keyboardType="phone-pad"
                        value={formData.mobileNumber}
                        onChangeText={(text) => handleChange('mobileNumber', text)}
                    />

                    <Text style={styles.label}>Email *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={formData.mail}
                        onChangeText={(text) => handleChange('mail', text)}
                    />

                    <Text style={styles.label}>Company Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Company Name"
                        value={formData.companyName}
                        onChangeText={(text) => handleChange('companyName', text)}
                    />

                    <View style={styles.row}>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>Role in Company *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. CEO, Manager"
                                value={formData.companyRole}
                                onChangeText={(text) => handleChange('companyRole', text)}
                            />
                        </View>
                        <View style={styles.halfInput}>
                            <Text style={styles.label}>GSTIN *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="GSTIN"
                                value={formData.gstin}
                                onChangeText={(text) => handleChange('gstin', text)}
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Address</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Company Address"
                        multiline
                        numberOfLines={3}
                        value={formData.address}
                        onChangeText={(text) => handleChange('address', text)}
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Register Company</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
                        <Text style={styles.linkText}>Already have an account? Login</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 30,
        width: '100%',
        maxWidth: 600,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        maxHeight: '90%',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 25,
        textAlign: 'center',
    },
    scrollForm: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfInput: {
        width: '48%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#007bff',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30,
    },
    buttonDisabled: {
        backgroundColor: '#a0cfff',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#007bff',
        fontSize: 16,
    },
});

export default RegisterCompanyScreen;
