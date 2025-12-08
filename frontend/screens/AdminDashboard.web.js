// AdminDashboard.web.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
// Using react-icons for better web rendering consistency
import {
  IoLogOutOutline,
  IoSearchOutline,
  IoRefresh,
  IoAddCircleOutline,
  IoPeopleOutline,
  IoCubeOutline,
  IoLocationOutline,
  IoBriefcaseOutline,
  IoVideocamOutline, // For Messages
  IoChevronForward,
  IoTrashOutline,
  IoOpenOutline
} from 'react-icons/io5';

export default function AdminDashboardWeb() {
  const { user, API_BASE_URL, logout, token } = useAuth();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  // --- 1. Fetch Functions ---
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    // Don't set loading to true on refresh to keep UI stable
    if (!sites.length) setLoading(true);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [sitesRes, whRes, staffRes, supRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/sites?adminId=${user.id}`),
        axios.get(`${API_BASE_URL}/api/warehouses?adminId=${user.id}`),
        axios.get(`${API_BASE_URL}/api/staff`, config),
        axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`)
      ]);

      setSites(sitesRes.data.success ? sitesRes.data.data : []);
      setWarehouses(whRes.data.success ? whRes.data.data : []);
      setStaff(staffRes.data.success ? staffRes.data.data : []);
      setSupervisors(supRes.data.success ? supRes.data.data : []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, API_BASE_URL, token, logout, sites.length]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchAll);
    return unsubscribe;
  }, [navigation, fetchAll]);

  // --- 2. Action Logic ---
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) logout();
  };

  const confirmDelete = async (type, id, apiPath) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_BASE_URL}${apiPath}/${id}?adminId=${user.id}`, config);
      fetchAll();
      // Optional: Add toast notification here
    } catch (err) {
      alert(`Failed to delete ${type}`);
      console.error(err);
    }
  };

  // --- 3. Filtering Logic ---
  const filterList = (list, keys) => {
    if (!query) return list;
    const lowerQuery = query.toLowerCase();
    return list.filter(item =>
      keys.some(key => item[key] && item[key].toLowerCase().includes(lowerQuery))
    );
  };

  const filteredSites = filterList(sites, ['siteName', 'location']);
  const filteredWarehouses = filterList(warehouses, ['warehouseName', 'location']);
  const filteredStaff = filterList(staff, ['fullName', 'username']);
  const filteredSupervisors = filterList(supervisors, ['username']);

  if (loading && !refreshing) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <span style={styles.roleBadge}>ADMINISTRATOR</span>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.searchContainer}>
            <IoSearchOutline color="#666" size={18} />
            <input
              type="text"
              placeholder="Search all resources..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <button onClick={fetchAll} disabled={refreshing} style={styles.iconButton} title="Refresh">
            <IoRefresh size={22} className={refreshing ? 'spin' : ''} />
          </button>

          <button onClick={handleLogout} style={styles.logoutButton} title="Logout">
            <IoLogOutOutline size={22} color="#fff" />
          </button>
        </div>
      </header>

      <main style={styles.content}>

        {/* --- Quick Stats Row --- */}
        <div style={styles.statsRow}>
          <StatCard icon={<IoLocationOutline />} color="#007bff" count={sites.length} label="Active Sites" />
          <StatCard icon={<IoCubeOutline />} color="#17a2b8" count={warehouses.length} label="Warehouses" />
          <StatCard icon={<IoBriefcaseOutline />} color="#6610f2" count={supervisors.length} label="Supervisors" />
          <StatCard icon={<IoPeopleOutline />} color="#28a745" count={staff.length} label="Staff Members" />
        </div>

        {/* --- Primary Actions --- */}
        <div style={styles.actionToolbar}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <ActionButton
              label="New Site"
              icon={<IoAddCircleOutline />}
              color="#007bff"
              onClick={() => navigation.navigate('CreateSite')}
            />
            <ActionButton
              label="New Warehouse"
              icon={<IoAddCircleOutline />}
              color="#17a2b8"
              onClick={() => navigation.navigate('CreateWarehouse')}
            />
          </div>

          {/* NEW: Messages Entry Point */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={styles.messageButton} onClick={() => navigation.navigate('AdminMessages')}>
              <IoVideocamOutline size={20} style={{ marginRight: '8px' }} />
              View Site Messages
            </button>
            <button style={{ ...styles.messageButton, backgroundColor: '#fd7e14', marginLeft: '10px' }} onClick={() => navigation.navigate('ActivityLogs')}>
              <IoLogOutOutline size={20} style={{ marginRight: '8px', transform: 'rotate(180deg)' }} />
              Activity Logs
            </button>
          </div>
        </div>

        <div style={styles.gridContainer}>

          {/* Left Column */}
          <div style={styles.column}>

            {/* Sites Panel */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Sites</h2>
                <span style={styles.countBadge}>{filteredSites.length}</span>
              </div>
              <div style={styles.listContainer}>
                {filteredSites.map(site => (
                  <ListItem
                    key={site._id}
                    title={site.siteName}
                    subtitle={site.location}
                    icon={<IoLocationOutline color="#007bff" size={20} />}
                    onDelete={() => confirmDelete('Site', site._id, '/api/sites')}
                    onOpen={() => navigation.navigate('SiteDetails', { site, siteName: site.siteName })}
                  />
                ))}
                {filteredSites.length === 0 && <EmptyState text="No sites found" />}
              </div>
            </div>

            {/* Supervisors Panel */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Supervisors</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    style={styles.textBtn}
                    onClick={() => navigation.navigate('GlobalManageSupervisors')}
                  >
                    Manage Global List
                  </button>
                  <span style={{ ...styles.countBadge, backgroundColor: '#6610f2' }}>{filteredSupervisors.length}</span>
                </div>
              </div>
              <div style={styles.listContainer}>
                {filteredSupervisors.map(sup => (
                  <ListItem
                    key={sup._id}
                    title={sup.username}
                    subtitle={sup.assignedSites?.length ? `${sup.assignedSites.length} Sites` : 'Unassigned'}
                    icon={<IoBriefcaseOutline color="#6610f2" size={20} />}
                    // Supervisors are managed via GlobalManageSupervisors mostly, but allow simple open
                    onOpen={() => navigation.navigate('GlobalManageSupervisors')}
                    hideDelete // Safer to delete from management screen
                  />
                ))}
                {filteredSupervisors.length === 0 && <EmptyState text="No supervisors found" />}
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div style={styles.column}>

            {/* Warehouses Panel */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Warehouses</h2>
                <span style={{ ...styles.countBadge, backgroundColor: '#17a2b8' }}>{filteredWarehouses.length}</span>
              </div>
              <div style={styles.listContainer}>
                {filteredWarehouses.map(wh => (
                  <ListItem
                    key={wh._id}
                    title={wh.warehouseName}
                    subtitle={wh.location}
                    icon={<IoCubeOutline color="#17a2b8" size={20} />}
                    onDelete={() => confirmDelete('Warehouse', wh._id, '/api/warehouses')}
                    onOpen={() => navigation.navigate('WarehouseDetails', { warehouse: wh })}
                  />
                ))}
                {filteredWarehouses.length === 0 && <EmptyState text="No warehouses found" />}
              </div>
            </div>

            {/* Staff Panel */}
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Staff</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    style={styles.textBtn}
                    onClick={() => navigation.navigate('CreateStaff')}
                  >
                    + Add New
                  </button>
                  <span style={{ ...styles.countBadge, backgroundColor: '#28a745' }}>{filteredStaff.length}</span>
                </div>
              </div>
              <div style={styles.listContainer}>
                {filteredStaff.map(s => (
                  <ListItem
                    key={s._id}
                    title={s.fullName}
                    subtitle={`@${s.username}`}
                    icon={<IoPeopleOutline color="#28a745" size={20} />}
                    onDelete={() => confirmDelete('Staff', s._id, '/api/staff')}
                    onOpen={() => navigation.navigate('StaffDetails', { staff: s })}
                  />
                ))}
                {filteredStaff.length === 0 && <EmptyState text="No staff found" />}
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Global Styles for Animations */}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
      `}</style>
    </div>
  );
}

