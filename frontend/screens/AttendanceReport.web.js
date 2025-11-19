import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    // Removed mobile-specific imports
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from '@react-navigation/native'; // For back button

// Web-specific styling: using fixed values for a consistent desktop look
const isIpad = false; // Assume not iPad for web styling

const AttendanceReport = ({ route }) => {
    const navigation = useNavigation(); // Hook for navigation
    const { site: initialSite } = route.params;
    const [site, setSite] = useState(initialSite);
    const [selectedDate, setSelectedDate] = useState(new Date());
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

            const response = await axios.post(
                `${API_BASE_URL}/api/sites/${site._id}/workers/${workerId}/attendance`,
                attendanceData
            );

            if (response.data.success) {
                setSite(response.data.data);
                window.alert(`Success: Attendance marked as ${status}`);
            } else {
                window.alert('Error: Failed to mark attendance');
            }
        } catch (error) {
            console.error('Mark attendance error:', error);
            window.alert('Error: Failed to mark attendance');
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

    const onDateChange = (event) => {
        const newDate = new Date(event.target.value);
        // Adjust for timezone offset to prevent date from changing
        const timezoneOffset = newDate.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(newDate.getTime() + timezoneOffset);
        setSelectedDate(adjustedDate);
    };

    const handleAttendanceItemPress = (item) => {
        if (!user || user.role !== 'supervisor') return;

        const isToday = selectedDate.toDateString() === new Date().toDateString();
        if (!isToday) {
            window.alert('Notice: You can only mark attendance for today.');
            return;
        }

        if (item.status !== 'not_marked') {
            const newStatus = item.status === 'present' ? 'absent' : 'present';
            const confirmed = window.confirm(
                `Current status: ${item.status === 'present' ? 'Present' : 'Absent'}.\n\nDo you want to mark as ${newStatus}?`
            );
            if (confirmed) {
                markAttendance(item.workerId, newStatus);
            }
        } else {
            const confirmedPresent = window.confirm(`Mark ${item.name} as Present?`);
            if (confirmedPresent) {
                markAttendance(item.workerId, 'present');
            } else {
                const confirmedAbsent = window.confirm(`Mark ${item.name} as Absent?`);
                if (confirmedAbsent) {
                    markAttendance(item.workerId, 'absent');
                }
            }
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
            <LinearGradient
                colors={["#2094F3", "#0B7DDA"]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.safeArea}>
                    <View style={styles.mainContainer}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            <View style={styles.headerContent}>
                                <Text style={styles.title}>Attendance Report</Text>
                                <Text style={styles.subtitle}>{site.siteName}</Text>
                            </View>

                            {/* Web Date Picker */}
                            <View style={styles.datePickerContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
                                <input
                                    type="date"
                                    value={selectedDate.toISOString().split('T')[0]}
                                    onChange={onDateChange}
                                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                                    style={styles.dateInput}
                                />
                            </View>
                        </View>

                        {/* Content Area */}
                        <ScrollView style={styles.contentArea}>
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
                                    <Text style={styles.helperText}>Click on a worker to mark or update attendance</Text>
                                </View>
                            )}
                            <View contentContainerStyle={styles.listContainer}>
                                {attendanceList.length > 0 ? (
                                    attendanceList.map((item) => (
                                        <View key={item.workerId}>
                                            {renderAttendanceItem({ item })}
                                        </View>
                                    ))
                                ) : (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={64} color="#9CA3AF" />
                                        <Text style={styles.emptyText}>No workers found</Text>
                                        <Text style={styles.emptySubtext}>Add workers to start tracking attendance</Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: '100vh', // Use viewport height
        display: 'flex', // Use flexbox for the main layout
        flexDirection: 'column', // Stack children vertically
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    mainContainer: {
        flex: 1,
        maxWidth: 1200, // Max width for desktop
        alignSelf: 'center',
        width: '100%',
        display: 'flex',
        flexDirection: 'column', // Stack header and contentArea
    },
    header: {
        paddingHorizontal: 30,
        paddingTop: 40,
        paddingBottom: 30,
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0, // Header should not shrink
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        marginRight: 15,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
    },
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 10,
        padding: 12,
    },
    dateInput: {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 10,
        outline: 'none', // Web-specific
        // Style the date picker indicator for webkit browsers
        '::-webkit-calendar-picker-indicator': {
            filter: 'invert(1)',
            cursor: 'pointer',
        },
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E5E7EB',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 30, // Uniform padding
        overflowY: 'auto', // THIS IS THE KEY: Make this container scrollable
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 20,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Web-specific
    },
    statCard: {
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        minWidth: 80,
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
        fontSize: 28,
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
        fontSize: 14,
        color: '#666',
        marginTop: 5,
        fontWeight: '500',
    },
    helperTextContainer: {
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        padding: 12,
        marginBottom: 20,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#2196F3',
    },
    helperText: {
        color: '#0d47a1',
        fontSize: 14,
        textAlign: 'center',
    },
    listContainer: {
        paddingBottom: 80, // Add padding at the bottom of the list
    },
    attendanceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 15,
        boxShadow: '0 3px 6px rgba(0,0,0,0.1)', // Web-specific
        overflow: 'hidden',
        cursor: 'pointer', // Web-specific
        transition: 'transform 0.2s', // Web-specific
        ':hover': { // Web-specific pseudo-class
            transform: 'translateY(-2px)',
        },
    },
    attendanceContent: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    workerInfo: {
        flex: 1,
    },
    workerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    workerRole: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    attendanceTime: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        minWidth: 90,
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
        fontSize: 14,
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
        padding: 50,
        marginTop: 80,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginTop: 20,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 10,
        textAlign: 'center',
    },
});

export default AttendanceReport;