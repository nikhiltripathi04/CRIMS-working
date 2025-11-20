import React, { useState, useEffect } from 'react';
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function ManageWorkersScreenWeb({ route }) {
    const navigation = useNavigation();
    const { site, canEdit = false } = route.params;
    const { API_BASE_URL, user } = useAuth();

    const [workers, setWorkers] = useState(site.workers || []);
    const [filteredWorkers, setFilteredWorkers] = useState(site.workers || []);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [modalVisible, setModalVisible] = useState(false);
    const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [editingWorker, setEditingWorker] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        role: '',
        phoneNumber: ''
    });

    // Search function
    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredWorkers(workers);
        } else {
            const filtered = workers.filter(worker =>
                worker.name.toLowerCase().includes(query.toLowerCase()) ||
                worker.role.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredWorkers(filtered);
        }
    };

    // Update filtered workers when workers change
    useEffect(() => {
        if (searchQuery.trim() !== '') {
            handleSearch(searchQuery);
        } else {
            setFilteredWorkers(workers);
        }
    }, [workers]);

    const resetForm = () => {
        setFormData({ name: '', role: '', phoneNumber: '' });
        setEditingWorker(null);
    };

    const openModal = (worker = null) => {
        if (worker) {
            setFormData({
                name: worker.name,
                role: worker.role,
                phoneNumber: worker.phoneNumber
            });
            setEditingWorker(worker);
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const saveWorker = async () => {
        if (!formData.name || !formData.role) {
            alert('Please fill in name and role');
            return;
        }

        try {
            const workerData = {
                ...formData,
                supervisorId: user?.id
            };

            let response;
            if (editingWorker) {
                response = await axios.put(
                    `${API_BASE_URL}/api/sites/${site._id}/workers/${editingWorker._id}`,
                    workerData
                );
            } else {
                response = await axios.post(
                    `${API_BASE_URL}/api/sites/${site._id}/workers`,
                    workerData
                );
            }

            if (response.data.success) {
                setWorkers(response.data.data.workers);
                setModalVisible(false);
                resetForm();
                alert(`Worker ${editingWorker ? 'updated' : 'added'} successfully`);
            }
        } catch (error) {
            console.error('Save worker error:', error);
            alert('Failed to save worker');
        }
    };

    const markAttendance = async (workerId, status) => {
        try {
            const today = new Date();
            const attendanceData = {
                date: today,
                status: status,
                supervisorId: user?.id
            };

            const response = await axios.post(
                `${API_BASE_URL}/api/sites/${site._id}/workers/${workerId}/attendance`,
                attendanceData
            );

            if (response.data.success) {
                setWorkers(response.data.data.workers);
                alert(`Attendance marked as ${status}`);
            } else {
                alert('Failed to mark attendance');
            }
        } catch (error) {
            console.error('Attendance error:', error);
            alert('Failed to mark attendance');
        }
    };

    const getTodayAttendance = (worker) => {
        const today = new Date().toDateString();
        const sortedAttendance = worker.attendance?.sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        ) || [];

        const todayAttendance = sortedAttendance.find(
            att => new Date(att.date).toDateString() === today
        );

        return todayAttendance?.status || 'not_marked';
    };

    const deleteWorker = async (workerId) => {
        const confirmed = window.confirm('Are you sure you want to delete this worker?');
        if (!confirmed) return;

        try {
            const response = await axios.delete(
                `${API_BASE_URL}/api/sites/${site._id}/workers/${workerId}?supervisorId=${user?.id}`
            );

            if (response.data.success) {
                setWorkers(response.data.data.workers);
                alert('Worker deleted successfully');
            }
        } catch (error) {
            console.error('Delete worker error:', error);
            alert('Failed to delete worker');
        }
    };

    return (
        <>
            <style>{globalStyles}</style>
            <div className="admin-page">
                {/* Header */}
                <header className="admin-header">
                    <div className="admin-title-block">
                        <div className="admin-title-row">
                            <button
                                onClick={() => navigation.goBack()}
                                className="btn-icon"
                                title="Go Back"
                                style={{ marginRight: '10px', padding: '4px' }}
                            >
                                <Ionicons name="arrow-back" size={24} color="#1f2937" />
                            </button>
                            <h1 className="admin-title">Workers Management</h1>
                        </div>
                        <p className="admin-subtitle">
                            {workers.length} Workers • {site.siteName}
                        </p>
                    </div>

                    <div className="admin-controls">
                        <div className="admin-search-wrap">
                            <Ionicons name="search" size={16} color="#6B7280" />
                            <input
                                type="text"
                                placeholder="Search workers..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="admin-search-input"
                            />
                        </div>

                        {canEdit && (
                            <button
                                className="btn-primary"
                                onClick={() => openModal()}
                            >
                                <Ionicons name="add" size={18} color="#FFF" />
                                Add Worker
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <main className="admin-content">
                    {filteredWorkers.length === 0 ? (
                        <div className="admin-empty-panel">
                            <Ionicons name="people-outline" size={48} color="#9CA3AF" style={{ marginBottom: '10px' }} />
                            <p className="admin-empty-text">
                                {searchQuery.length > 0 ? 'No workers found matching your search' : 'No workers added yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="admin-card-list">
                            {filteredWorkers.map((worker) => {
                                const todayStatus = getTodayAttendance(worker);
                                return (
                                    <div key={worker._id} className="admin-card">
                                        <div className="admin-card-content">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <h3 className="admin-card-title">{worker.name}</h3>
                                                    <p className="admin-card-meta">{worker.role}</p>
                                                    {worker.phoneNumber && (
                                                        <p className="admin-card-small">📱 {worker.phoneNumber}</p>
                                                    )}
                                                </div>
                                                <span className={`status-badge status-${todayStatus}`}>
                                                    {todayStatus === 'present' ? 'Present' :
                                                        todayStatus === 'absent' ? 'Absent' : 'Not Marked'}
                                                </span>
                                            </div>
                                        </div>

                                        {canEdit && (
                                            <div className="admin-card-actions">
                                                <button
                                                    className="btn-ghost-small"
                                                    onClick={() => {
                                                        setSelectedWorker(worker);
                                                        setAttendanceModalVisible(true);
                                                    }}
                                                >
                                                    Attendance
                                                </button>
                                                <button
                                                    className="btn-ghost-small"
                                                    onClick={() => openModal(worker)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn-danger-small"
                                                    onClick={() => deleteWorker(worker._id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>

                {/* Add/Edit Modal */}
                {modalVisible && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2 className="modal-title">
                                {editingWorker ? 'Edit Worker' : 'Add New Worker'}
                            </h2>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Worker Name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    placeholder="Role/Position"
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="Phone Number"
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn-ghost" onClick={() => setModalVisible(false)}>Cancel</button>
                                <button className="btn-primary" onClick={saveWorker}>
                                    {editingWorker ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Attendance Modal */}
                {attendanceModalVisible && selectedWorker && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2 className="modal-title">Mark Attendance</h2>
                            <p className="modal-subtitle">{selectedWorker.name} • {new Date().toLocaleDateString()}</p>

                            <div className="attendance-actions">
                                <button
                                    className="btn-success-large"
                                    onClick={() => {
                                        markAttendance(selectedWorker._id, 'present');
                                        setAttendanceModalVisible(false);
                                    }}
                                >
                                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                    Present
                                </button>
                                <button
                                    className="btn-danger-large"
                                    onClick={() => {
                                        markAttendance(selectedWorker._id, 'absent');
                                        setAttendanceModalVisible(false);
                                    }}
                                >
                                    <Ionicons name="close-circle" size={24} color="#fff" />
                                    Absent
                                </button>
                            </div>
                            <div className="modal-actions" style={{ marginTop: '20px' }}>
                                <button className="btn-ghost" onClick={() => setAttendanceModalVisible(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

const globalStyles = `
  * { box-sizing: border-box; }
  html, body, #root {
    margin: 0; padding: 0; width: 100%; height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1f2937;
  }
  .admin-page {
    display: flex; flex-direction: column; width: 100%; height: 100vh;
    background-color: #f4f6f9;
  }
  .admin-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 30px; background-color: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    position: sticky; top: 0; z-index: 10;
  }
  .admin-title-block { display: flex; flex-direction: column; }
  .admin-title-row { display: flex; align-items: center; }
  .admin-title { font-size: 24px; font-weight: 700; margin: 0; color: #1f2937; }
  .admin-subtitle { color: #6b7280; margin: 4px 0 0 0; font-size: 14px; }
  .admin-controls { display: flex; gap: 12px; align-items: center; }
  .admin-search-wrap {
    display: flex; align-items: center; gap: 8px;
    background: #fff; padding: 8px 12px; border-radius: 8px;
    border: 1px solid #d1d5db; min-width: 250px;
  }
  .admin-search-input {
    border: none; outline: none; flex: 1; font-size: 15px; color: #1f2937;
  }
  .admin-content {
    flex: 1; padding: 30px; width: 100%; max-width: 1000px; margin: 0 auto;
    overflow-y: auto;
  }
  .admin-card-list { display: flex; flex-direction: column; gap: 12px; }
  .admin-card {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;
    background-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    transition: all 0.2s;
  }
  .admin-card:hover { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.08); }
  .admin-card-content { flex: 1; }
  .admin-card-title { font-size: 17px; font-weight: 600; margin: 0; color: #1f2937; }
  .admin-card-meta { color: #6b7280; margin: 4px 0 0 0; font-size: 13px; }
  .admin-card-small { color: #9ca3af; margin: 6px 0 0 0; font-size: 12px; }
  .admin-card-actions { display: flex; gap: 8px; margin-left: 20px; }
  .admin-empty-panel {
    padding: 40px; text-align: center; border: 1px dashed #d1d5db;
    border-radius: 8px; background-color: #f9fafb;
    display: flex; flex-direction: column; align-items: center;
  }
  .admin-empty-text { color: #9ca3af; font-style: italic; margin: 0; }

  /* Buttons */
  .btn-primary, .btn-ghost, .btn-icon, .btn-ghost-small, .btn-danger-small {
    padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 14px; font-weight: 600; transition: all 0.2s;
  }
  .btn-primary { background-color: #007bff; color: #fff; }
  .btn-primary:hover { background-color: #005bb5; }
  .btn-ghost { background-color: #f0f4f8; color: #007bff; }
  .btn-ghost:hover { background-color: #e2e8f0; }
  .btn-icon { background: transparent; color: #007bff; padding: 8px; border-radius: 50%; }
  .btn-icon:hover { background-color: #f3f4f6; }
  .btn-ghost-small { background-color: #e5e7eb; color: #1f2937; padding: 6px 12px; font-size: 12px; }
  .btn-ghost-small:hover { background-color: #d1d5db; }
  .btn-danger-small { background-color: #dc2626; color: #fff; padding: 6px 12px; font-size: 12px; }
  .btn-danger-small:hover { background-color: #b91c1c; }

  /* Badges */
  .status-badge {
    padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 600;
    text-transform: uppercase;
  }
  .status-present { background-color: #d1fae5; color: #065f46; }
  .status-absent { background-color: #fee2e2; color: #991b1b; }
  .status-not_marked { background-color: #fef3c7; color: #92400e; }

  /* Modal */
  .modal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
    z-index: 100;
  }
  .modal-content {
    background: #fff; padding: 24px; border-radius: 12px; width: 90%; max-width: 400px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
  .modal-title { margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #1f2937; text-align: center; }
  .modal-subtitle { margin: -10px 0 20px 0; text-align: center; color: #6b7280; font-size: 14px; }
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: #374151; }
  .form-input {
    width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;
    font-size: 15px; outline: none;
  }
  .form-input:focus { border-color: #007bff; box-shadow: 0 0 0 2px rgba(0,123,255,0.1); }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
  .modal-actions button { flex: 1; }

  .attendance-actions { display: flex; gap: 15px; }
  .btn-success-large {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 20px; border-radius: 12px; border: none; cursor: pointer;
    background-color: #10b981; color: white; font-weight: 600; font-size: 16px;
    transition: transform 0.2s;
  }
  .btn-success-large:hover { background-color: #059669; transform: scale(1.02); }
  .btn-danger-large {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 20px; border-radius: 12px; border: none; cursor: pointer;
    background-color: #ef4444; color: white; font-weight: 600; font-size: 16px;
    transition: transform 0.2s;
  }
  .btn-danger-large:hover { background-color: #dc2626; transform: scale(1.02); }
`;