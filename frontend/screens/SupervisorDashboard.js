import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const SupervisorDashboard = ({ navigation }) => {
  const { user, logout, API_BASE_URL } = useAuth();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setSite(null);
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const fetchData = async () => {
    if (user?.siteId) {
      try {
        setLoading(true);
        const siteId = user.siteId._id || user.siteId;

        // Add supervisorId parameter to the request
        const response = await axios.get(
          `${API_BASE_URL}/api/sites/${siteId}?supervisorId=${user.id}`
        );

        if (response.data.success) {
          setSite(response.data.data);
        }
      } catch (error) {
        console.error('Fetch site details error:', error);
        Alert.alert('Error', 'Failed to fetch site details');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (user?.siteId) {
        try {
          setLoading(true);
          const siteId = user.siteId._id || user.siteId;

          // Add supervisorId parameter to the request
          const response = await axios.get(
            `${API_BASE_URL}/api/sites/${siteId}?supervisorId=${user.id}`
          );

          if (mounted && response.data.success) {
            setSite(response.data.data);
          }
        } catch (error) {
          console.error('Fetch site details error:', error);
          if (mounted) {
            Alert.alert('Error', 'Failed to fetch site details');
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [user]);

  // UPDATED: Better attendance calculation that handles updates
  const getTodayAttendance = () => {
    if (!site || !site.workers) return { present: 0, total: 0, absent: 0, notMarked: 0 };

    const today = new Date().toDateString();
    let presentCount = 0;
    let absentCount = 0;
    let notMarkedCount = 0;
    let totalWorkers = site.workers.length;

    site.workers.forEach(worker => {
      // Sort attendance by date (newest first) to get the latest entry for today
      const sortedAttendance = worker.attendance?.sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      ) || [];

      // Find the most recent attendance entry for today
      const todayAttendance = sortedAttendance.find(
        att => new Date(att.date).toDateString() === today
      );

      if (todayAttendance) {
        if (todayAttendance.status === 'present') {
          presentCount++;
        } else if (todayAttendance.status === 'absent') {
          absentCount++;
        }
      } else {
        notMarkedCount++;
      }
    });

    return {
      present: presentCount,
      absent: absentCount,
      notMarked: notMarkedCount,
      total: totalWorkers
    };
  };

  const getSuppliesStats = () => {
    if (!site || !site.supplies) return { items: 0, totalValue: 0 };

    const totalValue = site.supplies.reduce((sum, supply) => sum + (supply.cost * supply.quantity), 0);
    return { items: site.supplies.length, totalValue };
  };

  const getUnreadAnnouncementsCount = () => {
    if (!site || !site.announcements) return 0;

    return site.announcements.filter(announcement =>
      !announcement.readBy.some(read => read.user === user?.id)
    ).length;
  };

  // UPDATED: Get attendance percentage for better visualization
  const getAttendancePercentage = () => {
    const attendance = getTodayAttendance();
    if (attendance.total === 0) return 0;
    return Math.round((attendance.present / attendance.total) * 100);
  };

  // Move the user check here, after all hooks are declared
  if (!user) {
    return null;
  }

  if (!site) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Supervisor Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={isIpad ? 28 : 24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading site details...</Text>
        </View>
      </View>
    );
  }

  const attendance = getTodayAttendance();
  const suppliesStats = getSuppliesStats();
  const attendancePercentage = getAttendancePercentage();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Supervisor Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={isIpad ? 28 : 24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} />
        }
      >
        <View style={styles.welcomeContainer}>
          <View style={styles.siteInfoCard}>
            <Text style={styles.siteName}>{site.siteName}</Text>
            <Text style={styles.siteLocation}>📍 {site.location}</Text>
            {site.description && (
              <Text style={styles.siteDescription}>{site.description}</Text>
            )}
          </View>
        </View>

        {/* Stats Container */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={isIpad ? 40 : 32} color="#007bff" />
            <Text style={styles.statNumber}>{suppliesStats.items}</Text>
            <Text style={styles.statLabel}>Supply Items</Text>
          </View>

          {/* <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={isIpad ? 40 : 32} color="#28a745" />
            <Text style={styles.statNumber}>₹{suppliesStats.totalValue.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View> */}

          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={isIpad ? 40 : 32} color="#ffc107" />
            <Text style={styles.statNumber}>{attendance.present}/{attendance.total}</Text>
            <Text style={styles.statLabel}>Present Today</Text>
          </View>
        </View>

        {/* Today's Attendance Summary */}
        <View style={styles.attendanceSummaryCard}>
          <Text style={styles.attendanceSummaryTitle}>Today's Attendance Summary</Text>
          <View style={styles.attendanceProgressContainer}>
            <View style={styles.attendanceProgressBar}>
              <View
                style={[
                  styles.attendanceProgress,
                  { width: `${attendancePercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.attendancePercentageText}>{attendancePercentage}% Present</Text>
          </View>
          <View style={styles.attendanceSummaryStats}>
            <View style={styles.attendanceStat}>
              <View style={[styles.attendanceStatDot, { backgroundColor: '#28a745' }]} />
              <Text style={styles.attendanceStatNumber}>{attendance.present}</Text>
              <Text style={styles.attendanceStatLabel}>Present</Text>
            </View>
            <View style={styles.attendanceStat}>
              <View style={[styles.attendanceStatDot, { backgroundColor: '#dc3545' }]} />
              <Text style={styles.attendanceStatNumber}>{attendance.absent}</Text>
              <Text style={styles.attendanceStatLabel}>Absent</Text>
            </View>
            <View style={styles.attendanceStat}>
              <View style={[styles.attendanceStatDot, { backgroundColor: '#ffc107' }]} />
              <Text style={styles.attendanceStatNumber}>{attendance.notMarked}</Text>
              <Text style={styles.attendanceStatLabel}>Not Marked</Text>
            </View>
          </View>
          {attendance.notMarked > 0 && (
            <View style={styles.attendanceAlert}>
              <Ionicons name="warning-outline" size={16} color="#856404" />
              <Text style={styles.attendanceAlertText}>
                {attendance.notMarked} worker{attendance.notMarked > 1 ? 's' : ''} attendance not marked
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageSupplies', { site, canEdit: true })}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="cube-outline" size={isIpad ? 28 : 24} color="#007bff" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Supplies</Text>
              <Text style={styles.actionSubtitle}>Add, edit, or remove supplies</Text>
            </View>
            <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateSupplyRequest', { site })}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="paper-plane-outline" size={isIpad ? 28 : 24} color="#17a2b8" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Request Supplies</Text>
              <Text style={styles.actionSubtitle}>Request supplies from warehouse</Text>
            </View>
            <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ManageWorkers', { site, canEdit: true })}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="people-outline" size={isIpad ? 28 : 24} color="#28a745" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Workers</Text>
              <Text style={styles.actionSubtitle}>Track attendance and worker details</Text>
            </View>
            <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AttendanceReport', {
              site: {
                ...site,
                _supervisorId: user.id // Add this so the screen knows who is accessing it
              }
            })}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="calendar-outline" size={isIpad ? 28 : 24} color="#ffc107" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Attendance Reports</Text>
              <Text style={styles.actionSubtitle}>View detailed attendance records</Text>
            </View>
            <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Announcements', { site, canEdit: true })}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="megaphone-outline" size={isIpad ? 28 : 24} color="#ff6b35" />
              {getUnreadAnnouncementsCount() > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{getUnreadAnnouncementsCount()}</Text>
                </View>
              )}
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Announcements</Text>
              <Text style={styles.actionSubtitle}>
                Create and manage site announcements
                {/* {getUnreadAnnouncementsCount() > 0 &&
                  ` (${getUnreadAnnouncementsCount()} unread)`
                } */}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={isIpad ? 24 : 20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2094f3',
  },
  header: {
    backgroundColor: '#2094f3',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: isIpad ? 28 : 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: '#000',
    borderRadius: 25,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: isIpad ? 18 : 16,
    color: '#666'
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#2094f3',
  },
  welcomeContainer: {
    padding: 20,
    backgroundColor: '#2094F3',
    marginBottom: 20,
  },
  siteInfoCard: {
    backgroundColor: '#FFFFFF',
    padding: isIpad ? 24 : 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  siteName: {
    fontSize: isIpad ? 22 : 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  siteLocation: {
    fontSize: isIpad ? 16 : 14,
    color: '#666',
    marginBottom: 10,
  },
  siteDescription: {
    fontSize: isIpad ? 14 : 12,
    color: '#777',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 70,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: isIpad ? 20 : 16,
    borderRadius: 15,
    alignItems: 'center',
    width: (screenWidth - 80) / 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: isIpad ? 20 : 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: isIpad ? 14 : 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  attendanceSummaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: isIpad ? 24 : 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  attendanceSummaryTitle: {
    fontSize: isIpad ? 20 : 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  attendanceProgressContainer: {
    marginBottom: 20,
  },
  attendanceProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  attendanceProgress: {
    height: '100%',
    backgroundColor: '#FFB74D',
    borderRadius: 4,
  },
  attendancePercentageText: {
    fontSize: isIpad ? 16 : 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  attendanceSummaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  attendanceStat: {
    alignItems: 'center',
  },
  attendanceStatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  attendanceStatNumber: {
    fontSize: isIpad ? 26 : 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  attendanceStatLabel: {
    fontSize: isIpad ? 14 : 12,
    color: '#666',
    textAlign: 'center',
  },
  attendanceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  attendanceAlertText: {
    fontSize: isIpad ? 16 : 14,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    padding: isIpad ? 24 : 20,
    marginBottom: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    marginRight: 16,
    position: 'relative',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: isIpad ? 18 : 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: isIpad ? 16 : 14,
    color: '#666',
    lineHeight: 20,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: isIpad ? 12 : 10,
    fontWeight: 'bold',
  },
});

export default SupervisorDashboard;
