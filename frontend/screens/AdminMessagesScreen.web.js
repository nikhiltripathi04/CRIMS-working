import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import {
    IoArrowBack,
    IoSearchOutline,
    IoPersonCircleOutline,
    IoVideocam,
    IoDownloadOutline,
    IoTimeOutline,
    IoCheckmarkDoneOutline
} from 'react-icons/io5';

const AdminMessagesScreen = () => {
    const { user, API_BASE_URL, token } = useAuth();
    const navigation = useNavigation();

    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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
        // Poll for new messages every 30 seconds
        const interval = setInterval(fetchMessages, 30000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // Group messages by Supervisor
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

        // Convert to array and sort by last message time
        const sorted = Object.values(groups).sort((a, b) =>
            new Date(b.lastMessage.createdAt) - new Date(typeof a.lastMessage.createdAt === 'string' ? a.lastMessage.createdAt : new Date())
        );

        setConversations(sorted);

        // If no supervisor selected, select the first one
        if (!selectedSupervisorId && sorted.length > 0) {
            setSelectedSupervisorId(sorted[0].id);
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.siteName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeConversation = conversations.find(c => c.id === selectedSupervisorId);

    return (
        <div style={styles.container}>
            {/* Sidebar: Conversation List */}
            <div style={styles.sidebar}>
                <div style={styles.sidebarHeader}>
                    <button onClick={() => navigation.goBack()} style={styles.backBtn}>
                        <IoArrowBack size={20} />
                    </button>
                    <h2 style={styles.sidebarTitle}>Messages</h2>
                </div>

                <div style={styles.searchBox}>
                    <IoSearchOutline color="#888" />
                    <input
                        style={styles.searchInput}
                        placeholder="Search supervisors..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div style={styles.conversationList}>
                    {loading ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Loading...</div>
                    ) : filteredConversations.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No messages found</div>
                    ) : (
                        filteredConversations.map(conv => (
                            <div
                                key={conv.id}
                                style={{
                                    ...styles.conversationItem,
                                    backgroundColor: selectedSupervisorId === conv.id ? '#e6f2ff' : 'transparent',
                                    borderLeft: selectedSupervisorId === conv.id ? '4px solid #007bff' : '4px solid transparent'
                                }}
                                onClick={() => setSelectedSupervisorId(conv.id)}
                            >
                                <div style={styles.avatar}>
                                    {conv.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={styles.convInfo}>
                                    <div style={styles.convHeader}>
                                        <span style={styles.convName}>{conv.name}</span>
                                        <span style={styles.convTime}>
                                            {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div style={styles.convSite}>{conv.siteName}</div>
                                    <div style={styles.convPreview}>
                                        {conv.lastMessage.videoUrl ? '📹 Video Message' : conv.lastMessage.content}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={styles.chatArea}>
                {activeConversation ? (
                    <>
                        <div style={styles.chatHeader}>
                            <div style={styles.avatarLarge}>
                                {activeConversation.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 style={styles.chatTitle}>{activeConversation.name}</h2>
                                <span style={styles.chatSubtitle}>{activeConversation.siteName} • Supervisor</span>
                            </div>
                        </div>

                        <div style={styles.messagesContainer}>
                            {activeConversation.messages.slice().reverse().map(msg => (
                                <div key={msg._id} style={styles.messageBubbleWrapper}>
                                    <div style={styles.messageBubble}>
                                        {msg.videoUrl && (
                                            <div style={styles.videoAttachment}>
                                                <div style={styles.videoIcon}>
                                                    <IoVideocam size={24} color="#fff" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Video Update</div>
                                                    <a
                                                        href={msg.videoUrl}
                                                        download={`video-${msg._id}.mp4`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={styles.downloadLink}
                                                    >
                                                        <IoDownloadOutline size={16} /> Download Video
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        {msg.content && <div style={styles.messageText}>{msg.content}</div>}
                                        <div style={styles.messageMeta}>
                                            {new Date(msg.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div style={styles.emptyChat}>
                        <IoPersonCircleOutline size={64} color="#ccc" />
                        <p>Select a conversation to view messages</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        height: '100vh',
        backgroundColor: '#f0f2f5',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    sidebar: {
        width: '350px',
        backgroundColor: '#fff',
        borderRight: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
    },
    sidebarHeader: {
        padding: '15px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '5px',
        display: 'flex',
    },
    sidebarTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
    },
    searchBox: {
        padding: '10px 15px',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderBottom: '1px solid #eee',
    },
    searchInput: {
        border: 'none',
        background: 'transparent',
        marginLeft: '10px',
        width: '100%',
        outline: 'none',
        fontSize: '14px',
    },
    conversationList: {
        flex: 1,
        overflowY: 'auto',
    },
    conversationItem: {
        display: 'flex',
        padding: '15px',
        cursor: 'pointer',
        borderBottom: '1px solid #f5f5f5',
        transition: 'background 0.2s',
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#007bff',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        marginRight: '12px',
    },
    convInfo: {
        flex: 1,
        overflow: 'hidden',
    },
    convHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
    },
    convName: {
        fontWeight: '600',
        fontSize: '14px',
        color: '#333',
    },
    convTime: {
        fontSize: '11px',
        color: '#999',
    },
    convSite: {
        fontSize: '11px',
        color: '#666',
        backgroundColor: '#eee',
        padding: '2px 6px',
        borderRadius: '4px',
        display: 'inline-block',
        marginBottom: '4px',
    },
    convPreview: {
        fontSize: '13px',
        color: '#666',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    chatArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#e5ddd5', // WhatsApp-like background color
    },
    chatHeader: {
        padding: '15px 20px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
    },
    avatarLarge: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#6610f2',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: 'bold',
    },
    chatTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
    },
    chatSubtitle: {
        fontSize: '12px',
        color: '#666',
    },
    messagesContainer: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column-reverse', // Newest at bottom visually, but we map reverse order
        gap: '10px',
    },
    messageBubbleWrapper: {
        display: 'flex',
        justifyContent: 'flex-start', // Incoming messages are always on left (from supervisor)
    },
    messageBubble: {
        backgroundColor: '#fff',
        padding: '10px 15px',
        borderRadius: '0 12px 12px 12px',
        maxWidth: '60%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        position: 'relative',
    },
    messageText: {
        fontSize: '14px',
        lineHeight: '1.4',
        color: '#333',
        whiteSpace: 'pre-wrap',
    },
    messageMeta: {
        fontSize: '10px',
        color: '#999',
        textAlign: 'right',
        marginTop: '5px',
    },
    videoAttachment: {
        backgroundColor: '#f0f2f5',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    videoIcon: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#ff4757',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    downloadLink: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '12px',
        color: '#007bff',
        textDecoration: 'none',
        fontWeight: '600',
    },
    emptyChat: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        backgroundColor: '#f0f2f5',
    }
};

export default AdminMessagesScreen;
