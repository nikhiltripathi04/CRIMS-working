import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function StaffDashboardWeb() {
  const { user, token, logout, API_BASE_URL } = useAuth();
  const navigation = useNavigation();

  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [attendanceType, setAttendanceType] = useState(null); // 'login' (In) or 'logout' (Out)
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  // Refs for Camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Attendance History
  const fetchMyRecords = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/my-records`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      const data = await response.json();
      if (data.success) {
        setAttendanceHistory(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch records", error);
    }
  }, [user, token, API_BASE_URL]);

  useEffect(() => {
    fetchMyRecords();
  }, [fetchMyRecords]);

  // --- 1. Camera & Location Logic ---

  // Function to fetch location specifically
  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by this browser.");
      return;
    }

    setFetchingLocation(true);
    // Reset previous location data while fetching new one
    setLocationData(prev => prev ? { ...prev, address: "Updating location..." } : null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Temporary object with coords
        const currentLoc = {
          latitude,
          longitude,
          accuracy,
          address: "Fetching address details...",
          timestamp: new Date().toISOString()
        };
        
        setLocationData(currentLoc);

        // Reverse Geocoding via Nominatim (OpenStreetMap)
        try {
          // Adding a timestamp to prevent caching
          const timestamp = new Date().getTime();
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&t=${timestamp}`, {
            headers: {
              'User-Agent': 'ConstructionApp/1.0' // It's good practice to identify the app
            }
          });
          const data = await response.json();
          
          if (data && data.display_name) {
            setLocationData(prev => ({
              ...prev,
              // Construct a cleaner address if possible, or use full display_name
              address: data.display_name
            }));
          } else {
            setLocationData(prev => ({
              ...prev,
              address: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)}`
            }));
          }
        } catch (geoError) {
          console.warn("Geocoding failed", geoError);
          setLocationData(prev => ({
            ...prev,
            address: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)} (Network Error)`
          }));
        } finally {
          setFetchingLocation(false);
        }
      },
      (err) => {
        console.warn(err);
        let msg = "Could not fetch location.";
        if (err.code === 1) msg = "Location permission denied.";
        if (err.code === 2) msg = "Position unavailable. Check GPS.";
        if (err.code === 3) msg = "Location request timed out.";
        
        setErrorMsg(msg);
        setFetchingLocation(false);
      },
      { 
        enableHighAccuracy: true, // Force GPS 
        timeout: 20000,           // Wait up to 20s for a good lock
        maximumAge: 0             // Do not use cached position
      }
    );
  }, []);

  const startAttendanceProcess = async (type) => {
    setAttendanceType(type);
    setCameraActive(true);
    setErrorMsg(null);
    setCapturedImage(null);
    setLocationData(null);

    try {
      // 1. Start Camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Prefer back camera on phones
      });
      streamRef.current = stream;
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);

      // 2. Start fetching location immediately
      fetchLocation();

    } catch (err) {
      console.error("Camera Error:", err);
      setErrorMsg("Camera access denied. Please allow camera permissions.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setCapturedImage(imageDataUrl);
      
      stopCamera();
    }
  };

  const cancelAttendance = () => {
    stopCamera();
    setCapturedImage(null);
    setAttendanceType(null);
    setErrorMsg(null);
  };

  // --- 2. Submission Logic ---

  const handleSubmitAttendance = async () => {
    if ((!locationData || fetchingLocation) && !errorMsg) {
        alert("Still fetching precise location... please wait a moment.");
        return;
    }
    
    if (!capturedImage) {
      alert("Photo required.");
      return;
    }

    if (!token) {
      alert("Authentication token missing. Please logout and login again.");
      return;
    }

    setLoading(true);

    try {
      const userIdVal = user.id || user._id;
      
      const payload = {
        type: attendanceType,
        photo: capturedImage,
        location: locationData, // Includes address now
        date: new Date().toISOString(),
        user: userIdVal,   
        userId: userIdVal, 
        tenant_id: user.tenant_id || user.tenantId || null
      };

      const response = await fetch(`${API_BASE_URL}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || errorJson.error || `Server error: ${response.status}`);
        } catch (e) {
            throw new Error(errorText || `Server error: ${response.status}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        window.alert(`Successfully Marked: ${attendanceType === 'login' ? 'Check In' : 'Check Out'}`);
        setCapturedImage(null);
        setAttendanceType(null);
        fetchMyRecords(); 
      } else {
        throw new Error(data.message || "Failed to submit attendance");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  if (!user) return null;

  return (
    <div style={styles.page}>
      <style>{globalStyles}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.titleBlock}>
          <h1 style={styles.title}>Staff Portal</h1>
          <p style={styles.subtitle}>Welcome, {user.fullName || user.username}</p>
        </div>
        <button style={styles.btnLogout} onClick={handleLogout} title="Logout">
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <span>Logout</span>
        </button>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        
        {/* VIEW 1: Dashboard / Selection Panel */}
        {!cameraActive && !capturedImage && (
          <div style={styles.attendanceCard}>
            <div style={styles.timeContainer}>
              <div style={styles.timeText}>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={styles.dateText}>
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div style={styles.actionContainer}>
              <button 
                style={{...styles.actionBtn, ...styles.btnIn}} 
                onClick={() => startAttendanceProcess('login')}
              >
                <div style={styles.iconCircleIn}>
                  <Ionicons name="enter" size={32} color="#10B981" />
                </div>
                <span style={styles.btnLabel}>Check In</span>
                <span style={styles.btnSubLabel}>Start your shift</span>
              </button>

              <button 
                style={{...styles.actionBtn, ...styles.btnOut}} 
                onClick={() => startAttendanceProcess('logout')}
              >
                <div style={styles.iconCircleOut}>
                  <Ionicons name="exit" size={32} color="#EF4444" />
                </div>
                <span style={styles.btnLabel}>Check Out</span>
                <span style={styles.btnSubLabel}>End your shift</span>
              </button>
            </div>

            {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

            {/* Recent Activity */}
            <div style={styles.historyContainer}>
                <h3 style={styles.historyTitle}>Recent Activity</h3>
                {attendanceHistory.length === 0 ? (
                    <p style={styles.emptyText}>No records found.</p>
                ) : (
                    <div style={styles.historyList}>
                        {attendanceHistory.slice(0, 5).map(record => (
                            <div key={record._id} style={styles.historyItem}>
                                <div style={{
                                    ...styles.historyIcon,
                                    backgroundColor: record.type === 'login' ? '#D1FAE5' : '#FEE2E2',
                                    color: record.type === 'login' ? '#059669' : '#DC2626'
                                }}>
                                    <Ionicons name={record.type === 'login' ? "enter" : "exit"} size={16} />
                                </div>
                                <div style={styles.historyContent}>
                                    <span style={styles.historyType}>{record.type === 'login' ? 'Checked In' : 'Checked Out'}</span>
                                    <span style={styles.historyLocation}>
                                      {record.location?.address || "Address unavailable"}
                                    </span>
                                </div>
                                <div style={styles.historyDate}>
                                    {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        )}

        {/* VIEW 2: Camera Active */}
        {cameraActive && !capturedImage && (
          <div style={styles.cameraContainer}>
            <div style={styles.cameraHeader}>
              <h3>Take Photo</h3>
              <p style={{fontSize: 13, color: '#666', margin: '4px 0'}}>Please stand at the site.</p>
            </div>
            
            <div style={styles.videoWrapper}>
              <video ref={videoRef} style={styles.video} playsInline muted autoPlay></video>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </div>

            <div style={styles.locationStatus}>
                {fetchingLocation ? (
                    <span style={{color: '#E69138', display:'flex', alignItems:'center', gap: 6}}>
                       <Ionicons name="sync" className="spin" /> Getting high accuracy location...
                    </span>
                ) : locationData ? (
                    <span style={{color: '#10B981', display:'flex', alignItems:'center', gap: 6}}>
                        <Ionicons name="location" /> Location Locked ({locationData.accuracy ? Math.round(locationData.accuracy) + 'm accuracy' : 'GPS'})
                    </span>
                ) : (
                    <span style={{color: '#EF4444'}}>Location not found</span>
                )}
            </div>

            <div style={styles.cameraControls}>
              <button style={styles.btnCancel} onClick={cancelAttendance}>Cancel</button>
              <button style={styles.btnCapture} onClick={takePhoto}>
                <div style={styles.captureInnerRing}></div>
              </button>
              <div style={{width: 60}}></div> 
            </div>
          </div>
        )}

        {/* VIEW 3: Preview & Submit */}
        {capturedImage && (
          <div style={styles.previewContainer}>
            <div style={styles.previewHeader}>
              <h3>Confirm Attendance</h3>
              <span style={{...styles.badgeType, backgroundColor: attendanceType === 'login' ? '#10B981' : '#EF4444'}}>
                {attendanceType === 'login' ? 'CHECK IN' : 'CHECK OUT'}
              </span>
            </div>

            <div style={styles.imageWrapper}>
                <img src={capturedImage} alt="Attendance" style={styles.previewImage} />
            </div>

            <div style={styles.detailsCard}>
              <div style={styles.detailRow}>
                <Ionicons name="time-outline" size={18} color="#6B7280" />
                <span>{new Date().toLocaleString()}</span>
              </div>
              <div style={styles.detailRow}>
                <Ionicons name="location-outline" size={18} color="#6B7280" />
                <div style={{flex: 1}}>
                  <span style={{fontSize: 13, wordBreak: 'break-word', lineHeight: '1.4', display: 'block'}}>
                    {locationData && locationData.address ? 
                      locationData.address
                      : fetchingLocation ? <span style={{color: 'orange'}}>Refining address...</span> : <span style={{color: 'red'}}>Address unavailable</span>
                    }
                  </span>
                  {locationData && (
                     <span style={{fontSize: 11, color: '#9ca3af'}}>
                        Accuracy: {locationData.accuracy ? `~${Math.round(locationData.accuracy)}m` : 'Unknown'}
                     </span>
                  )}
                </div>
                <button onClick={fetchLocation} style={styles.refreshBtn} title="Refresh Location">
                    <Ionicons name={fetchingLocation ? "sync" : "refresh"} size={16} color="#7C3AED" />
                </button>
              </div>
            </div>

            <div style={styles.previewControls}>
              <button style={styles.btnRetake} onClick={() => startAttendanceProcess(attendanceType)} disabled={loading}>
                Retake
              </button>
              <button style={styles.btnSubmit} onClick={handleSubmitAttendance} disabled={loading || fetchingLocation}>
                {loading ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// --- Styles ---

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  header: {
    backgroundColor: '#7C3AED', // Deep Purple
    color: 'white',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    zIndex: 10,
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    opacity: 0.9,
    margin: '4px 0 0 0',
  },
  btnLogout: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.2s',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflowY: 'auto',
  },
  
  // --- Dashboard Card ---
  attendanceCard: {
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '40px 30px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
  },
  timeContainer: {
    textAlign: 'center',
  },
  timeText: {
    fontSize: '48px',
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: '-2px',
    lineHeight: 1,
  },
  dateText: {
    fontSize: '16px',
    color: '#6b7280',
    marginTop: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
  },
  actionContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    textAlign: 'left',
    position: 'relative',
    overflow: 'hidden',
  },
  btnIn: {
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },
  btnOut: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  iconCircleIn: {
    width: 48, height: 48, borderRadius: '12px',
    backgroundColor: '#10B981',
    color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginRight: '20px',
    flexShrink: 0,
  },
  iconCircleOut: {
    width: 48, height: 48, borderRadius: '12px',
    backgroundColor: '#EF4444',
    color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginRight: '20px',
    flexShrink: 0,
  },
  btnLabel: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1F2937',
    display: 'block',
  },
  btnSubLabel: {
    fontSize: '13px',
    color: '#6B7280',
    marginTop: '2px',
    display: 'block',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    textAlign: 'center',
    width: '100%',
    border: '1px solid #FECACA',
  },

  // --- History Section ---
  historyContainer: {
    width: '100%',
    marginTop: '10px',
    borderTop: '1px solid #f3f4f6',
    paddingTop: '20px',
  },
  historyTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '16px',
    textAlign: 'left',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  historyIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
  },
  historyContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  historyType: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
  },
  historyTime: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  historyLocation: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px',
    maxWidth: '150px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  historyDate: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: '500',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '14px',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // --- Camera View ---
  cameraContainer: {
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    height: '100%',
    maxHeight: '90vh',
    alignItems: 'center',
  },
  cameraHeader: {
    textAlign: 'center',
    color: '#374151',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: '3/4',
    backgroundColor: 'black',
    borderRadius: '20px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  locationStatus: {
    fontSize: '13px',
    fontWeight: '500',
    marginTop: '-10px',
    marginBottom: '10px',
  },
  cameraControls: {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: '20px',
  },
  btnCapture: {
    width: 70,
    height: 70,
    borderRadius: '50%',
    backgroundColor: 'white',
    border: '4px solid #e5e7eb',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: 0,
  },
  captureInnerRing: {
    width: 54,
    height: 54,
    borderRadius: '50%',
    backgroundColor: '#7C3AED',
  },
  btnCancel: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },

  // --- Preview View ---
  previewContainer: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '24px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '10px',
    borderBottom: '1px solid #f3f4f6',
  },
  badgeType: {
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: '4/3',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  detailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid #E5E7EB',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '15px',
    color: '#374151',
    fontWeight: '500',
  },
  refreshBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  detailNote: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px',
    fontStyle: 'italic',
    display: 'flex',
    alignItems: 'center',
  },
  previewControls: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  btnSubmit: {
    flex: 2,
    padding: '14px',
    backgroundColor: '#10B981', // Green
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
    transition: 'background 0.2s',
  },
  btnRetake: {
    flex: 1,
    padding: '14px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #D1D5DB',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

const globalStyles = `
  button:active { transform: scale(0.98); }
  h1, h3, p { margin: 0; }
  button:disabled { opacity: 0.7; cursor: not-allowed; }
  .btnSubmit:hover { background-color: #059669; }
  @keyframes spin { 100% { -webkit-transform: rotate(360deg); transform:rotate(360deg); } }
  .spin { animation: spin 1.5s linear infinite; }
`;