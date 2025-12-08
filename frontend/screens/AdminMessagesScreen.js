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
    Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";

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
        <View style={styles.messageBubbleWrapper}>
            <View style={styles.messageBubble}>
                {item.videoUrl && (
                    <View style={styles.videoAttachment}>
                        <View style={styles.videoIcon}>
                            <Ionicons name="videocam" size={24} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Video Update</Text>
                            <TouchableOpacity onPress={() => Linking.openURL(item.videoUrl)}>
                                <Text style={styles.downloadLink}>Watch/Download Video</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                {item.content && <Text style={styles.messageText}>{item.content}</Text>}
                <Text style={styles.messageMeta}>
                    {new Date(item.createdAt).toLocaleString()}
                </Text>
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

                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                        <FlatList
                            data={[...activeConversation.messages].reverse()} // Reverse for FlatList inverted-like behavior if we used inverted, but here we just map normal
                            renderItem={renderMessageItem}
                            keyExtractor={item => item._id}
                            contentContainerStyle={styles.messagesList}
                            inverted
                        />
                    </KeyboardAvoidingView>
                </SafeAreaView>
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
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    mainContainer: { flex: 1, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    backButton: { padding: 8 },
    title: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    contentArea: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 0, paddingTop: 20 }, // zero padding horizontal for list items to touch edge if desired, but adding padding in items
    listContainer: { paddingBottom: 100 },

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
    chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
    backBtn: { marginRight: 15 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6610f2', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    headerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    chatTitle: { fontSize: 16, fontWeight: 'bold' },
    chatSubtitle: { fontSize: 12, color: '#666' },
    messagesList: { padding: 15 },
    messageBubbleWrapper: { marginBottom: 10, alignItems: 'flex-start' },
    messageBubble: { backgroundColor: '#fff', padding: 12, borderRadius: 12, maxWidth: '80%', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1 },
    messageText: { fontSize: 16, color: '#333', lineHeight: 22 },
    messageMeta: { fontSize: 10, color: '#999', alignSelf: 'flex-end', marginTop: 4 },
    videoAttachment: { backgroundColor: '#f0f2f5', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    videoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ff4757', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    downloadLink: { color: '#007bff', fontWeight: '600' },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { color: '#888', marginTop: 10 },
});

export default AdminMessagesScreen;
