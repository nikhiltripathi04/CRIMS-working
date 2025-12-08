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
            // Using existing endpoint logic mentioned in previous turns or implied
            // NOTE: Check if API endpoint exists. Web used '/api/company/logs'.
            // Assuming the same endpoint works here.
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
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient colors={["#2094F3", "#0B7DDA"]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.title}>Activity Logs</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={styles.contentArea}>
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
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    mainContainer: { flex: 1, width: '100%', alignSelf: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    backButton: { padding: 8 },
    title: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    contentArea: { flex: 1, backgroundColor: '#f5f7fa', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 0 },

    loader: { marginTop: 50 },
    listContent: { padding: 20 },
    logItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        elevation: 2,
    },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    logAction: { fontSize: 12, fontWeight: 'bold', color: '#2094F3', backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    logTime: { fontSize: 11, color: '#999' },
    logDescription: { fontSize: 15, color: '#333', marginBottom: 6, lineHeight: 20 },
    logUser: { fontSize: 12, color: '#666', fontStyle: 'italic' },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 },
});

export default ActivityLogsScreen;
