import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Use localhost for web development
const API_URL = 'http://localhost:3000/api';

const ActivityLogsScreen = () => {
    const { user, token } = useAuth();
    const navigation = useNavigation();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const response = await axios.get(`${API_URL}/company/logs`, {
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

    const renderLogItem = ({ item }) => (
        <View style={styles.logItem}>
            <View style={styles.logHeader}>
                <Text style={styles.logAction}>{item.action.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
            <Text style={styles.logDescription}>{item.description || 'No description'}</Text>
            <Text style={styles.logUser}>Performed by: {item.performedByName} ({item.performedByRole})</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Company Activity Logs</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
            ) : (
                <FlatList
                    data={logs}
                    renderItem={renderLogItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<Text style={styles.emptyText}>No activity logs found.</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    loader: {
        marginTop: 50,
    },
    listContent: {
        padding: 20,
    },
    logItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    logAction: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007bff',
    },
    logTime: {
        fontSize: 12,
        color: '#999',
    },
    logDescription: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
    },
    logUser: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 50,
        fontSize: 16,
    },
});

export default ActivityLogsScreen;
