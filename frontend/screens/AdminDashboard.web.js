// AdminDashboard.web.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardWeb() {
  const { user, API_BASE_URL, logout } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const fetchSites = useCallback(async () => {
    if (!user || !user.id) {
      setSites([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/sites?adminId=${user.id}`);
      if (res.data && res.data.success) setSites(res.data.data || []);
      else setSites([]);
    } catch (err) {
      console.error('fetchSites web error', err);
      alert('Failed to fetch sites');
      setSites([]);
    } finally {
      setLoading(false);
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
      alert('Failed to fetch warehouses');
      setWarehouses([]);
    }
  }, [user, API_BASE_URL]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([fetchSites(), fetchWarehouses()]);
    setRefreshing(false);
  }, [fetchSites, fetchWarehouses, user]);

  useEffect(() => {
    fetchAll();
  }, [user]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const confirmDeleteSite = useCallback(
    (siteId) => {
      if (!siteId || !user) return;
      const proceed = window.confirm('Are you sure you want to delete this site?');
      if (!proceed) return;
      axios
        .delete(`${API_BASE_URL}/api/sites/${siteId}?adminId=${user.id}`)
        .then(() => {
          fetchSites();
          alert('Success: Site deleted.');
        })
        .catch((err) => {
          console.error(err);
          alert('Failed to delete site');
        });
    },
    [API_BASE_URL, fetchSites, user]
  );

  const confirmDeleteWarehouse = useCallback(
    (whId) => {
      if (!whId || !user) return;
      const proceed = window.confirm('Delete warehouse and all associated managers?');
      if (!proceed) return;
      axios
        .delete(`${API_BASE_URL}/api/warehouses/${whId}?adminId=${user.id}`)
        .then(() => {
          fetchWarehouses();
          alert('Success: Warehouse deleted.');
        })
        .catch((err) => {
          console.error(err);
          alert('Failed to delete warehouse');
        });
    },
    [API_BASE_URL, fetchWarehouses, user]
  );

  const filteredSites = sites.filter(
    (s) =>
      s.siteName?.toLowerCase().includes(query.toLowerCase()) ||
      s.location?.toLowerCase().includes(query.toLowerCase())
  );
  const filteredWarehouses = warehouses.filter(
    (w) =>
      w.warehouseName?.toLowerCase().includes(query.toLowerCase()) ||
      w.location?.toLowerCase().includes(query.toLowerCase())
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
            {/* START: Role Badge Implementation */}
            <div style={styles.adminTitleRow}>
              <h1 style={styles.adminTitle}>{user.username}</h1>
              <span style={styles.adminRoleBadge}>
                {/* Fallback to 'Admin' if user.role is not set */}
                {user.role ? user.role.toUpperCase() : 'ADMIN'}
              </span>
            </div>
            {/* END: Role Badge Implementation */}

            <p style={styles.adminSubtitle}>
              {warehouses.length} warehouses • {sites.length} sites • Admin Dashboard
            </p>
          </div>

          <div style={styles.adminControls}>
            <div style={styles.adminSearchWrap}>
              <Ionicons name="search" size={16} color="#6B7280" />
              <input
                type="text"
                placeholder="Search sites or warehouses"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={styles.adminSearchInput}
                aria-label="Search sites or warehouses"
              />
            </div>

            <div style={styles.adminButtonGroup}>
              <button
                style={styles.btnOutline}
                onClick={fetchAll}
                disabled={refreshing}
                title="Refresh"
                aria-label="Refresh data"
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
                title="Create Site"
              >
                Create Site
              </button>
              <button
                style={styles.btnGhost}
                onClick={() => navigation.navigate('CreateWarehouse')}
                title="Create Warehouse"
              >
                Create Warehouse
              </button>
              <button
                style={styles.btnIcon}
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
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
                            Supplies: {wh.supplies?.length || 0} • Managers:{' '}
                            {wh.managers?.length || 0}
                          </p>
                        </div>
                        <div style={styles.adminCardActions}>
                          <button
                            style={styles.btnGhostSmall}
                            onClick={() =>
                              navigation.navigate('WarehouseDetails', { warehouse: wh })
                            }
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
                            Supplies: {site.supplies?.length || 0} • Workers:{' '}
                            {site.workers?.length || 0}
                          </p>
                        </div>
                        <div style={styles.adminCardActions}>
                          <button
                            style={styles.btnGhostSmall}
                            onClick={() =>
                              navigation.navigate('SiteDetails', {
                                site,
                                siteName: site.siteName,
                              })
                            }
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
    color: #1f2937; /* Default text color */
  }

  /* Loading Container */
  .admin-loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
    background: linear-gradient(135deg, #0b7dda 0%, #0056b3 100%); /* Darker gradient */
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
    background-color: #f4f6f9; /* Lighter background */
  }

  /* Header */
  .admin-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 20px 30px; /* Increased horizontal padding */
    background-color: #fff;
    border-bottom: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* Softer, more pronounced shadow */
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
  
  /* New style to align title and badge */
  .admin-title-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }

  .admin-title {
    font-size: 28px; /* Slightly larger title */
    font-weight: 700;
    margin: 0;
    color: #1f2937;
  }

  /* Role Badge */
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
    font-size: 14px; /* Slightly larger subtitle */
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
    gap: 8px; /* Increased gap */
    background: #fff; /* White background */
    padding: 8px 12px;
    border-radius: 8px; /* Softer corners */
    border: 1px solid #d1d5db;
    min-width: 250px; /* Wider search bar */
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05); /* Inset shadow */
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
    padding: 10px 16px; /* Slightly larger buttons */
    border-radius: 8px; /* Softer corners */
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); /* Smoother transition */
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
    box-shadow: 0 4px 6px rgba(0, 123, 255, 0.2); /* Shadow for primary button */
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #005bb5; /* Darker on hover */
    border-color: #005bb5;
    box-shadow: 0 6px 8px rgba(0, 123, 255, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .btn-ghost {
    background-color: #f0f4f8; /* Light background for ghost */
    color: #007bff;
    border: 1px solid #f0f4f8;
  }

  .btn-ghost:hover:not(:disabled) {
    background-color: #e2e8f0; /* Darker on hover */
    border-color: #e2e8f0;
  }

  .btn-ghost:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-outline {
    background-color: #fff;
    color: #007bff;
    border: 1px solid #d1d5db;
    padding: 10px; /* Square for icon-only button */
  }

  .btn-outline:hover:not(:disabled) {
    background-color: #f3f4f6;
    border-color: #9ca3af;
  }

  .btn-outline:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-icon {
    background-color: transparent;
    color: #007bff;
    border: none;
    padding: 8px; /* Slightly smaller icon button */
    border-radius: 50%;
  }

  .btn-icon:hover {
    background-color: #f3f4f6;
  }

  .btn-icon:focus {
    outline: 2px solid #90cdf4;
    outline-offset: 2px;
  }

  .btn-ghost-small {
    background-color: #e5e7eb; /* Subtle background */
    color: #1f2937;
    border: 1px solid #e5e7eb;
    padding: 6px 10px;
    font-size: 11px;
    border-radius: 6px;
    font-weight: 500;
  }

  .btn-ghost-small:hover {
    background-color: #d1d5db;
  }

  .btn-danger-small {
    background-color: #dc2626; /* Slightly darker red */
    color: #fff;
    border: 1px solid #dc2626;
    padding: 6px 10px;
    font-size: 11px;
    border-radius: 6px;
  }

  .btn-danger-small:hover {
    background-color: #b91c1c;
    border-color: #b91c1c;
  }

  /* Main Content */
  .admin-content {
    flex: 1;
    padding: 30px; /* Increased padding */
    width: 100%;
    max-width: 1280px; /* Wider max-width */
    margin: 0 auto;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .admin-loader-row {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px 20px;
    min-height: 300px;
  }

  /* Spinner */
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #007bff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Grid Layout */
  .admin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px; /* Increased gap */
    width: 100%;
  }

  @media (max-width: 1024px) {
    .admin-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Panel */
  .admin-panel {
    background-color: #fff;
    border-radius: 12px; /* More rounded corners */
    padding: 20px; /* Increased padding */
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); /* Softer shadow */
    border: 1px solid #e5e7eb;
  }

  .admin-panel-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 10px;
  }

  .admin-panel-title {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    color: #374151;
  }

  .admin-panel-count {
    background-color: #007bff;
    color: #fff;
    padding: 4px 12px; /* Larger pill */
    border-radius: 999px;
    font-weight: 600;
    font-size: 13px;
  }

  /* Card List */
  .admin-card-list {
    display: flex;
    flex-direction: column;
    gap: 12px; /* Added gap between cards */
  }

  /* Card */
  .admin-card {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 16px; /* Increased padding */
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background-color: #fff; /* White background for cards */
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  .admin-card:hover {
    background-color: #f8fafc; /* Subtle hover color */
    border-color: #c5d0db;
    transform: translateY(-1px); /* Lift effect on hover */
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  }

  .admin-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .admin-card-title {
    font-size: 17px;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .admin-card-meta {
    color: #6b7280;
    margin-top: 4px;
    font-size: 13px;
    margin: 4px 0 0 0;
  }

  .admin-card-small {
    color: #9ca3af;
    margin-top: 6px;
    font-size: 12px;
    margin: 6px 0 0 0;
  }

  .admin-card-actions {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
    margin-left: 20px;
    flex-shrink: 0;
  }

  /* Empty Panel */
  .admin-empty-panel {
    padding: 40px 20px;
    text-align: center;
    border: 1px dashed #d1d5db;
    border-radius: 8px;
    background-color: #f9fafb;
    margin-top: 10px;
  }

  .admin-empty-text {
    color: #9ca3af;
    text-align: center;
    font-style: italic;
    margin: 0;
  }

  /* Scrollbar Styling */
  .admin-content::-webkit-scrollbar {
    width: 8px;
  }

  .admin-content::-webkit-scrollbar-track {
    background: #e5e7eb; /* Lighter track */
  }

  .admin-content::-webkit-scrollbar-thumb {
    background: #9ca3af; /* Darker thumb */
    border-radius: 4px;
  }

  .admin-content::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }

  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .admin-header {
      padding: 15px 20px;
      flex-direction: column;
      align-items: flex-start;
    }

    .admin-controls {
      width: 100%;
      justify-content: flex-start;
      margin-top: 10px;
    }

    .admin-search-wrap {
      width: 100%;
      min-width: 0;
    }

    .admin-button-group {
      width: 100%;
      justify-content: space-between;
    }
    
    .btn-primary, .btn-ghost {
      flex: 1;
    }

    .btn-icon {
      flex: 0 0 auto;
    }

    .admin-card {
      flex-direction: column;
      align-items: flex-start;
      padding: 12px;
    }

    .admin-card-actions {
      margin-left: 0;
      margin-top: 12px;
      width: 100%;
      justify-content: space-between;
    }

    .admin-card-actions button {
      flex: 1;
    }

    .admin-content {
      padding: 15px;
    }

    .admin-grid {
      grid-template-columns: 1fr;
      gap: 15px;
    }

    .admin-panel {
      padding: 15px;
    }
  }

  @media (max-width: 480px) {
    .admin-title {
      font-size: 24px;
    }

    .admin-subtitle {
      font-size: 12px;
    }

    .btn-primary,
    .btn-ghost,
    .btn-outline {
      font-size: 13px;
      padding: 8px 10px;
    }

    .admin-card-title {
      font-size: 15px;
    }

    .admin-panel-title {
      font-size: 18px;
    }
  }
`;

// Inline Styles Object
const styles = {
  adminLoadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100vh',
    background: 'linear-gradient(135deg, #0b7dda 0%, #0056b3 100%)', // Updated gradient
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
    backgroundColor: '#f4f6f9', // Updated background
  },
  adminHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '20px 30px', // Updated padding
    backgroundColor: '#fff',
    borderBottom: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', // Updated shadow
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
  // New style to align title and badge
  adminTitleRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },
  adminTitle: {
    fontSize: '28px', // Updated font size
    fontWeight: '700',
    margin: 0,
    color: '#1f2937',
  },
  // New style for the role badge
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
    fontSize: '14px', // Updated font size
    margin: '4px 0 0 0',
  },
  adminControls: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
    minWidth: '250px', // Updated min width
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)', // New shadow
  },
  adminSearchInput: {
    border: 'none',
    outline: 'none',
    padding: 0,
    marginLeft: 0, // Removed left margin, use gap
    fontSize: '15px', // Updated font size
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
    display: 'inline-flex',
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
    borderRadius: '50%', // Circle shape
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
    padding: '30px', // Updated padding
    width: '100%',
    maxWidth: '1280px', // Updated max width
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
    gap: '30px', // Updated gap
    width: '100%',
  },
  adminPanel: {
    backgroundColor: '#fff',
    borderRadius: '12px', // Updated border radius
    padding: '20px', // Updated padding
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)', // Updated shadow
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
    fontSize: '20px', // Updated font size
    fontWeight: '700',
    margin: 0,
    color: '#374151',
  },
  adminPanelCount: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '4px 12px', // Updated padding
    borderRadius: '999px',
    fontWeight: '600',
    fontSize: '13px', // Updated font size
  },
  adminCardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px', // Added gap
  },
  adminCard: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px', // Updated padding
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    // Removed marginBottom to use gap in list
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
    fontSize: '17px', // Updated font size
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