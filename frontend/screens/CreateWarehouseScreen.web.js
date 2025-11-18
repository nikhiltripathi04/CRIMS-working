// top of CreateWarehouseScreen.web.jsx
console.log('Using CreateWarehouseScreen.web.jsx');

import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

export default function CreateWarehouseScreenWeb() {
  const { API_BASE_URL, user } = useAuth();
  const navigation = useNavigation();

  const [warehouseName, setWarehouseName] = useState('');
  const [location, setLocation] = useState('');
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [showManagerPassword, setShowManagerPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const clearToast = () => setTimeout(() => setToast(null), 3000);

  const handleCreateWarehouse = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!warehouseName.trim() || !location.trim() || !managerUsername.trim() || !managerPassword.trim()) {
      setToast({ type: 'error', msg: 'Please fill in all the fields' });
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
      const payload = {
        warehouseName,
        location,
        managerUsername,
        managerPassword,
        adminId: user.id
      };

      const res = await axios.post(`${API_BASE_URL}/api/warehouses`, payload);
      console.log('Create warehouse response', res.data);

      // Show success alert then navigate back to AdminDashboard
      window.alert('Warehouse created successfully');

      // Show manager credentials in a separate alert so user can copy them
      window.alert(`Manager credentials:\nUsername: ${managerUsername}\nPassword: ${managerPassword}`);

      // Navigate to AdminDashboard
      navigation.navigate('AdminDashboard');

    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to create warehouse';
      setToast({ type: 'error', msg });
      clearToast();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page} className="styles">
      <header style={styles.header} className="styles">
        <div style={styles.headerLeft}>
          <button onClick={() => navigation.goBack()} style={styles.backButton} aria-label="Go back">
            <Ionicons name="arrow-back" size={20} color="#333" />
          </button>
          <h1 style={styles.title}>Create New Warehouse</h1>
        </div>
        <div />
      </header>
      <main style={styles.container} className="styles">
        <form style={styles.card} onSubmit={handleCreateWarehouse} className="styles">
          <label style={styles.label}>
            <div>Warehouse Name <span style={styles.required}>*</span></div>
            <input autoFocus style={styles.input} value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} placeholder="Enter warehouse name" />
          </label>

          <label style={styles.label}>
            Location <span style={styles.required}>*</span>
            <input style={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Enter location" />
          </label>

          <label style={styles.label}>
            <div>Manager Username <span style={styles.required}>*</span></div>
            <input style={styles.input} value={managerUsername} onChange={(e) => setManagerUsername(e.target.value)} placeholder="Manager username" autoComplete="off" />
          </label>

          <label style={styles.label}>
            <div>Manager Password <span style={styles.required}>*</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                type={showManagerPassword ? 'text' : 'password'}
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                placeholder="Set password for manager"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowManagerPassword(s => !s)} style={styles.iconButton} aria-label="Toggle password visibility">
                <Ionicons name={showManagerPassword ? 'eye' : 'eye-off'} size={18} color="#444" />
              </button>
            </div>
          </label>

          <div style={styles.actions}>
            <button type="submit" style={loading ? styles.primaryDisabled : styles.primary} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="add-circle-outline" size={16} color="#fff" style={{ marginRight: 8 }} />Create Warehouse</>)}
            </button>

            <button type="button" style={styles.cancel} onClick={() => navigation.goBack()} disabled={loading} className="styles">
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
        .styles input, .styles textarea { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .styles button { font-family: inherit }
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
  label: { display: 'flex', flexDirection: 'column', gap: 5, fontWeight: 600, color: '#374151', fontSize: 14 },
  required: { color: '#ef4444' },
  input: { padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, outline: 'none', background: '#fff', transition: 'border-color 0.2s, box-shadow 0.2s' },
  iconButton: { background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actions: { display: 'flex', gap: 12, marginTop: 16, paddingTop: 24, borderTop: '1px solid #f4f6f9' },
  primary: { background: '#e69138ff', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight: 600, fontSize: 14, transition: 'background-color 0.2s' },
  primaryDisabled: { background: '#a0cfff', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', display: 'inline-flex', alignItems: 'center', fontWeight: 600, fontSize: 14, cursor: 'not-allowed' },
  cancel: { background: '#fff', border: '1px solid #d1d5db', color: '#374151', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight: 600, fontSize: 14, transition: 'background-color 0.2s' },
  toast: { position: 'fixed', right: 24, bottom: 24, padding: '12px 16px', borderRadius: 10, boxShadow: '0 8px 28px rgba(2,6,23,0.08)' }
};

// Add focus and hover styles dynamically
const dynamicStyles = `
  .styles main { overflow-y: auto; flex: 1; }
  .styles .input:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  .styles .primary:hover:not(:disabled) {
    background-color: #005bb5;
  }
  .styles .cancel:hover:not(:disabled) {
    background-color: #f8fafc;
  }
  .styles .switch-input:checked + .switch-slider {
    background-color: #007bff;
  }
  .styles .switch-slider:before {
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
  .styles .switch-input:checked + .switch-slider:before {
    transform: translateX(16px);
  }
`;

// Inject dynamic styles into the document head
if (typeof window !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = dynamicStyles;
  document.head.appendChild(styleSheet);
}
