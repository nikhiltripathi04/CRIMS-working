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
    IoClose,
    IoPlayCircleOutline
} from 'react-icons/io5';

const AdminMessagesScreen = () => {
    const { user, API_BASE_URL, token } = useAuth();
    const navigation = useNavigation();

    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Video Playback State
    const [playbackVideo, setPlaybackVideo] = useState(null); // URL

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
                            {/* Reverse map so newest is at bottom (flex-direction column-reverse handles scrolling start) */}
                            {activeConversation.messages.slice().reverse().map(msg => (
                                <div key={msg._id} style={styles.messageBubbleWrapper}>
                                    <div style={styles.messageBubble}>
                                        {msg.videoUrl && (
                                            <div style={styles.videoAttachment} onClick={() => setPlaybackVideo(msg.videoUrl)}>
                                                <div style={styles.videoIcon}>
                                                    <IoPlayCircleOutline size={32} color="#fff" />
                                                </div>
                                                <div style={{ flex: 1, paddingRight: 10 }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Video Message</div>
                                                    <div style={{ fontSize: '11px', color: '#666' }}>Click to play</div>
                                                </div>
                                            </div>
                                        )}
                                        {msg.content && <div style={styles.messageText}>{msg.content}</div>}
                                        <div style={styles.messageMeta}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {' · '}
                                            {new Date(msg.createdAt).toLocaleDateString()}
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

            {/* Video Modal */}
            {playbackVideo && (
                <div style={styles.modalOverlay} onClick={() => setPlaybackVideo(null)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button style={styles.closeModalBtn} onClick={() => setPlaybackVideo(null)}>
                            <IoClose size={24} color="#fff" />
                        </button>
                        <video
                            controls
                            autoPlay
                            style={styles.videoPlayer}
                            src={playbackVideo}
                        />
                    </div>
                </div>
            )}
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
        backgroundColor: '#f6f6f6'
    },
    backBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '5px',
        display: 'flex',
        color: '#555'
    },
    sidebarTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '600',
        color: '#333'
    },
    searchBox: {
        padding: '10px 15px',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0',
    },
    searchInput: {
        border: 'none',
        background: '#f0f2f5',
        marginLeft: '0px',
        width: '100%',
        outline: 'none',
        fontSize: '14px',
        padding: '8px 12px 8px 35px',
        borderRadius: '20px',
        marginTop: '0px',
        position: 'relative',
        zIndex: 1
    },
    // Hack to position search icon inside input logic not fully implemented here but improved layout
    conversationList: {
        flex: 1,
        overflowY: 'auto',
    },
    conversationItem: {
        display: 'flex',
        padding: '12px 15px',
        cursor: 'pointer',
        borderBottom: '1px solid #f5f5f5',
        transition: 'background 0.2s',
    },
    avatar: {
        width: '45px',
        height: '45px',
        borderRadius: '50%',
        backgroundColor: '#dfe6e9',
        color: '#636e72',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '18px',
        marginRight: '15px',
    },
    convInfo: {
        flex: 1,
        overflow: 'hidden',
        justifyContent: 'center',
        display: 'flex',
        flexDirection: 'column'
    },
    convHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
    },
    convName: {
        fontWeight: '600',
        fontSize: '15px',
        color: '#111',
    },
    convTime: {
        fontSize: '11px',
        color: '#666',
    },
    convSite: {
        fontSize: '11px',
        color: '#007bff',
        marginBottom: '2px',
        fontWeight: '500'
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
        backgroundColor: '#e5ddd5', // WhatsApp-like background
        backgroundImage: 'linear-gradient(rgba(229,221,213,0.9), rgba(229,221,213,0.9)), url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', // Subtle pattern hint
    },
    chatHeader: {
        padding: '10px 20px',
        backgroundColor: '#f0f2f5',
        borderBottom: '1px solid #dcdcdc',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
    },
    avatarLarge: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#dfe6e9',
        color: '#636e72',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
    },
    chatTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        color: '#333'
    },
    chatSubtitle: {
        fontSize: '12px',
        color: '#666',
    },
    messagesContainer: {
        flex: 1,
        padding: '20px 50px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '10px',
    },
    messageBubbleWrapper: {
        display: 'flex',
        justifyContent: 'flex-start', // Incoming messages (Left)
        marginBottom: '5px'
    },
    messageBubble: {
        backgroundColor: '#fff',
        padding: '8px 10px',
        borderRadius: '0 8px 8px 8px',
        maxWidth: '60%',
        boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
        position: 'relative',
        minWidth: '120px'
    },
    messageText: {
        fontSize: '14.2px',
        lineHeight: '1.4',
        color: '#111',
        whiteSpace: 'pre-wrap',
    },
    messageMeta: {
        fontSize: '10px',
        color: '#999',
        textAlign: 'right',
        marginTop: '4px',
        display: 'block'
    },
    videoAttachment: {
        backgroundColor: '#f0f2f5',
        borderRadius: '6px',
        padding: '5px',
        marginBottom: '5px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        border: '1px solid #e0e0e0',
        transition: 'background 0.2s',
        ':hover': {
            background: '#e9e9e9'
        }
    },
    videoIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: '#ff4757',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyChat: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        backgroundColor: '#f8f9fa',
        borderLeft: '1px solid #ddd'
    },

    // Modal Styles
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        animation: 'fadeIn 0.2s ease-out'
    },
    modalContent: {
        position: 'relative',
        maxWidth: '90%',
        maxHeight: '90%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    closeModalBtn: {
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '10px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    videoPlayer: {
        maxWidth: '100%',
        maxHeight: '80vh',
        boxShadow: '0 5px 30px rgba(0,0,0,0.5)',
        borderRadius: '8px',
        backgroundColor: '#000'
    }
};

export default AdminMessagesScreen;
