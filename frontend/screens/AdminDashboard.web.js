import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardWeb() {
  // Added 'token' to destructuring to use in Authorization headers
  const { user, API_BASE_URL, logout, token } = useAuth();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [supervisors, setSupervisors] = useState([]); // NEW: Supervisors state
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  // --- 1. Fetch Functions ---
  const fetchStaff = useCallback(async () => {
    if (!user || !user.id) {
      setStaff([]);
      return;
    }
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      const res = await axios.get(`${API_BASE_URL}/api/staff`, config);
      if (res.data && res.data.success) {
        setStaff(res.data.data || []);
      } else {
        setStaff([]);
      }
    } catch (err) {
      console.error('fetchStaff web error', err);
    }
  }, [user, API_BASE_URL, token]);

  const fetchSites = useCallback(async () => {
    if (!user || !user.id) {
      setSites([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sites?adminId=${user.id}`);
      if (res.data && res.data.success) setSites(res.data.data || []);
      else setSites([]);
    } catch (err) {
      console.error('fetchSites web error', err);
      setSites([]);
    }
  }, [user, API_BASE_URL]);

  const fetchWarehouses = useCallback(async () => {
    if (!user || !user.id) {
      setWarehouses([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/api/warehouses?adminId=${user.id}`);
      if (res.data && res.data.success) setWarehouses(res.data.data || []);
      else setWarehouses([]);
    } catch (err) {
      console.error('fetchWarehouses web error', err);
      setWarehouses([]);
    }
  }, [user, API_BASE_URL]);

  const fetchSupervisors = useCallback(async () => {
    if (!user || !user.id) {
      setSupervisors([]);
      return;
    }
    try {
      // Note: Ensure this endpoint matches your backend route exactly
      const res = await axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`);
      if (res.data && res.data.success) {
        setSupervisors(res.data.data || []);
      } else {
        setSupervisors([]);
      }
    } catch (err) {
      console.error('fetchSupervisors web error', err);
      setSupervisors([]);
    }
  }, [user, API_BASE_URL]);

  // Updated fetchAll to include fetchStaff and fetchSupervisors
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    setLoading(true);
    try {
      await Promise.all([fetchSites(), fetchWarehouses(), fetchStaff(), fetchSupervisors()]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        alert('Session Expired. Please login again.');
        logout();
      } else {
        alert('Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchSites, fetchWarehouses, fetchStaff, fetchSupervisors, user, logout]);

  useEffect(() => {
    fetchAll();
  }, [user]);

  // Add focus listener to refresh data when returning from details screens
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAll();
    });
    return unsubscribe;
  }, [navigation, fetchAll]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // --- 2. Delete Logic ---
  const confirmDeleteStaff = useCallback(async (staffId) => {
    if (!staffId) return;
    const proceed = window.confirm('Are you sure you want to delete this staff member?');
    if (!proceed) return;

    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      await axios.delete(`${API_BASE_URL}/api/staff/${staffId}`, config);
      fetchStaff(); // Refresh list
      alert('Success: Staff member deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete staff member');
    }
  }, [API_BASE_URL, fetchStaff, token]);

  const confirmDeleteSite = useCallback((siteId) => {
    if (!siteId || !user) return;
    const proceed = window.confirm('Are you sure you want to delete this site?');
    if (!proceed) return;
    axios.delete(`${API_BASE_URL}/api/sites/${siteId}?adminId=${user.id}`)
      .then(() => {
        fetchSites();
        alert('Success: Site deleted.');
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to delete site');
      });
  }, [API_BASE_URL, fetchSites, user]);

  const confirmDeleteWarehouse = useCallback((whId) => {
    if (!whId || !user) return;
    const proceed = window.confirm('Delete warehouse and all associated managers?');
    if (!proceed) return;
    axios.delete(`${API_BASE_URL}/api/warehouses/${whId}?adminId=${user.id}`)
      .then(() => {
        fetchWarehouses();
        alert('Success: Warehouse deleted.');
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to delete warehouse');
      });
  }, [API_BASE_URL, fetchWarehouses, user]);

  // --- 3. Filtering Logic ---
  const filteredSites = sites.filter(s =>
    s.siteName?.toLowerCase().includes(query.toLowerCase()) ||
    s.location?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredWarehouses = warehouses.filter(w =>
    w.warehouseName?.toLowerCase().includes(query.toLowerCase()) ||
    w.location?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredStaff = staff.filter(s =>
    s.fullName?.toLowerCase().includes(query.toLowerCase()) ||
    s.username?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredSupervisors = supervisors.filter(s =>
    s.username?.toLowerCase().includes(query.toLowerCase())
  );

  if (!user) {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={styles.adminLoadingContainer}>
          <div style={styles.adminLoadingContent}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading user data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{globalStyles}</style>
      <div style={styles.adminPage}>
        {/* Header */}
        <header style={styles.adminHeader}>
          <div style={styles.adminTitleBlock}>
            <div style={styles.adminTitleRow}>
              <h1 style={styles.adminTitle}>{user.username}</h1>
              <span style={styles.adminRoleBadge}>
                {user.role ? user.role.toUpperCase() : 'ADMIN'}
              </span>
            </div>

            <p style={styles.adminSubtitle}>
              {warehouses.length} warehouses • {sites.length} sites • {staff.length} staff • {supervisors.length} supervisors
            </p>
          </div>

          <div style={styles.adminControls}>
            <div style={styles.adminSearchWrap}>
              <Ionicons name="search" size={16} color="#6B7280" />
              <input
                type="text"
                placeholder="Search resources or staff"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={styles.adminSearchInput}
                aria-label="Search"
              />
            </div>

            <div style={styles.adminButtonGroup}>
              <button
                style={styles.btnOutline}
                onClick={fetchAll}
                disabled={refreshing}
                title="Refresh"
              >
                <Ionicons
                  name={refreshing ? 'sync-circle-outline' : 'refresh'}
                  size={18}
                  color="#007BFF"
                />
              </button>

              <button
                style={styles.btnPrimary}
                onClick={() => navigation.navigate('CreateSite')}
              >
                Create Site
              </button>

              <button
                style={styles.btnGhost}
                onClick={() => navigation.navigate('CreateWarehouse')}
              >
                Create Warehouse
              </button>

              {/* Create Supervisor Button */}
              <button
                style={{ ...styles.btnGhost, borderColor: '#8B5CF6', color: '#7C3AED', backgroundColor: '#F3E8FF' }}
                onClick={() => navigation.navigate('GlobalManageSupervisors')}
                title="Manage & Create Supervisors"
              >
                <Ionicons name="people-circle-outline" size={16} color="#7C3AED" />
                Supervisors
              </button>

              {/* Create Staff Button */}
              <button
                style={{ ...styles.btnGhost, borderColor: '#d1d5db', backgroundColor: '#fff', color: '#374151' }}
                onClick={() => navigation.navigate('CreateStaff')}
                title="Create Staff Member"
              >
                <Ionicons name="people-outline" size={16} color="#374151" />
                Add Staff
              </button>

              <button
                style={styles.btnIcon}
                onClick={handleLogout}
                title="Logout"
              >
                <Ionicons name="log-out-outline" size={20} color="#007BFF" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={styles.adminContent}>
          {loading ? (
            <div style={styles.adminLoaderRow}>
              <div style={styles.spinner}></div>
            </div>
          ) : (
            <div style={styles.adminGrid}>

              {/* Warehouses Panel */}
              <section style={styles.adminPanel}>
                <div style={styles.adminPanelHeader}>
                  <h2 style={styles.adminPanelTitle}>Warehouses</h2>
                  <span style={styles.adminPanelCount}>{filteredWarehouses.length}</span>
                </div>
                {filteredWarehouses.length === 0 ? (
                  <div style={styles.adminEmptyPanel}>
                    <p style={styles.adminEmptyText}>No warehouses found</p>
                  </div>
                ) : (
                  <div style={styles.adminCardList}>
                    {filteredWarehouses.map((wh) => (
                      <div key={wh._id} style={styles.adminCard}>
                        <div style={styles.adminCardContent}>
                          <h3 style={styles.adminCardTitle}>{wh.warehouseName}</h3>
                          <p style={styles.adminCardMeta}>{wh.location}</p>
                          <p style={styles.adminCardSmall}>
                            Supplies: {wh.supplies?.length || 0} • Managers: {wh.managers?.length || 0}
                          </p>
                        </div>
                        <div style={styles.adminCardActions}>
                          <button
                            style={styles.btnGhostSmall}
                            onClick={() => navigation.navigate('WarehouseDetails', { warehouse: wh })}
                          >
                            Open
                          </button>
                          <button
                            style={styles.btnDangerSmall}
                            onClick={() => confirmDeleteWarehouse(wh._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sites Panel */}
              <section style={styles.adminPanel}>
                <div style={styles.adminPanelHeader}>
                  <h2 style={styles.adminPanelTitle}>Sites</h2>
                  <span style={styles.adminPanelCount}>{filteredSites.length}</span>
                </div>
                {filteredSites.length === 0 ? (
                  <div style={styles.adminEmptyPanel}>
                    <p style={styles.adminEmptyText}>No sites found</p>
                  </div>
                ) : (
                  <div style={styles.adminCardList}>
                    {filteredSites.map((site) => (
                      <div key={site._id} style={styles.adminCard}>
                        <div style={styles.adminCardContent}>
                          <h3 style={styles.adminCardTitle}>{site.siteName}</h3>
                          <p style={styles.adminCardMeta}>📍 {site.location}</p>
                          <p style={styles.adminCardSmall}>
                            Supplies: {site.supplies?.length || 0} • Workers: {site.workers?.length || 0}
                          </p>
                        </div>
                        <div style={styles.adminCardActions}>
                          <button
                            style={styles.btnGhostSmall}
                            onClick={() => navigation.navigate('SiteDetails', { site, siteName: site.siteName })}
                          >
                            Open
                          </button>
                          <button
                            style={styles.btnDangerSmall}
                            onClick={() => confirmDeleteSite(site._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Staff Panel - Full Width */}
              <section style={{ ...styles.adminPanel, gridColumn: '1 / -1' }}>
                <div style={styles.adminPanelHeader}>
                  <h2 style={styles.adminPanelTitle}>Staff Members</h2>
                  <span style={{ ...styles.adminPanelCount, backgroundColor: '#10B981' }}>{filteredStaff.length}</span>
                </div>

                {filteredStaff.length === 0 ? (
                  <div style={styles.adminEmptyPanel}>
                    <p style={styles.adminEmptyText}>No staff members found</p>
                  </div>
                ) : (
                  <div style={{ ...styles.adminCardList, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {filteredStaff.map((person) => (
                      <div key={person._id} style={styles.adminCard}>
                        <div style={styles.adminCardContent}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369A1', fontWeight: 'bold', fontSize: '14px' }}>
                              {person.fullName ? person.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <h3 style={styles.adminCardTitle}>{person.fullName}</h3>
                              <p style={{ ...styles.adminCardMeta, color: '#007bff' }}>@{person.username}</p>
                            </div>
                          </div>
                          <p style={styles.adminCardSmall}>
                            Role: {person.role} • ID: ...{person._id.slice(-4)}
                          </p>
                        </div>
                        <div style={styles.adminCardActions}>
                          <button
                            style={styles.btnGhostSmall}
                            onClick={() => navigation.navigate('StaffDetails', { staff: person })}
                          >
                            Open
                          </button>
                          <button
                            style={styles.btnDangerSmall}
                            onClick={() => confirmDeleteStaff(person._id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Supervisors Panel - Full Width */}
              <section style={{ ...styles.adminPanel, gridColumn: '1 / -1' }}>
                <div style={styles.adminPanelHeader}>
                  <h2 style={styles.adminPanelTitle}>Supervisors</h2>
                  <span style={{ ...styles.adminPanelCount, backgroundColor: '#8B5CF6' }}>{filteredSupervisors.length}</span>
                </div>

                {filteredSupervisors.length === 0 ? (
                  <div style={styles.adminEmptyPanel}>
                    <p style={styles.adminEmptyText}>No supervisors found</p>
                  </div>
                ) : (
                  <div style={{ ...styles.adminCardList, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {filteredSupervisors.map((sup) => (
                      <div key={sup._id} style={styles.adminCard}>
                        <div style={styles.adminCardContent}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', fontWeight: 'bold', fontSize: '14px' }}>
                              {sup.username ? sup.username.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <h3 style={styles.adminCardTitle}>{sup.username}</h3>
                              <p style={styles.adminCardMeta}>
                                {sup.assignedSites && sup.assignedSites.length > 0
                                  ? `${sup.assignedSites.length} Site(s) Assigned`
                                  : 'No Sites Assigned'}
                              </p>
                            </div>
                          </div>
                          {sup.assignedSites && sup.assignedSites.length > 0 && (
                            <p style={styles.adminCardSmall}>
                              {sup.assignedSites.map(s => s.siteName).join(', ')}
                            </p>
                          )}
                        </div>
                        <div style={styles.adminCardActions}>
                          <button
                            style={styles.btnGhostSmall}
                            onClick={() => navigation.navigate('GlobalManageSupervisors')}
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          )}
        </main>
      </div>
    </>
  );
}

// Global CSS Styles
const globalStyles = `
  * {
    box-sizing: border-box;
  }

  /* Global Reset & Base */
  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #1f2937; 
  }

  /* Loading Container */
  .admin-loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
    background: linear-gradient(135deg, #0b7dda 0%, #0056b3 100%); 
  }

  .admin-loading-content {
    text-align: center;
    color: white;
  }

  .admin-loading-content p {
    margin-top: 12px;
    font-size: 16px;
  }

  /* Main Page Container */
  .admin-page {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    background-color: #f4f6f9; 
  }

  /* Header */
  .admin-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 20px 30px; 
    background-color: #fff;
    border-bottom: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); 
    position: sticky;
    top: 0;
    z-index: 10;
    gap: 20px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .admin-title-block {
    display: flex;
    flex-direction: column;
  }
  
  .admin-title-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }

  .admin-title {
    font-size: 28px; 
    font-weight: 700;
    margin: 0;
    color: #1f2937;
  }

  .admin-role-badge {
    background-color: #007bff;
    color: #fff;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
    align-self: center; 
    line-height: 1;
  }

  .admin-subtitle {
    color: #6b7280;
    margin-top: 4px;
    font-size: 14px; 
    margin: 4px 0 0 0;
  }

  /* Controls */
  .admin-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .admin-search-wrap {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px; 
    background: #fff; 
    padding: 8px 12px;
    border-radius: 8px; 
    border: 1px solid #d1d5db;
    min-width: 250px; 
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05); 
  }

  .admin-search-input {
    border: none;
    outline: none;
    padding: 0;
    margin-left: 0;
    font-size: 15px;
    background: transparent;
    flex: 1;
    font-family: inherit;
    color: #1f2937;
  }

  .admin-search-input::placeholder {
    color: #9ca3af;
  }

  .admin-button-group {
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  /* Buttons */
  .btn-primary,
  .btn-ghost,
  .btn-outline,
  .btn-icon,
  .btn-ghost-small,
  .btn-danger-small {
    padding: 10px 16px; 
    border-radius: 8px; 
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    text-decoration: none;
    outline: none;
  }

  .btn-primary {
    background-color: #007bff;
    color: #fff;
    border: 1px solid #007bff;
    box-shadow: 0 4px 6px rgba(0, 123, 255, 0.2); 
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #005bb5; 
    border-color: #005bb5;
    box-shadow: 0 6px 8px rgba(0, 123, 255, 0.3);
  }

  .btn-ghost {
    background-color: transparent;
    color: #007bff;
    border: 1px solid transparent;
  }

  .btn-ghost:hover:not(:disabled) {
    background-color: rgba(0, 123, 255, 0.1);
    color: #005bb5;
  }

  .btn-outline {
    background-color: transparent;
    border: 1px solid #d1d5db;
    color: #374151;
  }

  .btn-outline:hover:not(:disabled) {
    background-color: #f3f4f6;
    border-color: #9ca3af;
  }

  .btn-icon {
    padding: 10px;
    border-radius: 50%;
    background-color: transparent;
    color: #6b7280;
  }

  .btn-icon:hover:not(:disabled) {
    background-color: rgba(0, 0, 0, 0.05);
    color: #1f2937;
  }

  .btn-ghost-small {
    padding: 6px 12px;
    font-size: 12px;
    background-color: transparent;
    color: #007bff;
    border: 1px solid transparent; 
  }

  .btn-ghost-small:hover {
    background-color: rgba(0, 123, 255, 0.08);
    text-decoration: underline;
  }

  .btn-danger-small {
    padding: 6px 12px;
    font-size: 12px;
    background-color: transparent;
    color: #ef4444; 
  }

  .btn-danger-small:hover {
    background-color: rgba(239, 68, 68, 0.08);
    text-decoration: underline;
  }

  /* Grid & Panels */
  .admin-content {
    flex: 1;
    overflow-y: auto;
    padding: 30px;
  }

  .admin-loader-row {
    display: flex;
    justify-content: center;
    padding-top: 50px;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #09f;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .admin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 24px;
    padding-bottom: 40px;
  }

  .admin-panel {
    background-color: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    border: 1px solid #e5e7eb;
    overflow: hidden; 
    transition: box-shadow 0.2s ease;
  }

  .admin-panel:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  }

  .admin-panel-header {
    padding: 16px 20px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #f9fafb;
  }

  .admin-panel-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    color: #111827;
  }

  .admin-panel-count {
    background-color: #007bff;
    color: #fff;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .admin-empty-panel {
    padding: 40px;
    text-align: center;
    color: #9ca3af;
  }

  .admin-empty-text {
    font-size: 14px;
    margin: 0;
  }

  .admin-card-list {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .admin-card {
    background-color: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .admin-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    border-color: #d1d5db;
  }

  .admin-card-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .admin-card-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #1f2937;
  }

  .admin-card-meta {
    font-size: 13px;
    color: #6b7280;
    margin: 0;
  }

  .admin-card-small {
    font-size: 12px;
    color: #9ca3af;
    margin: 4px 0 0 0;
  }

  .admin-card-actions {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .admin-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
    
    .admin-controls {
      width: 100%;
      justify-content: space-between;
    }

    .admin-search-wrap {
      flex: 1;
      min-width: 0;
    }

    .admin-grid {
      grid-template-columns: 1fr; 
    }
  }
