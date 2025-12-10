import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView, StatusBar, Platform } from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";

const ActivityLogsScreen = () => {
    const { user, token, API_BASE_URL } = useAuth();
    const navigation = useNavigation();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/company/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setLogs(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderLogItem = ({ item }) => {
        const details = item.details || {};

        // Helper to extract name safely from various possible formats
        const getName = (key) => {
            if (details[key + 'Name']) return details[key + 'Name'];
            if (details[key + 'Username']) return details[key + 'Username']; // Added check for Username suffix
            if (details[key]) {
                if (typeof details[key] === 'string') return details[key];
                if (typeof details[key] === 'object') {
                    return details[key].name || details[key].username || details[key].title || null;
                }
            }
            return null;
        };

        const siteName = getName('site');
        const supervisorName = getName('supervisor');
        const staffName = getName('staff');

        return (
            <View style={styles.logItem}>
                <View style={styles.logHeader}>
                    <View style={styles.actionContainer}>
                        <Ionicons name="time-outline" size={14} color="#5856D6" style={{ marginRight: 4 }} />
                        <Text style={styles.logAction}>{item.action.replace(/_/g, ' ').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                </View>

                <View style={styles.logDetailsContainer}>
                    {siteName && (
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Site: </Text>{siteName}
                        </Text>
                    )}
                    {supervisorName && (
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Supervisor: </Text>{supervisorName}
                        </Text>
                    )}
                    {staffName && (
                        <Text style={styles.detailText}>
                            <Text style={styles.detailLabel}>Staff: </Text>{staffName}
                        </Text>
                    )}

                    {/* Only show "No additional details" if absolutely nothing extracted and details object has no other keys of interest */}
                    {!siteName && !supervisorName && !staffName && (
                        <Text style={styles.logDescription}>No additional details</Text>
                    )}
                </View>

                <View style={styles.logFooter}>
                    <Ionicons name="person-circle-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                    <Text style={styles.logUser}>
                        {item.performedByName} <Text style={styles.logRole}>({item.performedByRole})</Text>
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#5856D6" />
            <LinearGradient colors={["#5856D6", "#4A45C0"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.title}>Activity Logs</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        <View style={styles.contentArea}>
                            {loading ? (
                                <ActivityIndicator size="large" color="#5856D6" style={styles.loader} />
                            ) : (
                                <FlatList
                                    data={logs}
                                    renderItem={renderLogItem}
                                    keyExtractor={item => item._id}
                                    contentContainerStyle={styles.listContent}
                                    showsVerticalScrollIndicator={false}
                                    ListEmptyComponent={
                                        <View style={styles.emptyState}>
                                            <Ionicons name="receipt-outline" size={64} color="#ccc" />
                                            <Text style={styles.emptyText}>No activity logs found</Text>
                                        </View>
                                    }
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
    container: { flex: 1, backgroundColor: '#5856D6' },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    mainContainer: { flex: 1, width: '100%', alignSelf: 'center' },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 15,
        paddingBottom: 15
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 0.5
    },

    // Content Area
    contentArea: {
        flex: 1,
        backgroundColor: '#F2F4F8',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 20,
        overflow: 'hidden'
    },

    loader: { marginTop: 50 },
    listContent: { padding: 20, paddingBottom: 40 },

    // Log Items
    logItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        // Soft Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    actionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFEEFA',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    logAction: {
        fontSize: 12,
        fontWeight: '700',
        color: '#5856D6'
    },
    logTime: {
        fontSize: 11,
        color: '#999',
        fontWeight: '500'
    },
    logDetailsContainer: {
        marginBottom: 10,
        backgroundColor: '#FAFAFA',
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#5856D6'
    },
    detailText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
        lineHeight: 20
    },
    detailLabel: {
        fontWeight: '600',
        color: '#555'
    },
    logDescription: {
        fontSize: 14,
        color: '#888',
        fontStyle: 'italic',
        marginBottom: 10
    },
    logFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 8,
        marginTop: 4
    },
    logUser: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500'
    },
    logRole: {
        color: '#888',
        fontWeight: '400',
        fontSize: 12
    },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyText: { color: '#888', marginTop: 10, fontSize: 16 },
});

export default ActivityLogsScreen;