// --- Sub-Components ---

const StatCard = ({ icon, color, count, label }) => (
  <div style={styles.statCard}>
    <div style={{ ...styles.statIcon, color, backgroundColor: `${color}15` }}>{icon}</div>
    <div>
      <div style={styles.statCount}>{count}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  </div>
);

const ActionButton = ({ label, icon, color, onClick }) => (
  <button style={{ ...styles.actionButton, color, borderColor: color }} onClick={onClick}>
    <span style={{ marginRight: '6px', display: 'flex' }}>{icon}</span>
    {label}
  </button>
);

const ListItem = ({ title, subtitle, icon, onDelete, onOpen, hideDelete }) => (
  <div style={styles.listItem}>
    <div style={styles.listIcon}>{icon}</div>
    <div style={styles.listContent}>
      <div style={styles.listTitle}>{title}</div>
      <div style={styles.listSubtitle}>{subtitle}</div>
    </div>
    <div style={styles.listActions}>
      <button style={styles.btnGhost} onClick={onOpen} title="Open Details">
        <IoOpenOutline size={18} />
      </button>
      {!hideDelete && (
        <button style={styles.btnDanger} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
          <IoTrashOutline size={18} />
        </button>
      )}
    </div>
  </div>
);

const EmptyState = ({ text }) => (
  <div style={styles.emptyState}>{text}</div>
);

