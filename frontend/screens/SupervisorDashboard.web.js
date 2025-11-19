// SupervisorDashboard.web.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { IoLogOutOutline, IoCubeOutline, IoPeopleOutline, IoChevronForward, IoPaperPlaneOutline, IoCalendarOutline, IoMegaphoneOutline, IoWarningOutline, IoRefresh } from 'react-icons/io5';

export default function SupervisorDashboardWeb() {
  const { user, logout, API_BASE_URL } = useAuth();
  const navigation = useNavigation();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (confirmed) {
      try {
        setSite(null);
        logout();
      } catch (error) {
        console.error('Logout error:', error);
        window.alert('Error: Failed to logout');
      }
    }
  };

  const fetchData = useCallback(async () => {
    if (user?.siteId) {
      setRefreshing(true);
      try {
        const siteId = user.siteId._id || user.siteId;
        const response = await axios.get(`${API_BASE_URL}/api/sites/${siteId}?supervisorId=${user.id}`);
        if (response.data.success) {
          setSite(response.data.data);
        }
      } catch (error) {
        console.error('Fetch site details error:', error);
        window.alert('Error: Failed to fetch site details');
      } finally {
        setRefreshing(false);
      }
    }
  }, [user, API_BASE_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTodayAttendance = () => {
    if (!site || !site.workers) return { present: 0, total: 0, absent: 0, notMarked: 0 };

    const today = new Date().toDateString();
    let presentCount = 0;
    let absentCount = 0;
    let notMarkedCount = 0;
    const totalWorkers = site.workers.length;

    site.workers.forEach(worker => {
      const sortedAttendance = worker.attendance?.sort((a, b) => new Date(b.date) - new Date(a.date)) || [];
      const todayAttendance = sortedAttendance.find(att => new Date(att.date).toDateString() === today);

      if (todayAttendance) {
        if (todayAttendance.status === 'present') presentCount++;
        else if (todayAttendance.status === 'absent') absentCount++;
      } else {
        notMarkedCount++;
      }
    });

    return { present: presentCount, absent: absentCount, notMarked: notMarkedCount, total: totalWorkers };
  };

  const getSuppliesStats = () => {
    if (!site || !site.supplies) return { items: 0 };
    return { items: site.supplies.length };
  };

  const getUnreadAnnouncementsCount = () => {
    if (!site || !site.announcements) return 0;
    return site.announcements.filter(announcement => !announcement.readBy.some(read => read.user === user?.id)).length;
  };

  const getAttendancePercentage = () => {
    const attendance = getTodayAttendance();
    if (attendance.total === 0) return 0;
    return Math.round((attendance.present / attendance.total) * 100);
  };

  if (!user) {
    return null; // Or a loading spinner
  }

  if (!site) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.title}>Supervisor Dashboard</h1>
          <button onClick={handleLogout} style={styles.logoutButton}><IoLogOutOutline size={24} color="#FFFFFF" /></button>
        </header>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading site details...</p>
        </div>
      </div>
    );
  }

  const attendance = getTodayAttendance();
  const suppliesStats = getSuppliesStats();
  const attendancePercentage = getAttendancePercentage();
  const unreadAnnouncements = getUnreadAnnouncementsCount();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Supervisor Dashboard</h1>
        <div style={{display: 'flex', gap: '10px'}}>
            <button onClick={fetchData} disabled={refreshing} style={styles.refreshButton} title="Refresh Data">
                <IoRefresh size={20} color="#FFFFFF" className={refreshing ? 'spin' : ''} />
            </button>
            <button onClick={handleLogout} style={styles.logoutButton} title="Logout">
                <IoLogOutOutline size={24} color="#FFFFFF" />
            </button>
        </div>
      </header>

      <main style={styles.scrollView}>
        <div style={styles.welcomeContainer}>
          <div style={styles.siteInfoCard}>
            <h2 style={styles.siteName}>{site.siteName}</h2>
            <p style={styles.siteLocation}>📍 {site.location}</p>
            {site.description && <p style={styles.siteDescription}>{site.description}</p>}
          </div>
        </div>

        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <IoCubeOutline size={32} color="#007bff" />
            <p style={styles.statNumber}>{suppliesStats.items}</p>
            <p style={styles.statLabel}>Supply Items</p>
          </div>
          <div style={styles.statCard}>
            <IoPeopleOutline size={32} color="#ffc107" />
            <p style={styles.statNumber}>{attendance.present}/{attendance.total}</p>
            <p style={styles.statLabel}>Present Today</p>
          </div>
        </div>

        <div style={styles.attendanceSummaryCard}>
          <h3 style={styles.attendanceSummaryTitle}>Today's Attendance Summary</h3>
          <div style={styles.attendanceProgressContainer}>
            <div style={styles.attendanceProgressBar}>
              <div style={{ ...styles.attendanceProgress, width: `${attendancePercentage}%` }} />
            </div>
            <p style={styles.attendancePercentageText}>{attendancePercentage}% Present</p>
          </div>
          <div style={styles.attendanceSummaryStats}>
            <div style={styles.attendanceStat}>
              <div style={{ ...styles.attendanceStatDot, backgroundColor: '#28a745' }} />
              <p style={styles.attendanceStatNumber}>{attendance.present}</p>
              <p style={styles.attendanceStatLabel}>Present</p>
            </div>
            <div style={styles.attendanceStat}>
              <div style={{ ...styles.attendanceStatDot, backgroundColor: '#dc3545' }} />
              <p style={styles.attendanceStatNumber}>{attendance.absent}</p>
              <p style={styles.attendanceStatLabel}>Absent</p>
            </div>
            <div style={styles.attendanceStat}>
              <div style={{ ...styles.attendanceStatDot, backgroundColor: '#ffc107' }} />
              <p style={styles.attendanceStatNumber}>{attendance.notMarked}</p>
              <p style={styles.attendanceStatLabel}>Not Marked</p>
            </div>
          </div>
          {attendance.notMarked > 0 && (
            <div style={styles.attendanceAlert}>
              <IoWarningOutline size={16} color="#856404" />
              <p style={styles.attendanceAlertText}>
                {attendance.notMarked} worker{attendance.notMarked > 1 ? 's' : ''} attendance not marked
              </p>
            </div>
          )}
        </div>

        <div style={styles.actionsContainer}>
          <button style={styles.actionCard} onClick={() => navigation.navigate('ManageSupplies', { site, canEdit: true })}>
            <div style={styles.actionIcon}><IoCubeOutline size={24} color="#007bff" /></div>
            <div style={styles.actionContent}>
              <p style={styles.actionTitle}>Manage Supplies</p>
              <p style={styles.actionSubtitle}>Add, edit, or remove supplies</p>
            </div>
            <IoChevronForward size={20} color="#ccc" />
          </button>

          <button style={styles.actionCard} onClick={() => navigation.navigate('CreateSupplyRequest', { site })}>
            <div style={styles.actionIcon}><IoPaperPlaneOutline size={24} color="#17a2b8" /></div>
            <div style={styles.actionContent}>
              <p style={styles.actionTitle}>Request Supplies</p>
              <p style={styles.actionSubtitle}>Request supplies from warehouse</p>
            </div>
            <IoChevronForward size={20} color="#ccc" />
          </button>

          <button style={styles.actionCard} onClick={() => navigation.navigate('ManageWorkers', { site, canEdit: true })}>
            <div style={styles.actionIcon}><IoPeopleOutline size={24} color="#28a745" /></div>
            <div style={styles.actionContent}>
              <p style={styles.actionTitle}>Manage Workers</p>
              <p style={styles.actionSubtitle}>Track attendance and worker details</p>
            </div>
            <IoChevronForward size={20} color="#ccc" />
          </button>

          <button style={styles.actionCard} onClick={() => navigation.navigate('AttendanceReport', { site: { ...site, _supervisorId: user.id } })}>
            <div style={styles.actionIcon}><IoCalendarOutline size={24} color="#ffc107" /></div>
            <div style={styles.actionContent}>
              <p style={styles.actionTitle}>Attendance Reports</p>
              <p style={styles.actionSubtitle}>View detailed attendance records</p>
            </div>
            <IoChevronForward size={20} color="#ccc" />
          </button>

          <button style={styles.actionCard} onClick={() => navigation.navigate('Announcements', { site, canEdit: true })}>
            <div style={styles.actionIcon}>
              <IoMegaphoneOutline size={24} color="#ff6b35" />
              {unreadAnnouncements > 0 && (
                <div style={styles.badge}>
                  <span style={styles.badgeText}>{unreadAnnouncements}</span>
                </div>
              )}
            </div>
            <div style={styles.actionContent}>
              <p style={styles.actionTitle}>Announcements</p>
              <p style={styles.actionSubtitle}>Create and manage site announcements</p>
            </div>
            <IoChevronForward size={20} color="#ccc" />
          </button>
        </div>
      </main>
      <style>{`
        .spin {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f4f6f9',
  },
  header: {
    backgroundColor: '#2094f3',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#FFFFFF',
    flexShrink: 0,
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  logoutButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  refreshButton: {
    backgroundColor: 'transparent',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#2094f3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '16px',
    color: '#666',
    marginTop: '12px',
  },
  scrollView: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#f4f6f9',
    padding: '20px',
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
  },
  welcomeContainer: {
    marginBottom: '20px',
  },
  siteInfoCard: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '15px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  siteName: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
    margin: 0,
  },
  siteLocation: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '10px',
    margin: 0,
  },
  siteDescription: {
    fontSize: '14px',
    color: '#777',
    fontStyle: 'italic',
    lineHeight: 1.5,
    margin: 0,
    marginTop: '8px',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: '20px',
    borderRadius: '15px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  statNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginTop: '8px',
    marginBottom: '4px',
    margin: 0,
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    lineHeight: 1.4,
    margin: 0,
  },
  attendanceSummaryCard: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '15px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    marginBottom: '20px',
  },
  attendanceSummaryTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
    textAlign: 'center',
    margin: 0,
  },
  attendanceProgressContainer: {
    marginBottom: '20px',
  },
  attendanceProgressBar: {
    height: '8px',
    backgroundColor: '#E0E0E0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  attendanceProgress: {
    height: '100%',
    backgroundColor: '#FFB74D',
    borderRadius: '4px',
  },
  attendancePercentageText: {
    fontSize: '16px',
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    margin: 0,
  },
  attendanceSummaryStats: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: '15px',
  },
  attendanceStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  attendanceStatDot: {
    width: '12px',
    height: '12px',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  attendanceStatNumber: {
    fontSize: '26px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
    margin: 0,
  },
  attendanceStatLabel: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    margin: 0,
  },
  attendanceAlert: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: '12px',
    borderRadius: '8px',
    borderLeft: '4px solid #ffc107',
  },
  attendanceAlertText: {
    fontSize: '14px',
    color: '#856404',
    marginLeft: '8px',
    flex: 1,
    margin: 0,
  },
  actionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    padding: '20px',
    borderRadius: '15px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  actionIcon: {
    marginRight: '16px',
    position: 'relative',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '4px',
    margin: 0,
  },
  actionSubtitle: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.4,
    margin: 0,
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#ff4444',
    borderRadius: '12px',
    minWidth: '22px',
    height: '22px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '2px solid #FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 'bold',
  },
};
