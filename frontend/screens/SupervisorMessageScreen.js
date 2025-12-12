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
    FlatList,
    StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    const { site } = route.params || {};
    const { API_BASE_URL, token, user } = useAuth();

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [media, setMedia] = useState(null); // Renamed from video to media
    const [sending, setSending] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(true);

    // Recording State
    const [permission, requestPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraMode, setCameraMode] = useState('video'); // 'video' or 'picture'
    const [isRecording, setIsRecording] = useState(false);
    const [facing, setFacing] = useState('back');
    const [timer, setTimer] = useState(0);

    // Playback/View State
    const [playbackModalVisible, setPlaybackModalVisible] = useState(false);
    const [playbackVideoUrl, setPlaybackVideoUrl] = useState(null);
    const [fullImageModalVisible, setFullImageModalVisible] = useState(false);
    const [fullImageUrl, setFullImageUrl] = useState(null);

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
                    setMedia(data);
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

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: false,
                    exif: false
                });
                setMedia(photo);
                setCameraVisible(false);
            } catch (error) {
                console.error("Take picture error:", error);
                Alert.alert("Error", "Failed to take picture");
            }
        }
    };

    const pickMedia = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to access your media library.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
                Alert.alert('Error', 'File size too large. Max 50MB.');
                return;
            }
            setMedia(asset);
        }
    };

    const handleCameraLaunch = async (mode = 'video') => {
        if (!permission || !micPermission) return;

        if (!permission.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert("Permission required", "Camera permission is required.");
                return;
            }
        }

        if (!micPermission.granted) {
            const result = await requestMicPermission();
            if (!result.granted) {
                Alert.alert("Permission required", "Microphone permission is required for video.");
                return;
            }
        }

        setCameraMode(mode);
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
        if (!message.trim() && !media) {
            Alert.alert('Error', 'Please enter a message or attach media.');
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

            if (media) {
                const localUri = media.uri;
                // Ensure filename has an extension
                let filename = localUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                let ext = match ? match[1].toLowerCase() : (media.type === 'image' ? 'jpg' : 'mp4');

                // If default filename from picker doesn't have extension, append one
                if (!match) {
                    filename = `${filename}.${ext}`;
                }

                // Determine basic mime type
                let type = media.type === 'image' ? `image/${ext}` : `video/${ext}`;

                // Fix common iOS video mime type
                if (ext === 'mov') {
                    type = 'video/quicktime';
                }
                // Fix common image mime type
                if (type === 'image/jpg') {
                    type = 'image/jpeg';
                }

                // NOTE: The backend expects 'video' field name for the file
                formData.append('video', { uri: localUri, name: filename, type });
            }

            await axios.post(`${API_BASE_URL}/api/messages/send`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            setMessage('');
            setMedia(null);
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

    const showImage = (url) => {
        setFullImageUrl(url);
        setFullImageModalVisible(true);
    };

    const renderMessageItem = ({ item }) => {
        const isMe = item.sender === user._id;

        // Determine if media is video or image based on extension
        const isVideo = item.videoUrl && (item.videoUrl.endsWith('.mp4') || item.videoUrl.endsWith('.mov') || item.videoUrl.includes('/video/'));
        const isImage = item.videoUrl && !isVideo; // Fallback assumption or check extensions

        return (
            <View style={{ marginBottom: 10 }}>
                {/* Show sender name if it's not me */}
                {!isMe && (
                    <Text style={{ fontSize: 12, color: '#666', marginLeft: 4, marginBottom: 2 }}>
                        {item.senderName} ({item.senderRole})
                    </Text>
                )}

                <View style={[
                    styles.messageBubble,
                    isMe ? styles.myMessage : styles.theirMessage
                ]}>
                    {item.videoUrl && isVideo && (
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
                    {item.videoUrl && isImage && (
                        <TouchableOpacity
                            style={styles.imageThumbnailContainer}
                            onPress={() => showImage(item.videoUrl)}
                        >
                            <Image
                                source={{ uri: item.videoUrl }}
                                style={styles.imageThumbnail}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    )}
                    {item.content ? (
                        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
                            {item.content}
                        </Text>
                    ) : null}
                    <Text style={styles.messageTime}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#34C759" />
            <LinearGradient
                colors={['#34C759', '#2E9F4A']} // Green gradient
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Message Admin</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Content Area */}
                        <KeyboardAvoidingView
                            style={styles.contentArea}
                            behavior={Platform.OS === "ios" ? "padding" : "height"}
                            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
                        >
                            <View style={{ flex: 1 }}>
                                <FlatList
                                    data={messages}
                                    renderItem={renderMessageItem}
                                    keyExtractor={item => item._id}
                                    inverted
                                    contentContainerStyle={{ padding: 15 }}
                                    ListEmptyComponent={
                                        !loadingMessages && (
                                            <View style={styles.emptyContainer}>
                                                <View style={styles.emptyIconBox}>
                                                    <Ionicons name="chatbubbles-outline" size={32} color="#ccc" />
                                                </View>
                                                <Text style={styles.emptyText}>No messages yet.</Text>
                                                <Text style={styles.emptySubText}>Send a report or video to the admin.</Text>
                                            </View>
                                        )
                                    }
                                />

                                <View style={styles.inputContainer}>
                                    {media && (
                                        <View style={styles.previewContainer}>
                                            <View style={styles.previewFile}>
                                                <Ionicons
                                                    name={media.type === 'image' || !media.duration ? "image" : "videocam"}
                                                    size={20}
                                                    color="#34C759"
                                                />
                                                <Text style={styles.previewName} numberOfLines={1}>
                                                    {media.fileName || (media.type === 'image' ? 'Image Selected' : 'Video Selected')}
                                                </Text>
                                                <TouchableOpacity onPress={() => setMedia(null)}>
                                                    <Ionicons name="close-circle" size={22} color="#dc3545" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.inputRow}>
                                        <TouchableOpacity onPress={pickMedia} style={styles.attachButton}>
                                            <Ionicons name="images-outline" size={24} color="#34C759" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleCameraLaunch('picture')} style={styles.attachButton}>
                                            <Ionicons name="camera-outline" size={24} color="#34C759" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleCameraLaunch('video')} style={styles.attachButton}>
                                            <Ionicons name="videocam-outline" size={24} color="#34C759" />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Type a message..."
                                            placeholderTextColor="#999"
                                            multiline
                                            maxHeight={100}
                                            value={message}
                                            onChangeText={setMessage}
                                        />
                                        <TouchableOpacity
                                            style={[styles.chatSendButton, (!message.trim() && !media) && styles.chatSendButtonDisabled]}
                                            onPress={handleSend}
                                            disabled={!message.trim() && !media || sending}
                                        >
                                            {sending ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Ionicons name="send" size={20} color="#fff" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* RECORDING/CAMERA MODAL */}
            <Modal visible={cameraVisible} animationType="slide" presentationStyle="fullScreen">
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        ref={cameraRef}
                        mode={cameraMode}
                        facing={facing}
                        videoQuality="720p"
                    >
                        <View style={styles.cameraOverlay}>
                            <View style={styles.cameraTopBar}>
                                <TouchableOpacity onPress={closeCamera} style={styles.iconButton}>
                                    <Ionicons name="close" size={28} color="#fff" />
                                </TouchableOpacity>
                                {cameraMode === 'video' && isRecording && (
                                    <View style={styles.timerBadge}>
                                        <View style={styles.recordingDot} />
                                        <Text style={styles.timerText}>{formatTime(timer)}</Text>
                                    </View>
                                )}
                                <TouchableOpacity onPress={toggleCameraFacing} style={styles.iconButton}>
                                    <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.cameraBottomBar}>
                                <View style={styles.cameraControls}>
                                    {cameraMode === 'video' ? (
                                        !isRecording ? (
                                            <TouchableOpacity onPress={() => handleCameraLaunch('video') && startRecording()} style={styles.recordBtn}>
                                                <View style={styles.recordBtnInner} />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
                                                <View style={styles.stopBtnInner} />
                                            </TouchableOpacity>
                                        )
                                    ) : (
                                        <TouchableOpacity onPress={takePicture} style={styles.shutterBtn}>
                                            <View style={styles.shutterBtnInner} />
                                        </TouchableOpacity>
                                    )}
                                    <Text style={styles.instructionText}>
                                        {cameraMode === 'video'
                                            ? (isRecording ? "Tap square to stop" : "Tap circle to record")
                                            : "Tap to take photo"
                                        }
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

            {/* FULL IMAGE MODAL */}
            <Modal visible={fullImageModalVisible} animationType="fade" transparent={true}>
                <View style={styles.playbackModalContainer}>
                    <TouchableOpacity
                        style={styles.closePlaybackButton}
                        onPress={() => {
                            setFullImageModalVisible(false);
                            setFullImageUrl(null);
                        }}
                    >
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    {fullImageUrl && (
                        <Image
                            source={{ uri: fullImageUrl }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#34C759' },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    mainContainer: { flex: 1, width: '100%' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10, // Fixed padding for Android
        paddingBottom: 20
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 0.5
    },

    contentArea: {
        flex: 1,
        backgroundColor: '#F2F4F8',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },

    //Chat
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
        opacity: 0.6
    },
    emptyIconBox: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e0e0',
        justifyContent: 'center', alignItems: 'center', marginBottom: 10
    },
    emptyText: { textAlign: 'center', color: '#666', fontSize: 16, fontWeight: '600' },
    emptySubText: { textAlign: 'center', color: '#999', fontSize: 14, marginTop: 4 },

    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#E6F9E9', // Light Green
        borderBottomRightRadius: 2,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 2,
    },
    messageText: {
        fontSize: 15,
        color: '#333',
        marginBottom: 4,
        lineHeight: 20
    },
    myMessageText: { color: '#004d00' },
    theirMessageText: { color: '#333' },
    messageTime: {
        fontSize: 10,
        color: 'rgba(0,0,0,0.5)',
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

    // Input Area
    inputContainer: {
        backgroundColor: '#fff',
        padding: 10,
        paddingBottom: Platform.OS === 'ios' ? 10 : 10,
        borderTopWidth: 1,
        borderTopColor: '#eee'
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end', // Align bottom so text area grows up
        backgroundColor: '#F2F4F8',
        borderRadius: 25,
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        maxHeight: 120,
        paddingHorizontal: 10,
        paddingVertical: 8, // Center vertically roughly
        color: '#333',
        marginHorizontal: 5
    },
    attachButton: {
        padding: 8,
    },
    chatSendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#34C759',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
        marginBottom: 2 // Tiny tweak for alignment
    },
    chatSendButtonDisabled: {
        backgroundColor: '#ccc'
    },
    previewContainer: {
        backgroundColor: '#e9ecef',
        padding: 10,
        borderRadius: 8,
        marginVertical: 5,
        marginBottom: 10
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
    cameraOverlay: { flex: 1, justifyContent: 'space-between' },
    cameraTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20 },
    iconButton: { padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25 },
    timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 0, 0, 0.6)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', marginRight: 8 },
    timerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    cameraBottomBar: { paddingBottom: 50, alignItems: 'center' },
    cameraControls: { alignItems: 'center' },
    recordBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    recordBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#dc3545' },
    stopBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    stopBtnInner: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#dc3545' },
    instructionText: { color: '#fff', fontSize: 14, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2, marginTop: 5 },

    // Playback Modal
    playbackModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    playbackModalContent: { width: '100%', height: '100%', justifyContent: 'center' },
    playbackVideo: { alignSelf: 'center', width: '100%', height: '80%' },
    closePlaybackButton: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },

    // Image items
    imageThumbnailContainer: { marginVertical: 5 },
    imageThumbnail: { width: 200, height: 200, borderRadius: 12, backgroundColor: '#eee' },
    fullImage: { width: '100%', height: '80%' },
    shutterBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    shutterBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' }
});

export default SupervisorMessageScreen;
