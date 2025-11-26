import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function StaffDashboardWeb() {
  const { user, API_BASE_URL, logout, token } = useAuth();
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  // Determine the Admin ID to fetch resources for.
  // Staff members should see resources belonging to the Admin who created them.
  // We expect 'user.createdBy' to hold the Admin's ID.
  // Fallback to 'user.id' if createdBy is missing (though typical staff flow requires createdBy).
  const adminId = user?.createdBy || user?.id;

  const fetchSites = useCallback(async () => {
    if (!adminId) {
      setSites([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Pass the token in headers for authorization
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { adminId: adminId } // Filter by the Admin's ID
      };
      
      const res = await axios.get(`${API_BASE_URL}/api/sites`, config);
      if (res.data && res.data.success) setSites(res.data.data || []);
      else setSites([]);
    } catch (err) {
      console.error('fetchSites web error', err);
      // Silent fail or specific error handling
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, [adminId, API_BASE_URL, token]);

  const fetchWarehouses = useCallback(async () => {
    if (!adminId) {
      setWarehouses([]);
      return;
    }
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { adminId: adminId }
      };

      const res = await axios.get(`${API_BASE_URL}/api/warehouses`, config);
      if (res.data && res.data.success) setWarehouses(res.data.data || []);
      else setWarehouses([]);
    } catch (err) {
      console.error('fetchWarehouses web error', err);
      setWarehouses([]);
    }
  }, [adminId, API_BASE_URL, token]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([fetchSites(), fetchWarehouses()]);
    setRefreshing(false);
  }, [fetchSites, fetchWarehouses, user]);

  useEffect(() => {
    fetchAll();
  }, [user]);

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAll();
    });
    return unsubscribe;
  }, [navigation, fetchAll]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // Filtering Logic
  const filteredSites = sites.filter(s => 
    s.siteName?.toLowerCase().includes(query.toLowerCase()) || 
    s.location?.toLowerCase().includes(query.toLowerCase())
  );
  
  const filteredWarehouses = warehouses.filter(w => 
    w.warehouseName?.toLowerCase().includes(query.toLowerCase()) || 
    w.location?.toLowerCase().includes(query.toLowerCase())
  );

  if (!user) {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingContent}>
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
      <div style={styles.page}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.titleBlock}>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>Hello, {user.fullName || user.username}</h1>
              <span style={styles.roleBadge}>STAFF</span>
            </div>
            <p style={styles.subtitle}>
              {filteredWarehouses.length} warehouses • {filteredSites.length} sites
            </p>
          </div>

          <div style={styles.controls}>
            <div style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="#6B7280" />
              <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={styles.searchInput}
                aria-label="Search"
              />
            </div>

            <div style={styles.buttonGroup}>
              <button
                style={styles.btnOutline}
                onClick={fetchAll}
                disabled={refreshing}
                title="Refresh"
              >
                <Ionicons
                  name={refreshing ? 'sync-circle-outline' : 'refresh'}
                  size={18}
                  color="#9C27B0" // Purple for staff theme
                />
              </button>
              
              <button
                style={styles.btnIcon}
                onClick={handleLogout}
                title="Logout"
              >
                <Ionicons name="log-out-outline" size={20} color="#9C27B0" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={styles.content}>
          {loading ? (
            <div style={styles.loaderRow}>
              <div style={styles.spinner}></div>
            </div>
          ) : (
            <div style={styles.grid}>
              
              {/* Warehouses Panel */}
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Warehouses</h2>
                  <span style={styles.panelCount}>{filteredWarehouses.length}</span>
                </div>
                {filteredWarehouses.length === 0 ? (
                  <div style={styles.emptyPanel}>
                    <p style={styles.emptyText}>No warehouses found</p>
                  </div>
                ) : (
                  <div style={styles.cardList}>
                    {filteredWarehouses.map((wh) => (
                      <div key={wh._id} style={styles.card}>
                        <div style={styles.cardContent}>
                          <h3 style={styles.cardTitle}>{wh.warehouseName}</h3>
                          <p style={styles.cardMeta}>{wh.location}</p>
                          <p style={styles.cardSmall}>
                            Supplies: {wh.supplies?.length || 0}
                          </p>
                        </div>
                        <div style={styles.cardActions}>
                          <button
                            style={styles.btnGhostSmall}
                            onClick={() => navigation.navigate('WarehouseDetails', { warehouse: wh })}
                          >
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sites Panel */}
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Sites</h2>
                  <span style={styles.panelCount}>{filteredSites.length}</span>
                </div>
                {filteredSites.length === 0 ? (
                  <div style={styles.emptyPanel}>
                    <p style={styles.emptyText}>No sites found</p>
                  </div>
                ) : (
                  <div style={styles.cardList}>
                    {filteredSites.map((site) => (
                      <div key={site._id} style={styles.card}>
                        <div style={styles.cardContent}>
                          <h3 style={styles.cardTitle}>{site.siteName}</h3>
                          <p style={styles.cardMeta}>📍 {site.location}</p>
                          <p style={styles.cardSmall}>
                            Supplies: {site.supplies?.length || 0} • Workers: {site.workers?.length || 0}
                          </p>
                        </div>
                        <div style={styles.cardActions}>
                          <button
                            style={styles.btnGhostSmall}
                            onClick={() => navigation.navigate('SiteDetails', { site, siteName: site.siteName })}
                          >
                            Open
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

// Styles adapted from AdminDashboard but customized for Staff (Purple Theme)
const styles = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100vh',
    background: 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)', // Purple gradient
  },
  loadingContent: {
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
    borderTopColor: '#9C27B0',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  page: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
    backgroundColor: '#f4f6f9', 
  },
  header: {
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
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  titleRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },
  title: {
    fontSize: '28px', 
    fontWeight: '700',
    margin: 0,
    color: '#1f2937',
  },
  roleBadge: {
    backgroundColor: '#9C27B0', // Purple
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 4px rgba(156, 39, 176, 0.2)',
    alignSelf: 'center',
    lineHeight: 1,
  },
  subtitle: {
    color: '#6b7280',
    marginTop: '4px',
    fontSize: '14px', 
    margin: '4px 0 0 0',
  },
  controls: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  searchWrap: {
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
  searchInput: {
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
  buttonGroup: {
    display: 'flex',
    flexDirection: 'row',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btnOutline: {
    backgroundColor: '#fff',
    color: '#9C27B0',
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
    color: '#9C27B0',
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
    fontWeight: '600',
    fontFamily: 'inherit',
  },
  content: {
    flex: 1,
    padding: '30px', 
    width: '100%',
    maxWidth: '1280px', 
    margin: '0 auto',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  loaderRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 20px',
    minHeight: '300px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px', 
    width: '100%',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: '12px', 
    padding: '20px', 
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)', 
    border: '1px solid #e5e7eb',
  },
  panelHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '10px',
  },
  panelTitle: {
    fontSize: '20px', 
    fontWeight: '700',
    margin: 0,
    color: '#374151',
  },
  panelCount: {
    backgroundColor: '#9C27B0',
    color: '#fff',
    padding: '4px 12px', 
    borderRadius: '999px',
    fontWeight: '600',
    fontSize: '13px', 
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px', 
  },
  card: {
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
  cardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: '17px', 
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  cardMeta: {
    color: '#6b7280',
    marginTop: '4px',
    fontSize: '13px',
    margin: '4px 0 0 0',
  },
  cardSmall: {
    color: '#9ca3af',
    marginTop: '6px',
    fontSize: '12px',
    margin: '6px 0 0 0',
  },
  cardActions: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    alignItems: 'center',
    marginLeft: '20px',
    flexShrink: 0,
  },
  emptyPanel: {
    padding: '40px 20px',
    textAlign: 'center',
    border: '1px dashed #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    marginTop: '10px',
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    margin: 0,
  },
};

const globalStyles = `
  * {
    box-sizing: border-box;
  }
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
  /* Scrollbar Styling */
  .content::-webkit-scrollbar {
    width: 8px;
  }
  .content::-webkit-scrollbar-track {
    background: #e5e7eb; 
  }
  .content::-webkit-scrollbar-thumb {
    background: #9ca3af; 
    border-radius: 4px;
  }
  .content::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
  /* Responsive */
  @media (max-width: 768px) {
    .header { padding: 15px 20px; flex-direction: column; align-items: flex-start; }
    .controls { width: 100%; justify-content: flex-start; margin-top: 10px; }
    .searchWrap { width: 100%; min-width: 0; }
    .buttonGroup { width: 100%; justify-content: space-between; }
    .grid { grid-template-columns: 1fr; gap: 15px; }
    .card { flex-direction: column; align-items: flex-start; padding: 12px; }
    .cardActions { margin-left: 0; margin-top: 12px; width: 100%; justify-content: space-between; }
    .cardActions button { flex: 1; }
  }
`;