`;

// MISSING STYLES OBJECT
const styles = {
  adminLoadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100vh',
    background: 'linear-gradient(135deg, #0b7dda 0%, #0056b3 100%)',
  },
  adminLoadingContent: {
    textAlign: 'center',
    color: 'white',
  },
  loadingText: {
    marginTop: '12px',
    fontSize: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#007bff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  adminPage: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
    backgroundColor: '#f4f6f9',
  },
  adminHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '20px 30px',
    backgroundColor: '#fff',
    borderBottom: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    gap: '20px',
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  adminTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  adminTitleRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },
  adminTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
    color: '#1f2937',
  },
  adminRoleBadge: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
    alignSelf: 'center',
    lineHeight: 1,
  },
  adminSubtitle: {
    color: '#6b7280',
    marginTop: '4px',
    fontSize: '14px',
    margin: '4px 0 0 0',
  },
  adminControls: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flexEnd',
  },
  adminSearchWrap: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '8px',
    background: '#fff',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    minWidth: '250px',
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  adminSearchInput: {
    border: 'none',
    outline: 'none',
    padding: 0,
    marginLeft: 0,
    fontSize: '15px',
    background: 'transparent',
    flex: 1,
    fontFamily: 'inherit',
    color: '#1f2937',
  },
  adminButtonGroup: {
    display: 'flex',
    flexDirection: 'row',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: '1px solid #007bff',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inlineDrag',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'inherit',
    boxShadow: '0 4px 6px rgba(0, 123, 255, 0.2)',
  },
  btnGhost: {
    backgroundColor: '#f0f4f8',
    color: '#007bff',
    border: '1px solid #f0f4f8',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'inherit',
  },
  btnOutline: {
    backgroundColor: '#fff',
    color: '#007bff',
    border: '1px solid #d1d5db',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'inherit',
  },
  btnIcon: {
    backgroundColor: 'transparent',
    color: '#007bff',
    border: 'none',
    padding: '8px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: 'inherit',
  },
  btnGhostSmall: {
    backgroundColor: '#e5e7eb',
    color: '#1f2937',
    border: '1px solid #e5e7eb',
    padding: '6px 10px',
    fontSize: '11px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontWeight: '500',
    fontFamily: 'inherit',
  },
  btnDangerSmall: {
    backgroundColor: '#dc2626',
    color: '#fff',
    border: '1px solid #dc2626',
    padding: '6px 10px',
    fontSize: '11px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    fontWeight: '600',
    fontFamily: 'inherit',
  },
  adminContent: {
    flex: 1,
    padding: '30px',
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  adminLoaderRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    minHeight: '300px',
  },
  adminGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
    width: '100%',
  },
  adminPanel: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
  },
  adminPanelHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '10px',
  },
  adminPanelTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    color: '#374151',
  },
  adminPanelCount: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '999px',
    fontWeight: '600',
    fontSize: '13px',
  },
  adminCardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  adminCard: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#fff',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
  },
  adminCardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  adminCardTitle: {
    fontSize: '17px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  adminCardMeta: {
    color: '#6b7280',
    marginTop: '4px',
    fontSize: '13px',
    margin: '4px 0 0 0',
  },
  adminCardSmall: {
    color: '#9ca3af',
    marginTop: '6px',
    fontSize: '12px',
    margin: '6px 0 0 0',
  },
  adminCardActions: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    alignItems: 'center',
    marginLeft: '20px',
    flexShrink: 0,
  },
  adminEmptyPanel: {
    padding: '40px 20px',
    textAlign: 'center',
    border: '1px dashed #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    marginTop: '10px',
  },
  adminEmptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    margin: 0,
  },
};