// --- CSS Styles ---
const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f4f6f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f9',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '15px',
    color: '#666',
    fontSize: '16px',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    zIndex: 10,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#333',
    margin: 0,
  },
  roleBadge: {
    backgroundColor: '#007bff',
    color: '#fff',
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    padding: '8px 12px',
    borderRadius: '8px',
    width: '300px',
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    marginLeft: '8px',
    outline: 'none',
    width: '100%',
    fontSize: '14px',
  },
  iconButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#555',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
  },
  logoutButton: {
    background: '#dc3545',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 5px rgba(220, 53, 69, 0.3)',
  },
  content: {
    flex: 1,
    padding: '30px',
    overflowY: 'auto',
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #eee',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '24px',
  },
  statCount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: '#888',
    marginTop: '4px',
  },
  actionToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '25px',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  actionButton: {
    backgroundColor: '#fff',
    border: '1px solid',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  messageButton: {
    backgroundColor: '#6f42c1',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 10px rgba(111, 66, 193, 0.3)',
    transition: 'transform 0.2s',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
    alignItems: 'start',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    border: '1px solid #eee',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '15px 20px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#444',
    margin: 0,
  },
  countBadge: {
    backgroundColor: '#007bff',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  textBtn: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  listContainer: {
    padding: '15px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #f5f5f5',
    transition: 'background 0.2s',
    ':hover': {
      backgroundColor: '#f9f9f9',
    }
  },
  listIcon: {
    backgroundColor: '#f0f2f5',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '15px',
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#333',
  },
  listSubtitle: {
    fontSize: '13px',
    color: '#888',
    marginTop: '2px',
  },
  listActions: {
    display: 'flex',
    gap: '8px',
  },
  btnGhost: {
    background: 'none',
    border: '1px solid #eee',
    borderRadius: '6px',
    padding: '6px',
    cursor: 'pointer',
    color: '#666',
    display: 'flex',
  },
  btnDanger: {
    background: '#fff0f0',
    border: '1px solid #ffcccc',
    borderRadius: '6px',
    padding: '6px',
    cursor: 'pointer',
    color: '#dc3545',
    display: 'flex',
  },
  emptyState: {
    textAlign: 'center',
    padding: '20px',
    color: '#999',
    fontStyle: 'italic',
    fontSize: '14px',
  },
};