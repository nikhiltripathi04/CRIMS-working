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

const { width: screenWidth } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const CreateWarehouseScreen = ({ navigation }) => {
    const [warehouseName, setWarehouseName] = useState('');
    const [location, setLocation] = useState('');
    const [managerUsername, setManagerUsername] = useState('');
    const [managerPassword, setManagerPassword] = useState('');
    const [showManagerPassword, setShowManagerPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { API_BASE_URL, user } = useAuth();

    const handleCreateWarehouse = async () => {
        if (!warehouseName || !location || !managerUsername || !managerPassword) {
            Alert.alert('Error', 'Please fill in all the fields');
            return;
        }

        if (!user || !user.id) {
            Alert.alert('Error', 'User information not available. Please log in again.');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/warehouses`, {
                warehouseName,
                location,
                managerUsername,
                managerPassword,
                adminId: user.id // Pass adminId for admin-only endpoint
            });

            if (response.data.success) {
                Alert.alert(
                    'Success',
                    `Warehouse created!\n\nManager credentials:\n\nUsername: ${managerUsername}\nPassword: ${managerPassword}\n\nSave these, as the password will not be shown again.`,
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Error', response.data.message || 'Failed to create warehouse');
            }
        } catch (error) {
            if (error.response) {
                Alert.alert('Error', error.response.data.message || 'Failed to create warehouse');
            } else {
                Alert.alert('Error', 'Failed to create warehouse. Please check your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#E69138" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Create New Warehouse</Text>
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
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Warehouse Name <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="cube-outline" size={isIpad ? 24 : 20} color="#E69138" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={warehouseName}
                                    onChangeText={setWarehouseName}
                                    placeholder="Enter warehouse name"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Location <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="location-outline" size={isIpad ? 24 : 20} color="#E69138" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={location}
                                    onChangeText={setLocation}
                                    placeholder="Enter location"
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Manager Username <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={isIpad ? 24 : 20} color="#E69138" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={managerUsername}
                                    onChangeText={setManagerUsername}
                                    placeholder="Choose username for manager"
                                    placeholderTextColor="#999"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Manager Password <Text style={styles.requiredStar}>*</Text></Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={isIpad ? 24 : 20} color="#E69138" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={managerPassword}
                                    onChangeText={setManagerPassword}
                                    placeholder="Set password for manager"
                                    placeholderTextColor="#999"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    secureTextEntry={!showManagerPassword}
                                />
                                <TouchableOpacity onPress={() => setShowManagerPassword(s => !s)} style={{ paddingHorizontal: 10 }}>
                                    <Ionicons name={showManagerPassword ? 'eye' : 'eye-off'} size={20} color="#E69138" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleCreateWarehouse}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size={isIpad ? "large" : "small"} />
                                ) : (
                                    <>
                                        <Ionicons name="add-circle-outline" size={isIpad ? 24 : 20} color="#fff" style={styles.buttonIcon} />
                                        <Text style={styles.buttonText}>Create Warehouse</Text>
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
        backgroundColor: '#E69138',
    },
    header: {
        backgroundColor: '#E69138',
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
        marginTop: 80
    },
    headerTitle: {
        fontSize: isIpad ? 28 : 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    container: {
        flex: 1,
        backgroundColor: '#E69138',
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
        backgroundColor: '#E69138',
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
        backgroundColor: '#f4c078',
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

export default CreateWarehouseScreen;