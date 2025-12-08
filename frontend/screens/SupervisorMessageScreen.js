import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const SupervisorMessageScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { site } = route.params || {}; // Pass site object
    const { API_BASE_URL, token } = useAuth();

    const [message, setMessage] = useState('');
    const [video, setVideo] = useState(null);
    const [sending, setSending] = useState(false);

    // Recording State
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraVisible, setCameraVisible] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const cameraRef = useRef(null);

    const pickVideo = async () => {
        // Ask for permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to access your media library.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            // Check size if possible (expo-image-picker gives fileSize in bytes usually)
            if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
                Alert.alert('Error', 'Video size too large. Max 50MB.');
                return;
            }
            setVideo(asset);
        }
    };

    const handleRecordVideo = async () => {
        if (!permission) return;
        if (!permission.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert("Permission required", "Camera permission is required to record video.");
                return;
            }
        }
        setCameraVisible(true);
    };

    const startRecording = async () => {
        if (cameraRef.current) {
            setIsRecording(true);
            try {
                // recordAsync returns a promise that resolves when recording stops
                const videoRecordPromise = cameraRef.current.recordAsync({
                    maxDuration: 60, // Limit to 60 seconds
                    quality: '720p',
                    mute: false
                });

                if (videoRecordPromise) {
                    const data = await videoRecordPromise;
                    setVideo(data); // data has { uri }
                    setCameraVisible(false);
                }
            } catch (error) {
                console.error("Recording error:", error);
                Alert.alert("Error", "Failed to record video.");
            } finally {
                setIsRecording(false);
            }
        }
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
            setIsRecording(false);
        }
    };

    const closeCamera = () => {
        if (isRecording) {
            stopRecording();
        }
        setCameraVisible(false);
    };

    const handleSend = async () => {
        if (!message.trim() && !video) {
            Alert.alert('Error', 'Please enter a message or attach a video.');
            return;
        }

        if (!site || !site._id) {
            Alert.alert('Error', 'Site information missing.');
            return;
        }

        setSending(true);

        try {
            const formData = new FormData();
            formData.append('siteId', site._id);
            if (message.trim()) formData.append('content', message.trim());

            if (video) {
                // Append video file
                const localUri = video.uri;
                const filename = localUri.split('/').pop() || 'video.mp4';
                // Guess mime type roughly or just use video/mp4
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `video/${match[1]}` : `video/mp4`;

                formData.append('video', { uri: localUri, name: filename, type });
            }

            // Note: Axios on React Native with FormData needs proper config
            await axios.post(`${API_BASE_URL}/api/messages/send`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            Alert.alert('Success', 'Message sent to Admin!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            console.error('Send message error:', error);
            const msg = error.response?.data?.message || 'Failed to send message';
            Alert.alert('Error', msg);
        } finally {
            setSending(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Message Admin</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    <View style={styles.card}>
                        <Text style={styles.label}>Message / Report</Text>
                        <TextInput
                            style={styles.inputArea}
                            placeholder="Type your message here..."
                            multiline
                            numberOfLines={6}
                            value={message}
                            onChangeText={setMessage}
                            textAlignVertical="top"
                        />

                        <Text style={styles.label}>Attach Video</Text>

                        <View style={styles.mediaButtonsRow}>
                            <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                                <Ionicons name="images-outline" size={24} color="#007bff" />
                                <Text style={styles.uploadText}>Gallery</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.uploadButton} onPress={handleRecordVideo}>
                                <Ionicons name="videocam-outline" size={24} color="#dc3545" />
                                <Text style={[styles.uploadText, { color: '#dc3545' }]}>Record</Text>
                            </TouchableOpacity>
                        </View>

                        {video && (
                            <View style={styles.fileInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Ionicons name="videocam" size={20} color="#555" style={{ marginRight: 8 }} />
                                    <Text style={styles.fileName} numberOfLines={1}>
                                        {video.fileName || 'Recorded Video'}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setVideo(null)}>
                                    <Ionicons name="close-circle" size={24} color="#dc3545" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {video && <Text style={styles.helperText}>Video selected ready to send.</Text>}

                        <TouchableOpacity
                            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                            onPress={handleSend}
                            disabled={sending}
                        >
                            {sending ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.sendButtonText}>Send Message</Text>
                                </>
                            )}
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* CAMERA MODAL */}
            <Modal visible={cameraVisible} animationType="slide" presentationStyle="fullScreen">
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        ref={cameraRef}
                        mode="video"
                        videoQuality="720p"
                    >
                        <View style={styles.cameraOverlay}>
                            <TouchableOpacity onPress={closeCamera} style={styles.closeCameraBtn}>
                                <Ionicons name="close" size={30} color="#fff" />
                            </TouchableOpacity>

                            <View style={styles.cameraControls}>
                                {!isRecording ? (
                                    <TouchableOpacity onPress={startRecording} style={styles.recordBtn}>
                                        <View style={styles.recordBtnInner} />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
                                        <View style={styles.stopBtnInner} />
                                    </TouchableOpacity>
                                )}
                                <Text style={styles.recordingText}>
                                    {isRecording ? "Recording..." : "Tap to Record"}
                                </Text>
                            </View>
                        </View>
                    </CameraView>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f4f6f9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        justifyContent: 'space-between'
    },
    backButton: {
        padding: 4
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    content: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
        marginTop: 12,
    },
    inputArea: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 120,
        color: '#333'
    },
    mediaButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8
    },
    uploadButton: {
        flex: 0.48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 14,
        backgroundColor: '#f8f9fa',
    },
    uploadText: {
        marginLeft: 8,
        color: '#007bff',
        fontWeight: '600',
        fontSize: 14
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#e9ecef',
        padding: 12,
        borderRadius: 8,
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#dee2e6'
    },
    fileName: {
        fontSize: 13,
        color: '#333',
        fontWeight: '500'
    },
    helperText: {
        fontSize: 12,
        color: '#28a745',
        marginTop: 5,
        marginLeft: 2
    },
    sendButton: {
        backgroundColor: '#007bff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        marginTop: 30,
        elevation: 2
    },
    sendButtonDisabled: {
        backgroundColor: '#a0c4ff'
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },

    // Camera Styles
    cameraContainer: { flex: 1, backgroundColor: 'black' },
    camera: { flex: 1 },
    cameraOverlay: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50,
        paddingBottom: 40
    },
    closeCameraBtn: {
        alignSelf: 'flex-end',
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20
    },
    cameraControls: {
        alignItems: 'center',
    },
    recordBtn: {
        width: 70, height: 70, borderRadius: 35,
        borderWidth: 4, borderColor: '#fff',
        justifyContent: 'center', alignItems: 'center'
    },
    recordBtnInner: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#dc3545'
    },
    stopBtn: {
        width: 70, height: 70, borderRadius: 35,
        borderWidth: 4, borderColor: '#fff',
        justifyContent: 'center', alignItems: 'center'
    },
    stopBtnInner: {
        width: 30, height: 30, borderRadius: 4,
        backgroundColor: '#dc3545'
    },
    recordingText: {
        color: '#fff',
        marginTop: 15,
        fontSize: 16,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 4
    }
});

export default SupervisorMessageScreen;
