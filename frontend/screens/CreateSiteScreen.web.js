// top of CreateSiteScreen.web.jsx
console.log('Using CreateSiteScreen.web.jsx');

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

// Web-version of CreateSiteScreen. This file is intentionally web-friendly and
// keeps the same behavior as mobile while using native DOM inputs for a better web UX.
export default function CreateSiteScreenWeb() {
  const { API_BASE_URL, user } = useAuth();
  const navigation = useNavigation();

  const [siteName, setSiteName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Supervisor Logic
  const [supervisorMode, setSupervisorMode] = useState('none'); // 'none', 'new', 'existing'
  const [supervisorUsername, setSupervisorUsername] = useState('');
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [showSupervisorPassword, setShowSupervisorPassword] = useState(false);

  const [existingSupervisors, setExistingSupervisors] = useState([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const clearToast = () => setTimeout(() => setToast(null), 3000);

  useEffect(() => {
    if (user && user.id) {
      fetchSupervisors();
    }
  }, [user]);

  const fetchSupervisors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`);
      if (res.data.success) {
        setExistingSupervisors(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  // replace the existing handleCreateSite with this version
  const handleCreateSite = async () => {
    if (!siteName.trim() || !location.trim()) {
      setToast({ type: 'error', msg: 'Please enter site name and location' });
      clearToast();
      return;
    }

    if (supervisorMode === 'new' && (!supervisorUsername.trim() || !supervisorPassword.trim())) {
      setToast({ type: 'error', msg: 'Please enter supervisor username and password' });
      clearToast();
      return;
    }

    if (supervisorMode === 'existing' && !selectedSupervisorId) {
      setToast({ type: 'error', msg: 'Please select a supervisor' });
      clearToast();
      return;
    }

    if (!user || !user.id) {
      setToast({ type: 'error', msg: 'User not available — please login again' });
      clearToast();
      return;
    }

    setLoading(true);
    try {
      const siteData = { siteName, location, description, adminId: user.id };

      if (supervisorMode === 'new') {
        siteData.supervisorUsername = supervisorUsername;
        siteData.supervisorPassword = supervisorPassword;
      } else if (supervisorMode === 'existing') {
        siteData.existingSupervisorId = selectedSupervisorId;
      }

      const res = await axios.post(`${API_BASE_URL}/api/sites`, siteData);
      console.log('Site creation response:', res.data);

      // Show success alert first (so user sees it) and then navigate to AdminDashboard
      window.alert('Site created successfully');

      // If you created a supervisor, also show credentials in the alert (optional)
      if (supervisorMode === 'new') {
        window.alert(
          `Supervisor credentials:\n\nUsername: ${supervisorUsername}\nPassword: ${supervisorPassword}\n\nSave these, the password won't be shown again.`
        );
      }

      // Navigate to Admin Dashboard
      // Use navigate instead of goBack to ensure the dashboard screen refreshes correctly
      navigation.navigate('AdminDashboard');

    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to create site';
      setToast({ type: 'error', msg });
      clearToast();
    } finally {
      setLoading(false);
    }
  };


  const onCancel = () => navigation.goBack();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onCancel} style={styles.backButton} aria-label="Go back">
            <Ionicons name="arrow-back" size={20} color="#333" />
          </button>
          <h1 style={styles.title}>Create New Site</h1>
        </div>
        <div />
      </header>
      <main style={styles.container}>
        <form
          style={styles.card}
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateSite();
          }}
        >
          <label style={styles.label}>
            <div>Site Name <span style={styles.required}>*</span></div>
            <input autoFocus
              style={styles.input}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Enter site name"
            />
          </label>

          <label style={styles.label}>
            <div>Location <span style={styles.required}>*</span></div>
            <input
              style={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
            />
          </label>

          <label style={styles.label}>
            <div>Description</div>
            <textarea rows={4}
              style={{ ...styles.input, height: 120, resize: 'vertical' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter site description"
            />
          </label>


          <div style={styles.sectionTitle}>Supervisor Assignment</div>

          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="supervisorMode"
                value="none"
                checked={supervisorMode === 'none'}
                onChange={() => setSupervisorMode('none')}
              />
              None
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="supervisorMode"
                value="new"
                checked={supervisorMode === 'new'}
                onChange={() => setSupervisorMode('new')}
              />
              Create New
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="supervisorMode"
                value="existing"
                checked={supervisorMode === 'existing'}
                onChange={() => setSupervisorMode('existing')}
              />
              Assign Existing
            </label>
          </div>

          {supervisorMode === 'new' && (
            <div style={styles.subSection}>
              <label style={styles.label}>
                <div>Supervisor Username <span style={styles.required}>*</span></div>
                <input
                  style={styles.input}
                  value={supervisorUsername}
                  onChange={(e) => setSupervisorUsername(e.target.value)}
                  placeholder="Supervisor username"
                  autoComplete="off"
                />
              </label>

              <label style={styles.label}>
                <div>Supervisor Password <span style={styles.required}>*</span></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    value={supervisorPassword}
                    onChange={(e) => setSupervisorPassword(e.target.value)}
                    placeholder="Password"
                    type={showSupervisorPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowSupervisorPassword(s => !s)}
                    style={styles.iconButton}
                  >
                    <Ionicons name={showSupervisorPassword ? 'eye' : 'eye-off'} size={18} color="#444" />
                  </button>
                </div>
              </label>
            </div>
          )}

          {supervisorMode === 'existing' && (
            <div style={styles.subSection}>
              <label style={styles.label}>
                <div>Select Supervisor <span style={styles.required}>*</span></div>
                <select
                  style={styles.select}
                  value={selectedSupervisorId}
                  onChange={(e) => setSelectedSupervisorId(e.target.value)}
                >
                  <option value="">-- Select a Supervisor --</option>
                  {existingSupervisors.map(sup => (
                    <option key={sup._id} value={sup._id}>
                      {sup.username} {sup.assignedSites?.length > 0 ? `(${sup.assignedSites.length} sites)` : '(No sites)'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div style={styles.actions}>
            <button type="submit" style={loading ? styles.primaryDisabled : styles.primary} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />Create Site</>}
            </button>

            <button type="button" style={styles.cancel} onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>

        {toast && (
          <div style={{ ...styles.toast, backgroundColor: toast.type === 'error' ? '#fee2e2' : '#ecfdf5', color: toast.type === 'error' ? '#991b1b' : '#065f46' }}>
            {toast.msg}
          </div>
        )}
      </main>

      <style>{`
        /* small global styles for inputs */
        input, textarea, select { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        button { font-family: inherit }
        .toast-enter { opacity: 0; transform: translateY(10px); }
        .toast-enter-active { opacity: 1; transform: translateY(0); transition: all 300ms; }
        .toast-exit { opacity: 1; transform: translateY(0); }
        .toast-exit-active { opacity: 0; transform: translateY(10px); transition: all 300ms; }
      `}</style>
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f6f9', overflow: 'hidden' },
  header: { background: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  backButton: { background: '#f4f6f9', border: '1px solid #e5e7eb', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  title: { color: '#1f2937', margin: 0, fontSize: 24, fontWeight: 700 },
  container: { maxWidth: 700, margin: '40px auto 80px', padding: '0 24px' },
  card: { background: '#fff', borderRadius: 12, padding: '24px 32px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 20 },
  cardSubtitle: { fontSize: 15, color: '#6b7280', marginTop: -12, marginBottom: 12, borderBottom: '1px solid #f4f6f9', paddingBottom: 20 },
  label: { display: 'flex', flexDirection: 'column', gap: 5, fontWeight: 600, color: '#374151', fontSize: 14 },
  required: { color: '#ef4444' },
  input: { padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, outline: 'none', background: '#fff', transition: 'border-color 0.2s, box-shadow 0.2s' },
  select: { padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, outline: 'none', background: '#fff', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%' },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: 8, cursor: 'pointer' },
  toggleLeft: { display: 'flex', alignItems: 'center', flex: 1 },
  toggleTitle: { fontWeight: 600, color: '#1f2937' },
  toggleSubtitle: { color: '#6b7280', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginTop: 10, marginBottom: 5 },
  radioGroup: { display: 'flex', gap: 20, marginBottom: 10 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#374151' },
  subSection: { padding: 16, background: '#f8fafc', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid #e2e8f0' },
  switchWrapper: { position: 'relative', display: 'inline-block', width: 40, height: 24 },
  switchInput: { opacity: 0, width: 0, height: 0 },
  switchSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ccc',
    transition: '.4s',
    borderRadius: 24,
  },
  iconButton: { background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actions: { display: 'flex', gap: 12, marginTop: 16, paddingTop: 24, borderTop: '1px solid #f4f6f9' },
  primary: { background: '#007bff', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight: 600, fontSize: 14, transition: 'background-color 0.2s' },
  primaryDisabled: { background: '#a0cfff', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', display: 'inline-flex', alignItems: 'center', fontWeight: 600, fontSize: 14, cursor: 'not-allowed' },
  cancel: { background: '#fff', border: '1px solid #d1d5db', color: '#374151', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight: 600, fontSize: 14, transition: 'background-color 0.2s' },
  toast: { position: 'fixed', right: 24, bottom: 24, padding: '12px 16px', borderRadius: 10, boxShadow: '0 8px 28px rgba(2,6,23,0.08)' }
};

// Add focus and hover styles dynamically
const dynamicStyles = `
  main { overflow-y: auto; flex: 1; }
  .styles-input:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  .styles-primary:hover:not(:disabled) {
    background-color: #005bb5;
  }
  .styles-cancel:hover:not(:disabled) {
    background-color: #f8fafc;
  }
  .styles-switch-input:checked + .styles-switch-slider {
    background-color: #007bff;
  }
  .styles-switch-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }
  .styles-switch-input:checked + .styles-switch-slider:before {
    transform: translateX(16px);
  }
`;

// Inject dynamic styles into the document head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = dynamicStyles.replace(/\.styles-/g, '.'); // Use a simple class prefix to avoid conflicts
document.head.appendChild(styleSheet);
