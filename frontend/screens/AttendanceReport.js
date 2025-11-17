import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Platform,
    RefreshControl,
    Alert,
    Dimensions,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const AttendanceReport = ({ route }) => {
    const { site: initialSite } = route.params;
    const [site, setSite] = useState(initialSite);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const { API_BASE_URL, user } = useAuth();

    useEffect(() => {
        fetchSiteData();
    }, []);

    const fetchSiteData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${API_BASE_URL}/api/sites/${site._id}?supervisorId=${user.id}`
            );

            if (response.data.success) {
                setSite(response.data.data);
            }
        } catch (error) {
            console.error('Fetch site data error:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAttendance = async (workerId, status) => {
        try {
            setLoading(true);

            const attendanceData = {
                date: selectedDate,
                status: status,
                supervisorId: user?.id
            };

            console.log('Marking attendance with supervisorId:', user?.id);

            const response = await axios.post(
                `${API_BASE_URL}/api/sites/${site._id}/workers/${workerId}/attendance`,
                attendanceData
            );

            if (response.data.success) {
                setSite(response.data.data);
                Alert.alert('Success', `Attendance marked as ${status}`);
            } else {
                Alert.alert('Error', 'Failed to mark attendance');
            }
        } catch (error) {
            console.error('Mark attendance error:', error);
            Alert.alert('Error', 'Failed to mark attendance');
        } finally {
            setLoading(false);
        }
    };

    const getAttendanceForDate = (date) => {
        const targetDate = date.toDateString();
        const attendance = [];

        site.workers.forEach(worker => {
            const sortedAttendance = worker.attendance?.sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            ) || [];

            const workerAttendance = sortedAttendance.find(
                att => new Date(att.date).toDateString() === targetDate
            );

            attendance.push({
                workerId: worker._id,
                name: worker.name,
                role: worker.role,
                status: workerAttendance ? workerAttendance.status : 'not_marked',
                attendanceTime: workerAttendance ? new Date(workerAttendance.date).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                }) : null
            });
        });

        return attendance;
    };

    const getAttendanceStats = (attendanceList) => {
        const total = attendanceList.length;
        const present = attendanceList.filter(a => a.status === 'present').length;
        const absent = attendanceList.filter(a => a.status === 'absent').length;
        const notMarked = attendanceList.filter(a => a.status === 'not_marked').length;

        return { total, present, absent, notMarked };
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setSelectedDate(selectedDate);
        }
    };

    const handleAttendanceItemPress = (item) => {
        if (!user || user.role !== 'supervisor') return;

        const isToday = selectedDate.toDateString() === new Date().toDateString();
        if (!isToday) {
            Alert.alert('Notice', 'You can only mark attendance for today.');
            return;
        }

        if (item.status !== 'not_marked') {
            Alert.alert(
                'Update Attendance',
                `Current status: ${item.status === 'present' ? 'Present' : 'Absent'}`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: item.status === 'present' ? 'Mark as Absent' : 'Mark as Present',
                        onPress: () => markAttendance(item.workerId, item.status === 'present' ? 'absent' : 'present')
                    }
                ]
            );
        } else {
            Alert.alert(
                'Mark Attendance',
                `Mark ${item.name} as:`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Present',
                        onPress: () => markAttendance(item.workerId, 'present')
                    },
                    {
                        text: 'Absent',
                        style: 'destructive',
                        onPress: () => markAttendance(item.workerId, 'absent')
                    }
                ]
            );
        }
    };

    const renderAttendanceItem = ({ item }) => (
        <TouchableOpacity
            style={styles.attendanceCard}
            onPress={() => handleAttendanceItemPress(item)}
            disabled={user.role !== 'supervisor'}
            activeOpacity={user.role === 'supervisor' ? 0.7 : 1}
        >
            <View style={styles.attendanceContent}>
                <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>{item.name}</Text>
                    <Text style={styles.workerRole}>{item.role}</Text>
                    {item.attendanceTime && (
                        <Text style={styles.attendanceTime}>
                            Marked at: {item.attendanceTime}
                        </Text>
                    )}
                </View>
                <View style={[
                    styles.statusBadge,
                    item.status === 'present' && styles.presentBadge,
                    item.status === 'absent' && styles.absentBadge,
                    item.status === 'not_marked' && styles.notMarkedBadge
                ]}>
                    <Text style={[
                        styles.statusText,
                        item.status === 'present' && styles.presentText,
                        item.status === 'absent' && styles.absentText,
                        item.status === 'not_marked' && styles.notMarkedText
                    ]}>
                        {item.status === 'present' ? 'Present' :
                            item.status === 'absent' ? 'Absent' : 'Not Marked'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const attendanceList = getAttendanceForDate(selectedDate);
    const stats = getAttendanceStats(attendanceList);
    const isToday = selectedDate.toDateString() === new Date().toDateString();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2094F3" />
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.title}>Attendance Report</Text>
                                <Text style={styles.subtitle}>{site.siteName}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.datePickerButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={isIpad ? 24 : 20} color="#FFFFFF" />
                                <Text style={styles.dateText}>
                                    {isToday ? 'Today' : selectedDate.toLocaleDateString()}
                                </Text>
                                <Ionicons name="chevron-down" size={isIpad ? 20 : 16} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Content Area */}
                        <View style={styles.contentArea}>
                            <View style={styles.statsContainer}>
                                <View style={[styles.statCard, styles.presentCard]}>
                                    <Text style={[styles.statNumber, styles.presentNumber]}>{stats.present}</Text>
                                    <Text style={styles.statLabel}>Present</Text>
                                </View>
                                <View style={[styles.statCard, styles.absentCard]}>
                                    <Text style={[styles.statNumber, styles.absentNumber]}>{stats.absent}</Text>
                                    <Text style={styles.statLabel}>Absent</Text>
                                </View>
                                <View style={[styles.statCard, styles.notMarkedCard]}>
                                    <Text style={[styles.statNumber, styles.notMarkedNumber]}>{stats.notMarked}</Text>
                                    <Text style={styles.statLabel}>Not Marked</Text>
                                </View>
                                <View style={[styles.statCard, styles.totalCard]}>
                                    <Text style={[styles.statNumber, styles.totalNumber]}>{stats.total}</Text>
                                    <Text style={styles.statLabel}>Total</Text>
                                </View>
                            </View>

                            {isToday && user.role === 'supervisor' && (
                                <View style={styles.helperTextContainer}>
                                    <Text style={styles.helperText}>Tap on a worker to mark or update attendance</Text>
                                </View>
                            )}

                            <FlatList
                                data={attendanceList}
                                renderItem={renderAttendanceItem}
                                keyExtractor={(item) => item.workerId}
                                contentContainerStyle={styles.listContainer}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={loading}
                                        onRefresh={fetchSiteData}
                                        colors={["#2094F3"]}
                                        tintColor="#2094F3"
                                    />
                                }
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={isIpad ? 80 : 64} color="#9CA3AF" />
                                        <Text style={styles.emptyText}>No workers found</Text>
                                        <Text style={styles.emptySubtext}>Add workers to start tracking attendance</Text>
                                    </View>
                                }
                            />
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()} // Prevent future dates
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    mainContainer: {
        flex: 1,
        maxWidth: isIpad ? '100%' : '100%',
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        paddingHorizontal: isIpad ? 32 : 20,
        paddingTop: isIpad ? 70 : 70,
        paddingBottom: isIpad ? 32 : 24,
    },
    title: {
        color: '#FFFFFF',
        fontSize: isIpad ? 32 : 24,
        fontWeight: 'bold',
        marginBottom: isIpad ? 8 : 4,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: isIpad ? 18 : 16,
        marginBottom: isIpad ? 16 : 12,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isIpad ? 16 : 12,
        backgroundColor: '#000',
        borderRadius: 10,
        marginTop: isIpad ? 12 : 8,
    },
    dateText: {
        flex: 1,
        marginLeft: 10,
        fontSize: isIpad ? 18 : 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: isIpad ? 32 : 16,
        paddingTop: isIpad ? 32 : 24,
        paddingBottom: isIpad ? 48 : 32,
        minHeight: isIpad ? screenHeight - 220 : screenHeight - 140,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: isIpad ? 20 : 15,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: isIpad ? 20 : 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statCard: {
        alignItems: 'center',
        padding: isIpad ? 16 : 10,
        borderRadius: 12,
        minWidth: isIpad ? 90 : 70,
    },
    presentCard: {
        backgroundColor: '#d4edda',
    },
    absentCard: {
        backgroundColor: '#f8d7da',
    },
    notMarkedCard: {
        backgroundColor: '#fff3cd',
    },
    totalCard: {
        backgroundColor: '#d1ecf1',
    },
    statNumber: {
        fontSize: isIpad ? 32 : 24,
        fontWeight: 'bold',
    },
    presentNumber: {
        color: '#155724',
    },
    absentNumber: {
        color: '#721c24',
    },
    notMarkedNumber: {
        color: '#856404',
    },
    totalNumber: {
        color: '#0c5460',
    },
    statLabel: {
        fontSize: isIpad ? 14 : 12,
        color: '#666',
        marginTop: 5,
        fontWeight: '500',
    },
    helperTextContainer: {
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        padding: isIpad ? 16 : 10,
        marginBottom: isIpad ? 20 : 16,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#2196F3',
    },
    helperText: {
        color: '#0d47a1',
        fontSize: isIpad ? 16 : 14,
        textAlign: 'center',
    },
    listContainer: {
        paddingBottom: 80,
    },
    attendanceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: isIpad ? 16 : 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        overflow: 'hidden',
    },
    attendanceContent: {
        padding: isIpad ? 24 : 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    workerInfo: {
        flex: 1,
    },
    workerName: {
        fontSize: isIpad ? 20 : 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: isIpad ? 6 : 4,
    },
    workerRole: {
        fontSize: isIpad ? 16 : 14,
        color: '#666',
        marginBottom: isIpad ? 4 : 2,
    },
    attendanceTime: {
        fontSize: isIpad ? 14 : 12,
        color: '#888',
        fontStyle: 'italic',
        marginTop: isIpad ? 4 : 2,
    },
    statusBadge: {
        paddingHorizontal: isIpad ? 16 : 12,
        paddingVertical: isIpad ? 8 : 6,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        minWidth: isIpad ? 90 : 80,
        alignItems: 'center',
    },
    presentBadge: {
        backgroundColor: '#d4edda',
    },
    absentBadge: {
        backgroundColor: '#f8d7da',
    },
    notMarkedBadge: {
        backgroundColor: '#fff3cd',
    },
    statusText: {
        fontSize: isIpad ? 16 : 14,
        fontWeight: '500',
    },
    presentText: {
        color: '#155724',
    },
    absentText: {
        color: '#721c24',
    },
    notMarkedText: {
        color: '#856404',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: isIpad ? 60 : 40,
        marginTop: isIpad ? 120 : 100,
    },
    emptyText: {
        fontSize: isIpad ? 22 : 18,
        color: '#666',
        marginTop: isIpad ? 24 : 20,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: isIpad ? 16 : 14,
        color: '#888',
        marginTop: isIpad ? 12 : 10,
        textAlign: 'center',
    },
});

export default AttendanceReport;