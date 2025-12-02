import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import {
  IoLogOutOutline,
  IoSearchOutline,
  IoRefresh,
  IoAddCircleOutline,
  IoPeopleOutline,
  IoCubeOutline,
  IoLocationOutline,
  IoBriefcaseOutline,
  IoVideocamOutline,
  IoChevronForward,
  IoTrashOutline,
  IoOpenOutline,
  IoTimeOutline,
  IoCartOutline,
  IoMegaphoneOutline,
  IoArrowBack,
  IoSync,
  IoLocation
} from 'react-icons/io5';

// --- SUB-COMPONENT: MESSAGES SECTION ---
const MessageSection = ({ site, user, API_BASE_URL, onBack }) => {
  const [messageText, setMessageText] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = async () => {
    if (!messageText && !videoLink) {
      return alert('Please enter a message or video link');
    }
    setSending(true);
    try {
      await axios.post(`${API_BASE_URL}/api/messages/send`, {
        siteId: site._id,
        content: messageText,
        videoUrl: videoLink
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Message sent to Admin');
      setMessageText('');
      setVideoLink('');
    } catch (error) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onBack} style={styles.iconButton}><IoArrowBack size={20} /></button>
          <h2 style={styles.panelTitle}>Message Admin</h2>
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Message / Report</label>
          <textarea
            style={{ ...styles.input, height: '100px', resize: 'vertical' }}
            placeholder="Type your message here..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Video Link (Optional)</label>
          <input
            style={styles.input}
            placeholder="Paste video URL..."
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
          />
        </div>
        <button style={styles.primaryBtn} onClick={sendMessage} disabled={sending}>
          {sending ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: SUPPLIES SECTION ---
const SuppliesSection = ({ site, user, API_BASE_URL, onBack }) => {
  const [tab, setTab] = useState('request'); // 'request' or 'status'
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [availableSupplies, setAvailableSupplies] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load Warehouses
  useEffect(() => {
    if (tab === 'request') {
      const fetchWarehouses = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/warehouses?adminId=${site.adminId}`);
          if (res.data.success) setWarehouses(res.data.data);
        } catch (e) { console.error(e); }
      };
      fetchWarehouses();
    } else {
      fetchRequests();
    }
  }, [tab, site, API_BASE_URL]);

  // Load Supplies when Warehouse Selected
  useEffect(() => {
    if (selectedWarehouse) {
      const wh = warehouses.find(w => w._id === selectedWarehouse);
      if (wh) setAvailableSupplies(wh.supplies || []);
    }
  }, [selectedWarehouse, warehouses]);

  const addToCart = (item, qty) => {
    if (qty <= 0) return;
    setCart([...cart, { ...item, requestQty: qty }]);
    alert(`${qty} ${item.unit} of ${item.itemName} added to list.`);
  };

  const submitOrder = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    setLoading(true);
    try {
      const payload = {
        warehouseId: selectedWarehouse,
        items: cart.map(i => ({ itemName: i.itemName, quantity: parseInt(i.requestQty), unit: i.unit }))
      };
      await axios.post(`${API_BASE_URL}/api/sites/${site._id}/supply-requests/bulk`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Supply request sent!');
      setCart([]);
      setTab('status');
    } catch (e) {
      alert('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sites/${site._id}/supply-requests`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.success) setRequests(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredSupplies = availableSupplies.filter(s => s.itemName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onBack} style={styles.iconButton}><IoArrowBack size={20} /></button>
          <h2 style={styles.panelTitle}>Supplies Hub</h2>
        </div>
        <div style={styles.tabContainer}>
          <button
            style={tab === 'request' ? styles.activeTab : styles.tab}
            onClick={() => setTab('request')}
          >
            Request
          </button>
          <button
            style={tab === 'status' ? styles.activeTab : styles.tab}
            onClick={() => setTab('status')}
          >
            Status
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {tab === 'request' ? (
          <div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Select Warehouse</label>
              <select
                style={styles.select}
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(wh => (
                  <option key={wh._id} value={wh._id}>{wh.warehouseName}</option>
                ))}
              </select>
            </div>

            {selectedWarehouse && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Search Supplies</label>
                  <div style={styles.searchContainer}>
                    <IoSearchOutline color="#666" />
                    <input
                      style={styles.searchInput}
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div style={styles.listContainer}>
                  {filteredSupplies.map((item, index) => (
                    <div key={index} style={styles.listItem}>
                      <div style={styles.listContent}>
                        <div style={styles.listTitle}>{item.itemName}</div>
                        <div style={styles.listSubtitle}>Available: {item.quantity} {item.unit}</div>
                      </div>
                      <button
                        style={styles.actionButtonSmall}
                        onClick={() => addToCart(item, 1)}
                      >
                        <IoAddCircleOutline size={18} style={{ marginRight: '4px' }} /> Add
                      </button>
                    </div>
                  ))}
                </div>

                {cart.length > 0 && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                    <h3 style={styles.panelTitle}>Cart ({cart.length})</h3>
                    <ul style={{ paddingLeft: '20px', color: '#555', fontSize: '14px' }}>
                      {cart.map((c, i) => (
                        <li key={i}>{c.itemName} - {c.requestQty} {c.unit}</li>
                      ))}
                    </ul>
                    <button style={styles.primaryBtn} onClick={submitOrder} disabled={loading}>
                      {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={styles.listContainer}>
            {loading ? <p>Loading...</p> : requests.map(item => (
              <div key={item._id} style={styles.listItem}>
                <div style={styles.listContent}>
                  <div style={styles.listTitle}>{item.itemName}</div>
                  <div style={styles.listSubtitle}>
                    Req: {item.requestedQuantity} {item.unit} • {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor:
                      item.status === 'approved' ? '#d4edda' :
                        item.status === 'rejected' ? '#f8d7da' :
                          item.status === 'in_transit' ? '#cce5ff' : '#fff3cd',
                    color:
                      item.status === 'approved' ? '#155724' :
                        item.status === 'rejected' ? '#721c24' :
                          item.status === 'in_transit' ? '#004085' : '#856404'
                  }}>
                    {item.status.toUpperCase().replace('_', ' ')}
                  </span>
                  {item.status === 'approved' && item.transferredQuantity < item.requestedQuantity && (
                    <div style={{ fontSize: '11px', color: '#dc3545', marginTop: '4px' }}>
                      Partial: {item.transferredQuantity} sent
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!loading && requests.length === 0 && <EmptyState text="No requests found" />}
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function SupervisorDashboardWeb() {
  const { user, API_BASE_URL, logout, token } = useAuth();
  const navigation = useNavigation();

  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, messages, supplies
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(false);

  // Attendance State
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [attendanceType, setAttendanceType] = useState(null); // 'login' (In) or 'logout' (Out)
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Refs for Camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Load available sites for supervisor
  useEffect(() => {
    if (user?.assignedSites?.length > 0) {
      if (typeof user.assignedSites[0] === 'object') {
        setSites(user.assignedSites);
        setSelectedSiteId(user.assignedSites[0]._id);
      }
    } else if (user?.siteId) {
      setSelectedSiteId(user.siteId._id || user.siteId);
    }
  }, [user]);

  // Fetch specific site details when selection changes
  const fetchSiteData = useCallback(async () => {
    if (selectedSiteId) {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_BASE_URL}/api/sites/${selectedSiteId}?supervisorId=${user.id}`
        );
        if (response.data.success) {
          setSite(response.data.data);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [selectedSiteId, API_BASE_URL, user.id]);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);

  // --- ATTENDANCE LOGIC ---

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by this browser.");
      return;
    }

    setFetchingLocation(true);
    setLocationData(prev => prev ? { ...prev, address: "Updating location..." } : null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        const currentLoc = {
          latitude,
          longitude,
          accuracy,
          address: "Fetching address details...",
          timestamp: new Date().toISOString()
        };

        setLocationData(currentLoc);

        // Reverse Geocoding
        try {
          const timestamp = new Date().getTime();
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&t=${timestamp}`, {
            headers: { 'User-Agent': 'ConstructionApp/1.0' }
          });
          const data = await response.json();

          if (data && data.display_name) {
            setLocationData(prev => ({ ...prev, address: data.display_name }));
          } else {
            setLocationData(prev => ({ ...prev, address: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)}` }));
          }
        } catch (geoError) {
          console.warn("Geocoding failed", geoError);
          setLocationData(prev => ({ ...prev, address: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)} (Network Error)` }));
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
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, []);

  const startAttendanceProcess = async (type) => {
    setAttendanceType(type);
    setCameraActive(true);
    setErrorMsg(null);
    setCapturedImage(null);
    setLocationData(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);

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

  const handleSubmitAttendance = async () => {
    if ((!locationData || fetchingLocation) && !errorMsg) {
      alert("Still fetching precise location... please wait a moment.");
      return;
    }

    if (!capturedImage) return alert("Photo required.");
    if (!token) return alert("Authentication token missing.");

    setAttendanceLoading(true);

    try {
      const userIdVal = user.id || user._id;

      const payload = {
        type: attendanceType,
        photo: capturedImage,
        location: locationData,
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

      const data = await response.json();

      if (data.success) {
        alert(`Successfully Marked: ${attendanceType === 'login' ? 'Check In' : 'Check Out'}`);
        setCapturedImage(null);
        setAttendanceType(null);
        // Refresh site data to update attendance stats if needed
        fetchSiteData();
      } else {
        throw new Error(data.message || "Failed to submit attendance");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) logout();
  };

  const getSuppliesStats = () => {
    if (!site || !site.supplies) return { items: 0 };
    return { items: site.supplies.length };
  };

  const getAttendancePercentage = () => {
    if (!site || !site.workers || site.workers.length === 0) return 0;
    const today = new Date().toDateString();
    let present = 0;
    site.workers.forEach(w => {
      const att = w.attendance?.find(a => new Date(a.date).toDateString() === today);
      if (att && att.status === 'present') present++;
    });
    return Math.round((present / site.workers.length) * 100);
  };

  if (!user) return null;
  if (loading && !site) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Site Data...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Supervisor Dashboard</h1>
          <span style={styles.roleBadge}>SUPERVISOR</span>
        </div>

        <div style={styles.headerRight}>
          <div style={{ marginRight: '15px', fontSize: '14px', color: '#555' }}>
            Logged in as: <strong>{user.username}</strong>
          </div>
          <button onClick={fetchSiteData} style={styles.iconButton} title="Refresh">
            <IoRefresh size={22} className={loading ? 'spin' : ''} />
          </button>
          <button onClick={handleLogout} style={styles.logoutButton} title="Logout">
            <IoLogOutOutline size={22} color="#fff" />
          </button>
        </div>
      </header>

      <main style={styles.content}>

        {/* Site Selection Tabs */}
        {sites.length > 1 && !cameraActive && !capturedImage && (
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
            {sites.map(s => (
              <button
                key={s._id}
                style={selectedSiteId === s._id ? styles.siteTabActive : styles.siteTab}
                onClick={() => setSelectedSiteId(s._id)}
              >
                {s.siteName}
              </button>
            ))}
          </div>
        )}

        {/* --- CAMERA VIEW --- */}
        {cameraActive && !capturedImage && (
          <div style={styles.overlayContainer}>
            <div style={styles.cameraCard}>
              <div style={styles.cameraHeader}>
                <h3>Take Photo</h3>
                <p style={{ fontSize: '13px', color: '#666', margin: '4px 0' }}>Please stand at the site.</p>
              </div>

              <div style={styles.videoWrapper}>
                <video ref={videoRef} style={styles.video} playsInline muted autoPlay></video>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              </div>

              <div style={styles.locationStatus}>
                {fetchingLocation ? (
                  <span style={{ color: '#E69138', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IoSync className="spin" /> Getting high accuracy location...
                  </span>
                ) : locationData ? (
                  <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IoLocation /> Location Locked ({locationData.accuracy ? Math.round(locationData.accuracy) + 'm accuracy' : 'GPS'})
                  </span>
                ) : (
                  <span style={{ color: '#EF4444' }}>Location not found</span>
                )}
              </div>

              <div style={styles.cameraControls}>
                <button style={styles.btnCancel} onClick={cancelAttendance}>Cancel</button>
                <button style={styles.btnCapture} onClick={takePhoto}>
                  <div style={styles.captureInnerRing}></div>
                </button>
                <div style={{ width: 60 }}></div>
              </div>
            </div>
          </div>
        )}

        {/* --- PREVIEW VIEW --- */}
        {capturedImage && (
          <div style={styles.overlayContainer}>
            <div style={styles.previewCard}>
              <div style={styles.previewHeader}>
                <h3>Confirm Attendance</h3>
                <span style={{ ...styles.badgeType, backgroundColor: attendanceType === 'login' ? '#10B981' : '#EF4444' }}>
                  {attendanceType === 'login' ? 'CHECK IN' : 'CHECK OUT'}
                </span>
              </div>

              <div style={styles.imageWrapper}>
                <img src={capturedImage} alt="Attendance" style={styles.previewImage} />
              </div>

              <div style={styles.detailsCard}>
                <div style={styles.detailRow}>
                  <IoTimeOutline size={18} color="#6B7280" />
                  <span>{new Date().toLocaleString()}</span>
                </div>
                <div style={styles.detailRow}>
                  <IoLocationOutline size={18} color="#6B7280" />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '13px', wordBreak: 'break-word', lineHeight: '1.4', display: 'block' }}>
                      {locationData && locationData.address ?
                        locationData.address
                        : fetchingLocation ? <span style={{ color: 'orange' }}>Refining address...</span> : <span style={{ color: 'red' }}>Address unavailable</span>
                      }
                    </span>
                    {locationData && (
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                        Accuracy: {locationData.accuracy ? `~${Math.round(locationData.accuracy)}m` : 'Unknown'}
                      </span>
                    )}
                  </div>
                  <button onClick={fetchLocation} style={styles.refreshBtn} title="Refresh Location">
                    <IoSync size={16} color="#7C3AED" className={fetchingLocation ? 'spin' : ''} />
                  </button>
                </div>
              </div>

              <div style={styles.previewControls}>
                <button style={styles.btnRetake} onClick={() => startAttendanceProcess(attendanceType)} disabled={attendanceLoading}>
                  Retake
                </button>
                <button style={styles.btnSubmit} onClick={handleSubmitAttendance} disabled={attendanceLoading || fetchingLocation}>
                  {attendanceLoading ? 'Submitting...' : 'Confirm & Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DASHBOARD CONTENT --- */}
        {site && !cameraActive && !capturedImage && (
          <>
            {/* --- Quick Stats Row --- */}
            <div style={styles.statsRow}>
              <StatCard
                icon={<IoLocationOutline />}
                color="#007bff"
                count={site.siteName}
                label={site.location}
                isText
              />
              <StatCard
                icon={<IoCubeOutline />}
                color="#17a2b8"
                count={getSuppliesStats().items}
                label="Inventory Items"
              />
              <StatCard
                icon={<IoPeopleOutline />}
                color="#28a745"
                count={`${getAttendancePercentage()}%`}
                label="Worker Attendance"
              />
            </div>

            {/* --- Attendance Action Row --- */}
            <div style={styles.actionToolbar}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <ActionButton
                  label="Check In"
                  icon={<IoTimeOutline />}
                  color="#28a745"
                  onClick={() => startAttendanceProcess('login')}
                  disabled={attendanceLoading}
                />
                <ActionButton
                  label="Check Out"
                  icon={<IoLogOutOutline />}
                  color="#dc3545"
                  onClick={() => startAttendanceProcess('logout')}
                  disabled={attendanceLoading}
                />
              </div>
            </div>

            {/* --- Main Content Area --- */}
            {currentView === 'dashboard' ? (
              <div style={styles.gridContainer}>

                {/* Left Column: Quick Actions */}
                <div style={styles.column}>
                  <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                      <h2 style={styles.panelTitle}>Quick Actions</h2>
                    </div>
                    <div style={styles.listContainer}>
                      <ListItem
                        title="Message Admin"
                        subtitle="Send text or video updates"
                        icon={<IoVideocamOutline color="#007bff" size={20} />}
                        onOpen={() => setCurrentView('messages')}
                        hideDelete
                      />
                      <ListItem
                        title="Supplies Hub"
                        subtitle="Request items & check status"
                        icon={<IoCartOutline color="#17a2b8" size={20} />}
                        onOpen={() => setCurrentView('supplies')}
                        hideDelete
                      />
                      <ListItem
                        title="Manage Workers"
                        subtitle="Worker list & attendance"
                        icon={<IoPeopleOutline color="#28a745" size={20} />}
                        onOpen={() => navigation.navigate('ManageWorkers', { site, canEdit: true })}
                        hideDelete
                      />
                      <ListItem
                        title="Announcements"
                        subtitle="View admin updates"
                        icon={<IoMegaphoneOutline color="#ff6b35" size={20} />}
                        onOpen={() => navigation.navigate('Announcements', { site, canEdit: true })}
                        hideDelete
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Site Info / Placeholder */}
                <div style={styles.column}>
                  <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                      <h2 style={styles.panelTitle}>Site Overview</h2>
                    </div>
                    <div style={{ padding: '20px', color: '#666' }}>
                      <p><strong>Site Name:</strong> {site.siteName}</p>
                      <p><strong>Location:</strong> {site.location}</p>
                      <p><strong>Workers:</strong> {site.workers?.length || 0}</p>
                      <p><strong>Supervisors:</strong> {site.supervisors?.length || 0}</p>
                    </div>
                  </div>
                </div>

              </div>
            ) : currentView === 'messages' ? (
              <MessageSection site={site} user={user} API_BASE_URL={API_BASE_URL} onBack={() => setCurrentView('dashboard')} />
            ) : (
              <SuppliesSection site={site} user={user} API_BASE_URL={API_BASE_URL} onBack={() => setCurrentView('dashboard')} />
            )}
          </>
        )}

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

const StatCard = ({ icon, color, count, label, isText }) => (
  <div style={styles.statCard}>
    <div style={{ ...styles.statIcon, color, backgroundColor: `${color}15` }}>{icon}</div>
    <div>
      <div style={isText ? styles.statText : styles.statCount}>{count}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  </div>
);

const ActionButton = ({ label, icon, color, onClick, disabled }) => (
  <button
    style={{ ...styles.actionButton, color, borderColor: color, opacity: disabled ? 0.6 : 1 }}
    onClick={onClick}
    disabled={disabled}
  >
    <span style={{ marginRight: '6px', display: 'flex' }}>{icon}</span>
    {label}
  </button>
);

const ListItem = ({ title, subtitle, icon, onOpen, hideDelete }) => (
  <div style={styles.listItem}>
    <div style={styles.listIcon}>{icon}</div>
    <div style={styles.listContent}>
      <div style={styles.listTitle}>{title}</div>
      <div style={styles.listSubtitle}>{subtitle}</div>
    </div>
    <div style={styles.listActions}>
      <button style={styles.btnGhost} onClick={onOpen} title="Open">
        <IoChevronForward size={18} />
      </button>
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
    backgroundColor: '#28a745', // Green for Supervisor
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
  statText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 1.2,
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
  actionButtonSmall: {
    backgroundColor: '#fff',
    border: '1px solid #28a745',
    color: '#28a745',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
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
  listContainer: {
    padding: '15px',
    maxHeight: '500px',
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
    cursor: 'pointer',
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
  emptyState: {
    textAlign: 'center',
    padding: '20px',
    color: '#999',
    fontStyle: 'italic',
    fontSize: '14px',
  },
  // Form Styles
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
  },
  primaryBtn: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '10px',
  },
  // Tab Styles
  tabContainer: {
    display: 'flex',
    backgroundColor: '#e9ecef',
    borderRadius: '8px',
    padding: '4px',
  },
  tab: {
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    cursor: 'pointer',
    borderRadius: '6px',
  },
  activeTab: {
    padding: '6px 12px',
    border: 'none',
    background: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    color: '#007bff',
    cursor: 'pointer',
    borderRadius: '6px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  siteTab: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#555',
  },
  siteTabActive: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #007bff',
    background: '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    padding: '8px 12px',
    borderRadius: '8px',
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    marginLeft: '8px',
    outline: 'none',
    width: '100%',
    fontSize: '14px',
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '4px 8px',
    borderRadius: '10px',
    display: 'inline-block',
  },
  // Camera & Overlay Styles
  overlayContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px',
  },
  cameraCard: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '20px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    alignItems: 'center',
    overflowY: 'auto',
  },
  cameraHeader: {
    textAlign: 'center',
    flexShrink: 0,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: '3/4',
    maxHeight: '50vh',
    backgroundColor: 'black',
    borderRadius: '15px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  locationStatus: {
    fontSize: '13px',
    fontWeight: '500',
    marginTop: '5px',
    flexShrink: 0,
  },
  cameraControls: {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: '10px',
    flexShrink: 0,
    paddingBottom: '10px',
  },
  btnCapture: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'white',
    border: '4px solid #e5e7eb',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  captureInnerRing: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
  },
  btnCancel: {
    padding: '10px',
    backgroundColor: 'transparent',
    color: '#666',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  // Preview Styles
  previewCard: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '20px',
    width: '100%',
    maxWidth: '450px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    overflowY: 'auto',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
    flexShrink: 0,
  },
  badgeType: {
    color: 'white',
    padding: '4px 10px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: '4/3',
    maxHeight: '40vh',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    flexShrink: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  detailsCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flexShrink: 0,
  },
  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '14px',
    color: '#333',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  previewControls: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
    flexShrink: 0,
    paddingBottom: '10px',
  },
  btnRetake: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#555',
  },
  btnSubmit: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    color: 'white',
  }
};