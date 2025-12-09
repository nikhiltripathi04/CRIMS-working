import React, { useState, useRef, useEffect } from 'react';
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
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const SupervisorMessageScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { site } = route.params || {}; // Pass site object
    const { API_BASE_URL, token } = useAuth();

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [video, setVideo] = useState(null);
    const [sending, setSending] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(true);

    // Recording State
    const [permission, requestPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const [cameraVisible, setCameraVisible] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [facing, setFacing] = useState('back');
    const [timer, setTimer] = useState(0);

    // Playback State
    const [playbackModalVisible, setPlaybackModalVisible] = useState(false);
    const [playbackVideoUrl, setPlaybackVideoUrl] = useState(null);

    const timerRef = useRef(null);
    const cameraRef = useRef(null);

    useEffect(() => {
        if (site && site._id) {
            fetchMessages();
        }
    }, [site]);

    const fetchMessages = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/messages/site/${site._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(response.data.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const startRecording = async () => {
        if (cameraRef.current && !isRecording) {
            setIsRecording(true);
            setTimer(0);
            timerRef.current = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);

            try {
                const videoRecordPromise = cameraRef.current.recordAsync({
                    maxDuration: 60,
                    mute: false
                });

                if (videoRecordPromise) {
                    const data = await videoRecordPromise;
                    setVideo(data);
                    setCameraVisible(false);
                }
            } catch (error) {
                console.error("Recording error:", error);
                Alert.alert("Error", `Failed to record video: ${error.message}`);
            } finally {
                setIsRecording(false);
                clearInterval(timerRef.current);
                setTimer(0);
            }
        }
    };

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
        if (!permission || !micPermission) return; // Wait for hooks to load

        if (!permission.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert("Permission required", "Camera permission is required to record video.");
                return;
            }
        }

        if (!micPermission.granted) {
            const result = await requestMicPermission();
            if (!result.granted) {
                Alert.alert("Permission required", "Microphone permission is required to record video.");
                return;
            }
        }

        setCameraVisible(true);
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const closeCamera = () => {
        if (isRecording) {
            stopRecording();
        }
        setCameraVisible(false);
        setTimer(0);
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

            // Reset inputs and refresh list
            setMessage('');
            setVideo(null);
            fetchMessages();

        } catch (error) {
            console.error('Send message error:', error);
            const msg = error.response?.data?.message || 'Failed to send message';
            Alert.alert('Error', msg);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const playVideo = (url) => {
        setPlaybackVideoUrl(url);
        setPlaybackModalVisible(true);
    };

    const renderMessageItem = ({ item }) => {
        const isSupervisor = item.senderRole === 'supervisor';
        // In this screen, we are the supervisor, so 'supervisor' messages are OUR messages (Right aligned)
        // If there were responses (future feature), they would be 'admin' (Left aligned)

        return (
            <View style={[
                styles.messageBubble,
                isSupervisor ? styles.myMessage : styles.theirMessage
            ]}>
                {item.videoUrl && (
                    <TouchableOpacity
                        style={styles.videoThumbnail}
                        onPress={() => playVideo(item.videoUrl)}
                    >
                        <View style={styles.playIconContainer}>
                            <Ionicons name="play" size={24} color="#fff" />
                        </View>
                        <Text style={styles.videoLabel}>Video Message</Text>
                    </TouchableOpacity>
                )}
                {item.content ? (
                    <Text style={[styles.messageText, isSupervisor ? styles.myMessageText : styles.theirMessageText]}>
                        {item.content}
                    </Text>
                ) : null}
                <Text style={styles.messageTime}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
        );
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

            <View style={{ flex: 1, backgroundColor: '#e5ddd5' }}>
                <FlatList
                    data={messages}
                    renderItem={renderMessageItem}
                    keyExtractor={item => item._id}
                    inverted
                    contentContainerStyle={{ padding: 15 }}
                    ListEmptyComponent={
                        !loadingMessages && (
                            <Text style={styles.emptyText}>No messages yet. Send a report or video.</Text>
                        )
                    }
                />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type a message"
                            multiline
                            maxHeight={100}
                            value={message}
                            onChangeText={setMessage}
                        />
                        <TouchableOpacity onPress={pickVideo} style={styles.attachButton}>
                            <Ionicons name="images-outline" size={24} color="#555" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleRecordVideo} style={styles.attachButton}>
                            <Ionicons name="videocam-outline" size={24} color="#555" />
                        </TouchableOpacity>
                    </View>

                    {video && (
                        <View style={styles.previewContainer}>
                            <View style={styles.previewFile}>
                                <Ionicons name="videocam" size={20} color="#007bff" />
                                <Text style={styles.previewName} numberOfLines={1}>
                                    {video.fileName || 'Recorded Video'}
                                </Text>
                                <TouchableOpacity onPress={() => setVideo(null)}>
                                    <Ionicons name="close-circle" size={22} color="#dc3545" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.chatSendButton, (!message.trim() && !video) && styles.chatSendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!message.trim() && !video || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>


            {/* RECORDING MODAL */}
            <Modal visible={cameraVisible} animationType="slide" presentationStyle="fullScreen">
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        ref={cameraRef}
                        mode="video"
                        facing={facing}
                        videoQuality="720p"
                    >
                        <View style={styles.cameraOverlay}>

                            {/* Top Controls */}
                            <View style={styles.cameraTopBar}>
                                <TouchableOpacity onPress={closeCamera} style={styles.iconButton}>
                                    <Ionicons name="close" size={28} color="#fff" />
                                </TouchableOpacity>
                                {isRecording && (
                                    <View style={styles.timerBadge}>
                                        <View style={styles.recordingDot} />
                                        <Text style={styles.timerText}>{formatTime(timer)}</Text>
                                    </View>
                                )}
                                <TouchableOpacity onPress={toggleCameraFacing} style={styles.iconButton}>
                                    <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Bottom Controls */}
                            <View style={styles.cameraBottomBar}>
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
                                    <Text style={styles.instructionText}>
                                        {isRecording ? "Tap square to stop" : "Tap circle to record"}
                                    </Text>
                                </View>
                            </View>

                        </View>
                    </CameraView>
                </View>
            </Modal>

            {/* PLAYBACK MODAL */}
            <Modal visible={playbackModalVisible} animationType="fade" transparent={true}>
                <View style={styles.playbackModalContainer}>
                    <View style={styles.playbackModalContent}>
                        <TouchableOpacity
                            style={styles.closePlaybackButton}
                            onPress={() => {
                                setPlaybackModalVisible(false);
                                setPlaybackVideoUrl(null);
                            }}
                        >
                            <Ionicons name="close" size={30} color="#fff" />
                        </TouchableOpacity>

                        {playbackVideoUrl && (
                            <Video
                                style={styles.playbackVideo}
                                source={{ uri: playbackVideoUrl }}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay
                                isLooping={false}
                            />
                        )}
                    </View>
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
        justifyContent: 'space-between',
        zIndex: 10
    },
    backButton: {
        padding: 4
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },

    // Chat Styles
    messageBubble: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#dcf8c6', // WhatsApp green
        borderTopRightRadius: 0,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderTopLeftRadius: 0,
    },
    messageText: {
        fontSize: 15,
        color: '#303030',
        marginBottom: 4
    },
    myMessageText: {
        color: '#303030'
    },
    theirMessageText: {
        color: '#303030'
    },
    messageTime: {
        fontSize: 10,
        color: '#777',
        alignSelf: 'flex-end',
        marginTop: 2
    },
    videoThumbnail: {
        width: 200,
        height: 120,
        backgroundColor: '#000',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
        position: 'relative'
    },
    playIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5
    },
    videoLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500'
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
        fontSize: 14
    },

    // Input Area Styles
    inputContainer: {
        backgroundColor: '#f0f0f0',
        padding: 8,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: '#333'
    },
    attachButton: {
        padding: 8,
    },
    chatSendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#007bff',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8
    },
    chatSendButtonDisabled: {
        backgroundColor: '#ccc'
    },
    previewContainer: {
        backgroundColor: '#e9ecef',
        padding: 10,
        borderRadius: 8,
        marginVertical: 5,
        marginHorizontal: 5
    },
    previewFile: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    previewName: {
        flex: 1,
        marginHorizontal: 10,
        fontSize: 12,
        color: '#333'
    },

    // Camera Styles
    cameraContainer: { flex: 1, backgroundColor: 'black' },
    camera: { flex: 1 },
    cameraOverlay: {
        flex: 1,
        justifyContent: 'space-between',
    },
    cameraTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
    },
    iconButton: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 25,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.6)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
        marginRight: 8,
    },
    timerText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cameraBottomBar: {
        paddingBottom: 50,
        alignItems: 'center',
        backgroundColor: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', // Just placeholder for logic, RN doesn't support css gradients string.
    },
    cameraControls: {
        alignItems: 'center',
    },
    recordBtn: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 6, borderColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 10
    },
    recordBtnInner: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#dc3545'
    },
    stopBtn: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 6, borderColor: 'rgba(255,255,255,0.6)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 10
    },
    stopBtnInner: {
        width: 36, height: 36, borderRadius: 6,
        backgroundColor: '#dc3545'
    },
    instructionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 2,
        marginTop: 5
    },

    // Playback Modal
    playbackModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playbackModalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center'
    },
    playbackVideo: {
        alignSelf: 'center',
        width: '100%',
        height: '80%',
    },
    closePlaybackButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10
    }
});

export default SupervisorMessageScreen;
