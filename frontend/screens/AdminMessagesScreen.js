import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Linking,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from 'expo-av';

const AdminMessagesScreen = () => {
    const { user, API_BASE_URL, token } = useAuth();
    const navigation = useNavigation();

    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState(null); // If null, show list. If set, show chat.
    const [searchQuery, setSearchQuery] = useState('');

    // For Chat View
    const [activeConversation, setActiveConversation] = useState(null);

    // Playback State
    const [playbackModalVisible, setPlaybackModalVisible] = useState(false);
    const [playbackVideoUrl, setPlaybackVideoUrl] = useState(null);

    // Fetch all messages
    const fetchMessages = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/messages/admin/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                const allMsgs = res.data.data;
                setMessages(allMsgs);
                processConversations(allMsgs);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL, token]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 30000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    const processConversations = (msgs) => {
        const groups = {};
        msgs.forEach(msg => {
            const senderId = msg.sender;
            if (!groups[senderId]) {
                groups[senderId] = {
                    id: senderId,
                    name: msg.senderName,
                    role: msg.senderRole,
                    siteName: msg.siteName,
                    lastMessage: msg,
                    messages: []
                };
            }
            groups[senderId].messages.push(msg);
        });

        const sorted = Object.values(groups).sort((a, b) =>
            new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
        );
        setConversations(sorted);

        // Update active conversation if one is selected
        if (selectedSupervisorId) {
            const updatedActive = sorted.find(c => c.id === selectedSupervisorId);
            if (updatedActive) {
                setActiveConversation(updatedActive);
            }
        }
    };

    const handleSelectConversation = (conv) => {
        setSelectedSupervisorId(conv.id);
        setActiveConversation(conv);
    };

    const handleBackToList = () => {
        setSelectedSupervisorId(null);
        setActiveConversation(null);
    };

    const playVideo = (url) => {
        setPlaybackVideoUrl(url);
        setPlaybackModalVisible(true);
    };

    const downloadVideo = (url) => {
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const renderConversationItem = ({ item }) => (
        <TouchableOpacity style={styles.conversationItem} onPress={() => handleSelectConversation(item)}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.convInfo}>
                <View style={styles.convHeader}>
                    <Text style={styles.convName}>{item.name}</Text>
                    <Text style={styles.convTime}>
                        {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <Text style={styles.convSite}>{item.siteName}</Text>
                <Text style={styles.convPreview} numberOfLines={1}>
                    {item.lastMessage.videoUrl ? '📹 Video Message' : item.lastMessage.content}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderMessageItem = ({ item }) => (
        <View style={styles.messageRow}>
            <View style={styles.messageBubble}>
                {item.videoUrl && (
                    <View style={styles.mediaContainer}>
                        <TouchableOpacity
                            style={styles.videoThumbnail}
                            onPress={() => playVideo(item.videoUrl)}
                        >
                            <View style={styles.videoOverlay}>
                                <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.mediaFooter}>
                            <Text style={styles.mediaText}>Video Message</Text>
                            <TouchableOpacity
                                style={styles.downloadBtn}
                                onPress={() => downloadVideo(item.videoUrl)}
                            >
                                <Ionicons name="download-outline" size={20} color="#007bff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {item.content ? (
                    <Text style={styles.messageText}>{item.content}</Text>
                ) : null}

                <View style={styles.metaContainer}>
                    <Text style={styles.messageTime}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {item.videoUrl && <Ionicons name="videocam" size={12} color="#999" style={{ marginLeft: 4 }} />}
                </View>
            </View>
        </View>
    );

    const filteredConversations = conversations.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.siteName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedSupervisorId && activeConversation) {
        // Chat View
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.chatHeader}>
                        <TouchableOpacity onPress={handleBackToList} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <View style={styles.headerAvatar}>
                            <Text style={styles.headerAvatarText}>{activeConversation.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View>
                            <Text style={styles.chatTitle}>{activeConversation.name}</Text>
                            <Text style={styles.chatSubtitle}>{activeConversation.siteName}</Text>
                        </View>
                    </View>

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#e5ddd5' }}>
                        <FlatList
                            data={[...activeConversation.messages].reverse()} // Reverse for FlatList inverted-like behavior if we used inverted, but here we just map normal
                            renderItem={renderMessageItem}
                            keyExtractor={item => item._id}
                            contentContainerStyle={styles.messagesList}
                            inverted
                        />
                    </KeyboardAvoidingView>
                </SafeAreaView>

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
            </View>
        );
    }

    // List View
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient colors={["#2094F3", "#0B7DDA"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.title}>Messages</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={styles.contentArea}>
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search supervisors..."
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            {loading ? (
                                <ActivityIndicator size="large" color="#2094F3" style={{ marginTop: 20 }} />
                            ) : (
                                <FlatList
                                    data={filteredConversations}
                                    keyExtractor={item => item.id}
                                    renderItem={renderConversationItem}
                                    contentContainerStyle={styles.listContainer}
                                    ListEmptyComponent={() => (
                                        <View style={styles.emptyState}>
                                            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                                            <Text style={styles.emptyText}>No messages found</Text>
                                        </View>
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    chatSafeArea: { flex: 1, backgroundColor: '#fff' },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    mainContainer: { flex: 1, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { padding: 8 },
    title: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },
    contentArea: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    listContainer: { paddingVertical: 10 },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, marginHorizontal: 20, paddingHorizontal: 12, marginBottom: 10, height: 48 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },

    conversationItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f1f1', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007bff', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    convInfo: { flex: 1 },
    convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    convName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    convTime: { fontSize: 12, color: '#999' },
    convSite: { fontSize: 12, color: '#666', backgroundColor: '#eee', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
    convPreview: { fontSize: 14, color: '#666' },

    // Chat View Styles
    chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd', elevation: 2 },
    backBtn: { marginRight: 10, padding: 4 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6610f2', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    headerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    chatTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    chatSubtitle: { fontSize: 12, color: '#666' },
    messagesList: { paddingHorizontal: 16, paddingVertical: 20 },

    // Message Bubbles
    messageRow: { marginBottom: 16, flexDirection: 'row', justifyContent: 'flex-start' },
    messageBubble: { backgroundColor: '#fff', borderRadius: 16, borderTopLeftRadius: 4, maxWidth: '80%', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1 },

    mediaContainer: { width: 240, backgroundColor: '#f8f9fa', borderRadius: 12, overflow: 'hidden', margin: 4 },
    videoThumbnail: { height: 130, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    videoOverlay: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    mediaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    mediaText: { fontSize: 13, fontWeight: '600', color: '#333' },
    downloadBtn: { padding: 4, backgroundColor: '#e6f0ff', borderRadius: 16 },

    messageText: { fontSize: 16, color: '#333', lineHeight: 22, paddingHorizontal: 12, paddingVertical: 8 },
    metaContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 10, paddingBottom: 6 },
    messageTime: { fontSize: 11, color: '#999' },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { color: '#888', marginTop: 10 },

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

export default AdminMessagesScreen;
