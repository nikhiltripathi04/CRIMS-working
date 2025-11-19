import React, { useState, useEffect } from 'react';
import { IoLogOutOutline, IoCubeOutline, IoCashOutline, IoPaperPlaneOutline, IoBarChartOutline, IoClose, IoRefresh } from 'react-icons/io5';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Assuming this path is correct
import styled from 'styled-components';

// Inject global styles once (This is common practice in React for global CSS)
const GlobalStyleInjector = () => (
    <style dangerouslySetInnerHTML={{ __html: `
      body, html {
        margin: 0;
        padding: 0;
        background-color: #f4f6f9;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    ` }} />
);

// --- Constants and Utility Functions for Web ---

const getScreenSize = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
});

const WebStorage = {
    getItem: (key) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
};

const WebAlert = (title, message, buttons) => {
    if (buttons) {
        const result = window.confirm(`${title}\n${message}`);
        const actionButton = buttons.find(btn => btn.text !== 'Cancel' && !btn.style?.includes('cancel'));
        
        if (result && actionButton && actionButton.onPress) {
            actionButton.onPress();
        }
    } else {
        window.alert(`${title}: ${message}`);
    }
};

// --- Component Implementation ---

const WarehouseManagerDashboard = ({ navigation }) => {
    
    const { user, logout, API_BASE_URL } = useAuth();
    const [warehouse, setWarehouse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
    const [showSupplyRequestsModal, setShowSupplyRequestsModal] = useState(false);
    const [supplyRequests, setSupplyRequests] = useState([]);
    const [currencyUnit, setCurrencyUnit] = useState('₹'); 

    // Add Supply Form State
    const [newSupply, setNewSupply] = useState({
        itemName: '',
        quantity: '',
        unit: '',
        entryPrice: '',
        currency: '₹' 
    });

    const handleLogout = () => {
        WebAlert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Logout',
                    onPress: async () => {
                        try {
                            setWarehouse(null);
                            await logout();
                        } catch (error) {
                            console.error('Logout error:', error);
                            WebAlert('Error', 'Failed to logout');
                        }
                    }
                }
            ]
        );
    };

    const loadCurrencyPreference = async () => {
        try {
            const savedCurrency = await WebStorage.getItem('supplyCurrency');
            if (savedCurrency) {
                setCurrencyUnit(savedCurrency);
                setNewSupply(prev => ({ ...prev, currency: savedCurrency }));
            } else {
                 setCurrencyUnit('₹');
                 setNewSupply(prev => ({ ...prev, currency: '₹' }));
            }
        } catch (error) {
            console.log('Error loading currency preference:', error);
        }
    };

    const fetchWarehouseData = async () => {
        if (user?.warehouseId) {
            try {
                setIsRefreshing(true);
                const warehouseId = user.warehouseId._id || user.warehouseId;

                const response = await axios.get(
                    `${API_BASE_URL}/api/warehouses/${warehouseId}?userId=${user.id}`
                );

                if (response.data.success) {
                    setWarehouse(response.data.data);
                }

                await fetchSupplyRequests();
            } catch (error) {
                console.error('Fetch warehouse details error:', error);
                WebAlert('Error', 'Failed to fetch warehouse details');
            } finally {
                setIsRefreshing(false);
            }
        }
    };

    const fetchSupplyRequests = async () => {
        try {
            const warehouseId = user.warehouseId._id || user.warehouseId;
            const managerId = user.id;

            const response = await axios.get(
                `${API_BASE_URL}/api/warehouses/supply-requests?warehouseId=${warehouseId}&managerId=${managerId}`
            );

            if (response.data.success) {
                setSupplyRequests(response.data.data || []);
            }
        } catch (error) {
            console.error('Fetch supply requests error:', error);
            console.error('Error response:', error.response?.data);

            setSupplyRequests([]);

            if (error.response?.status !== 404) {
                WebAlert('Error', `Failed to fetch supply requests: ${error.response?.data?.message || error.message}`);
            }
        }
    };

    const addSupply = async () => {
        if (!newSupply.itemName || !newSupply.quantity || !newSupply.unit || !newSupply.entryPrice) {
            WebAlert('Error', 'Please fill in all fields');
            return;
        }

        try {
            setLoading(true);
            const warehouseId = user.warehouseId._id || user.warehouseId;

            const response = await axios.post(
                `${API_BASE_URL}/api/warehouses/${warehouseId}/supplies`,
                {
                    ...newSupply,
                    quantity: parseFloat(newSupply.quantity),
                    entryPrice: parseFloat(newSupply.entryPrice),
                    userId: user.id
                }
            );

            if (response.data.success) {
                WebAlert('Success', 'Supply added successfully');
                setNewSupply({
                    itemName: '',
                    quantity: '',
                    unit: '',
                    entryPrice: '',
                    currency: currencyUnit
                });
                setShowAddSupplyModal(false);
                fetchWarehouseData();
            }
        } catch (error) {
            console.error('Add supply error:', error);
            WebAlert('Error', 'Failed to add supply');
        } finally {
            setLoading(false);
        }
    };

    const handleSupplyRequest = async (requestId, action, transferQuantity) => {
        try {
            setLoading(true);

            const requestData = {
                managerId: user.id,
                transferQuantity: transferQuantity,
            };

            const response = await axios.post(
                `${API_BASE_URL}/api/warehouses/supply-requests/${requestId}/${action}`,
                requestData
            );

            if (response.data.success) {
                WebAlert('Success', response.data.message || `Supply request ${action}d successfully`);
                fetchSupplyRequests();
                fetchWarehouseData();
            } else {
                WebAlert('Error', response.data.message || `Failed to ${action} supply request`);
            }
        } catch (error) {
            console.error('handleSupplyRequest error:', error);
            const errorMessage = error.response?.data?.message || error.message || `Failed to ${action} supply request`;
            WebAlert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            await loadCurrencyPreference();
            if (user?.warehouseId && mounted) {
                await fetchWarehouseData();
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [user, API_BASE_URL]);


    const getSuppliesStats = () => {
        if (!warehouse || !warehouse.supplies) return { items: 0, totalValue: 0 };

        const totalValue = warehouse.supplies.reduce((sum, supply) => {
            const price = parseFloat(supply.entryPrice) || 0;
            const quantity = parseFloat(supply.quantity) || 0;
            return sum + (price * quantity);
        }, 0);

        return {
            items: warehouse.supplies.length,
            totalValue: isNaN(totalValue) ? 0 : totalValue
        };
    };

    const renderAddSupplyModal = () => (
        showAddSupplyModal && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h3 className="modal-title">Add New Supply</h3>
                        <button className="close-button" onClick={() => setShowAddSupplyModal(false)}>
                            <IoClose size={24} color="#999" />
                        </button>
                    </div>

                    <div className="modal-body">
                        <div className="input-group">
                            <label className="input-label" htmlFor="itemName">Item Name *</label>
                            <input
                                id="itemName"
                                className="text-input"
                                type="text"
                                value={newSupply.itemName}
                                onChange={(e) => setNewSupply(prev => ({ ...prev, itemName: e.target.value }))}
                                placeholder="Enter item name"
                            />
                        </div>

                        <div className="input-row">
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label" htmlFor="quantity">Quantity *</label>
                                <input
                                    id="quantity"
                                    className="text-input"
                                    type="number"
                                    value={newSupply.quantity}
                                    onChange={(e) => setNewSupply(prev => ({ ...prev, quantity: e.target.value }))}
                                    placeholder="0"
                                />
                            </div>

                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label" htmlFor="unit">Unit *</label>
                                <input
                                    id="unit"
                                    className="text-input"
                                    type="text"
                                    value={newSupply.unit}
                                    onChange={(e) => setNewSupply(prev => ({ ...prev, unit: e.target.value }))}
                                    placeholder="kg, pcs, etc."
                                />
                            </div>
                        </div>

                        <div className="input-row">
                            <div className="input-group" style={{ flex: 1 }}>
                                <label className="input-label" htmlFor="entryPrice">Entry Price *</label>
                                <input
                                    id="entryPrice"
                                    className="text-input"
                                    type="number"
                                    value={newSupply.entryPrice}
                                    onChange={(e) => setNewSupply(prev => ({ ...prev, entryPrice: e.target.value }))}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="input-group" style={{ flex: 0.6 }}>
                                <label className="input-label">Currency</label>
                                <div className="currency-display">
                                    <span className="currency-text">{currencyUnit}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            className="add-button"
                            onClick={addSupply}
                            disabled={loading}
                        >
                            {loading ? 'Adding...' : 'Add Supply'}
                        </button>
                    </div>
                </div>
            </div>
        )
    );

    const renderSupplyRequest = (item) => (
        <div className="request-card" key={item._id}>
            <div className="request-header">
                <span className="request-site">{item.siteName}</span>
                <span className="request-date">{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>

            <p className="request-item">{item.itemName}</p>
            <p className="request-quantity">Requested: <strong>{item.requestedQuantity} {item.unit}</strong></p>

            {item.status === 'pending' && (
                <div className="request-actions">
                    <button
                        className="action-button approve"
                        onClick={() => {
                            const requestedQty = item.requestedQuantity;
                            const unit = item.unit;

                            WebAlert(
                                'Approve Transfer',
                                `Transfer ${item.itemName} to ${item.siteName}?\n\nRequested: ${requestedQty} ${unit}`,
                                [
                                    {
                                        text: 'Cancel',
                                        style: 'cancel',
                                        onPress: () => console.log('Transfer cancelled')
                                    },
                                    {
                                        text: `Transfer Full Amount (${requestedQty} ${unit})`,
                                        onPress: () => {
                                            handleSupplyRequest(item._id, 'approve', requestedQty);
                                        }
                                    },
                                    ...(requestedQty > 1 ? [{
                                        text: `Transfer Half (${Math.floor(requestedQty / 2)} ${unit})`,
                                        onPress: () => {
                                            const halfQty = Math.floor(requestedQty / 2);
                                            handleSupplyRequest(item._id, 'approve', halfQty);
                                        }
                                    }] : [])
                                ]
                            );
                        }}
                    >
                        Approve & Transfer
                    </button>

                    <button
                        className="action-button reject"
                        onClick={() => handleSupplyRequest(item._id, 'reject', 0)}
                    >
                        Reject
                    </button>
                </div>
            )}

            {item.status !== 'pending' && (
                <div className={`status-badge ${item.status}`}>
                    <span className="status-text">{item.status.toUpperCase()}{item.transferQuantity ? ` (${item.transferQuantity} ${item.unit} transferred)` : ''}</span>
                </div>
            )}
        </div>
    );

    const renderSupplyRequestsModal = () => (
        showSupplyRequestsModal && (
            <div className="full-modal-container">
                <div className="full-modal-header">
                    <h2 className="full-modal-title">Supply Requests</h2>
                    <button className="close-button" onClick={() => setShowSupplyRequestsModal(false)}>
                        <IoClose size={24} color="#FFFFFF" />
                    </button>
                </div>

                <div className="requests-list">
                    {isRefreshing ? (
                        <div className="loading-container" style={{ minHeight: '300px', paddingTop: '0' }}>
                            <p className="loading-text">Loading requests...</p>
                        </div>
                    ) : supplyRequests.length > 0 ? (
                        supplyRequests.map(renderSupplyRequest)
                    ) : (
                        <div className="empty-requests-container">
                            <IoPaperPlaneOutline size={64} color="#ccc" />
                            <p className="empty-requests-text">No supply requests</p>
                            <p className="empty-requests-subtext">
                                Site supervisors can request supplies from your warehouse
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )
    );

    if (!user) {
        return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p>Authenticating user...</p></div>;
    }

    if (!warehouse) {
        return (
            <>
                <GlobalStyleInjector />
                <PageContainer>
                    <Header>
                        <HeaderContent>
                            <Title>Warehouse Manager</Title>
                        </HeaderContent>
                        <LogoutButton onClick={handleLogout}>
                            <IoLogOutOutline size={24} color="#FFFFFF" />
                        </LogoutButton>
                    </Header>
                    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1}}><p>Loading warehouse details...</p></div>
                </PageContainer>
            </>
        );
    }

    const suppliesStats = getSuppliesStats();
    const pendingRequests = supplyRequests.filter(req => req.status === 'pending').length;

    return (
        <>
            <GlobalStyleInjector />
            <PageContainer>
                <Header>
                    <HeaderContent>
                        <Title>Warehouse Manager</Title>
                        <Subtitle>{warehouse.warehouseName}</Subtitle>
                    </HeaderContent>
                    <HeaderActions>
                        <RefreshButton onClick={fetchWarehouseData} disabled={isRefreshing}>
                            <IoRefresh size={20} />
                        </RefreshButton>
                        <LogoutButton onClick={handleLogout}>
                        <IoLogOutOutline size={24} color="#FFFFFF" />
                        </LogoutButton>
                    </HeaderActions>
                </Header>

                <MainContent>
                    <WelcomeCard>
                        <h2>{warehouse.warehouseName}</h2>
                        <p>📍 {warehouse.location}</p>
                    </WelcomeCard>

                    <StatsGrid>
                        <StatCard>
                            <IoCubeOutline size={32} color="#E69138" />
                            <StatValue>{suppliesStats.items}</StatValue>
                            <StatLabel>Supply Items</StatLabel>
                        </StatCard>

                        <StatCard>
                            <IoCashOutline size={32} color="#28a745" />
                            <StatValue>{currencyUnit}{suppliesStats.totalValue.toFixed(2)}</StatValue>
                            <StatLabel>Inventory Value</StatLabel>
                        </StatCard>

                        <StatCard>
                            <IoPaperPlaneOutline size={32} color="#dc3545" />
                            <StatValue>{pendingRequests}</StatValue>
                            <StatLabel>Pending Requests</StatLabel>
                        </StatCard>
                    </StatsGrid>

                    <ActionsGrid>
                        <ActionCard
                            onClick={() => navigation.navigate('WarehouseSupplies', {
                                warehouse,
                                canEdit: true,
                                currencyUnit
                            })}
                        >
                            <ActionIcon>
                                <IoCubeOutline size={24} color="#E69138" />
                            </ActionIcon>
                            <ActionContent>
                                <ActionTitle>Manage Inventory</ActionTitle>
                                <ActionDescription>View and edit warehouse inventory</ActionDescription>
                            </ActionContent>
                        </ActionCard>

                        <ActionCard
                            onClick={() => navigation.navigate('WarehouseReports', {
                                warehouse,
                                managerId: user.id
                            })}
                        >
                            <ActionIcon>
                                <IoBarChartOutline size={24} color="#6f42c1" />
                            </ActionIcon>
                            <ActionContent>
                                <ActionTitle>Reports & Analytics</ActionTitle>
                                <ActionDescription>View inventory reports and transfer history</ActionDescription>
                            </ActionContent>
                        </ActionCard>

                        <ActionCard
                            onClick={() => setShowSupplyRequestsModal(true)}
                        >
                            <ActionIcon>
                                <IoPaperPlaneOutline size={24} color="#007bff" />
                                {pendingRequests > 0 && (
                                    <Badge>
                                        <BadgeText>{pendingRequests}</BadgeText>
                                    </Badge>
                                )}
                            </ActionIcon>
                            <ActionContent>
                                <ActionTitle>Supply Requests</ActionTitle>
                                <ActionDescription>
                                    Handle supply requests from site supervisors
                                    {pendingRequests > 0 && ` (${pendingRequests} pending)`}
                                </ActionDescription>
                            </ActionContent>
                        </ActionCard>
                    </ActionsGrid>
                </MainContent>

                {/* Modals */}
                {renderAddSupplyModal()}
                {renderSupplyRequestsModal()}
            </PageContainer>
        </>
    );
};

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f4f6f9;
`;

const Header = styled.header`
  background: linear-gradient(90deg, #E69138, #C97713);
  color: #fff;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const HeaderContent = styled.div``;
const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 0;
`;
const Subtitle = styled.p`
  font-size: 14px;
  color: rgba(255,255,255,0.8);
  margin: 4px 0 0;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HeaderButton = styled.button`
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  &:hover {
    background-color: rgba(255,255,255,0.25);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LogoutButton = styled(HeaderButton)``;
const RefreshButton = styled(HeaderButton)``;

const MainContent = styled.main`
  flex: 1;
  padding: 20px 30px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const WelcomeCard = styled.div`
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  margin-bottom: 20px;
  h2 { margin: 0 0 5px; font-size: 20px; }
  p { margin: 0; color: #666; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  text-align: center;
`;

const StatValue = styled.h3`
  font-size: 22px;
  font-weight: 700;
  margin: 8px 0 4px;
  color: #333;
`;

const StatLabel = styled.p`
  font-size: 13px;
  color: #666;
  margin: 0;
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
`;

const ActionCard = styled.button`
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  text-align: left;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  }
`;

const ActionIcon = styled.div`
  position: relative;
  margin-right: 15px;
`;

const ActionContent = styled.div``;
const ActionTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
`;
const ActionDescription = styled.p`
  font-size: 13px;
  color: #666;
  margin: 0;
`;

const Badge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #dc3545;
  color: #fff;
  border-radius: 12px;
  min-width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px solid #fff;
`;

const BadgeText = styled.span`
  font-size: 11px;
  font-weight: bold;
`;

export default WarehouseManagerDashboard;