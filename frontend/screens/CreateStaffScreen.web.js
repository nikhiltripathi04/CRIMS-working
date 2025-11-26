// src/screens/CreateStaffScreen.web.js
console.log('Using CreateStaffScreen.web.js');

import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native'; // Keeping for ActivityIndicator
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';

export default function CreateStaffScreenWeb() {
  const { API_BASE_URL, token } = useAuth(); // We need 'token' for the Authorization header
  const navigation = useNavigation();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const clearToast = () => setTimeout(() => setToast(null), 3000);

  const handleCreateStaff = async () => {
    // 1. Validation
    if (!fullName.trim()) {
      setToast({ type: 'error', msg: 'Please enter a full name' });
      clearToast();
      return;
    }
    if (!username.trim()) {
      setToast({ type: 'error', msg: 'Please enter a username' });
      clearToast();
      return;
    }
    if (!password.trim()) {
      setToast({ type: 'error', msg: 'Please enter a password' });
      clearToast();
      return;
    }

    if (!token) {
      setToast({ type: 'error', msg: 'Authentication token missing. Please login again.' });
      clearToast();
      return;
    }

    setLoading(true);

    try {
      // 2. API Call
      const staffData = {
        fullName: fullName.trim(),
        username: username.trim(),
        password: password.trim()
      };

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const res = await axios.post(`${API_BASE_URL}/api/staff`, staffData, config);
      console.log('Staff creation response:', res.data);

      // 3. Success Handling
      window.alert(`Staff member created successfully!\n\nUsername: ${username}\nPassword: ${password}`);
      
      navigation.navigate('AdminDashboard');

    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to create staff member';
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
          <h1 style={styles.title}>Create Staff Member</h1>
        </div>
        <div />
      </header>
      
      <main style={styles.container}>
        <form
          style={styles.card}
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateStaff();
          }}
        > 
          <div style={styles.cardHeader}>
             <div style={styles.iconCircle}>
               <Ionicons name="person" size={24} color="#007bff" />
             </div>
             <div>
               <h2 style={styles.cardTitle}>Staff Details</h2>
               <p style={styles.cardSubtitle}>Create a new account for general staff access.</p>
             </div>
          </div>

          <label style={styles.label}>
            <div>Full Name <span style={styles.required}>*</span></div>
            <input autoFocus
              style={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </label>

          <label style={styles.label}>
            <div>Username <span style={styles.required}>*</span></div>
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. johndoe"
              autoComplete="off"
            />
          </label>

          <label style={styles.label}>
            <div>Password <span style={styles.required}>*</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...styles.input, flex: 1 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
              />

              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setShowPassword(s => !s)}
                style={styles.iconButton}
              >
                <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={18} color="#444" />
              </button>
            </div>
          </label>

          <div style={styles.actions}>
            <button type="submit" style={loading ? styles.primaryDisabled : styles.primary} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" /> 
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  Create Staff Member
                </>
              )}
            </button>

            <button type="button" style={styles.cancel} onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>

        {toast && (
          <div style={{ 
            ...styles.toast, 
            backgroundColor: toast.type === 'error' ? '#fee2e2' : '#ecfdf5', 
            color: toast.type === 'error' ? '#991b1b' : '#065f46' 
          }}>
            {toast.msg}
          </div>
        )}
      </main>

      {/* Dynamic styles injection for focus states */}
      <style>{`
        input, textarea { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        button { font-family: inherit }
        
        .toast-enter { opacity: 0; transform: translateY(10px); }
        .toast-enter-active { opacity: 1; transform: translateY(0); transition: all 300ms; }
        
        input:focus {
          border-color: #007bff !important;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1) !important;
        }
        
        button[type="submit"]:hover:not(:disabled) {
          background-color: #005bb5 !important;
        }
        
        button[type="button"]:hover:not(:disabled) {
           background-color: #f8fafc; /* For cancel/icon buttons */
        }
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
  container: { maxWidth: 600, margin: '40px auto 80px', padding: '0 24px', width: '100%', overflowY: 'auto' },
  card: { background: '#fff', borderRadius: 12, padding: '24px 32px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 20 },
  
  cardHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 },
  iconCircle: { width: 48, height: 48, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' },
  cardSubtitle: { margin: '4px 0 0 0', fontSize: 14, color: '#6b7280' },

  label: { display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600, color: '#374151', fontSize: 14 },
  required: { color: '#ef4444' },
  input: { padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 15, outline: 'none', background: '#fff', transition: 'border-color 0.2s, box-shadow 0.2s' },
  
  iconButton: { background: 'transparent', border: '1px solid #d1d5db', borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  actions: { display: 'flex', gap: 12, marginTop: 16, paddingTop: 24, borderTop: '1px solid #f4f6f9' },
  primary: { background: '#007bff', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, transition: 'background-color 0.2s' },
  primaryDisabled: { background: '#a0cfff', color: '#fff', padding: '10px 16px', borderRadius: 8, border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, cursor: 'not-allowed' },
  cancel: { background: '#fff', border: '1px solid #d1d5db', color: '#374151', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, transition: 'background-color 0.2s' },
  
  toast: { position: 'fixed', right: 24, bottom: 24, padding: '12px 16px', borderRadius: 10, boxShadow: '0 8px 28px rgba(2,6,23,0.08)', fontWeight: 500, zIndex: 100 }
};