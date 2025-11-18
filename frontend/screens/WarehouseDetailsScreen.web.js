// WarehouseDetailsScreen.web.js

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styled, { css } from 'styled-components';
import { IoArrowBack, IoCubeOutline, IoCashOutline, IoPeopleOutline, IoClose, IoAdd, IoCreateOutline, IoTrashOutline, IoPersonAddOutline, IoKeyOutline, IoInformationCircleOutline } from 'react-icons/io5';

// --- Styled Components (CSS-in-JS) ---

const Color = {
    Primary: '#2563eb', // Blue
    PrimaryLight: '#eef6ff',
    Accent: '#f97316', // Orange
    Success: '#28a745',
    Danger: '#dc3545',
    Warning: '#ffc107',
    Info: '#17a2b8',
    Card: '#ffffff',
    TextDark: '#0f172a',
    TextMuted: '#64748b',
};

const PageRoot = styled.div`
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background-color: ${Color.PrimaryLight};

    /* GLOBAL FIX: Ensure HTML/BODY allows full height, although this ideally 
       belongs in a global stylesheet, applying it here makes PageRoot the scrolling context. 
       This structure is most reliable for fixed headers. */
    & > * {
        box-sizing: border-box;
    }
    position: relative;
`;

const Topbar = styled.header`
    position: sticky;
    top: 0;
    background: linear-gradient(90deg, ${Color.Primary}, #1e40af);
    color: ${Color.Card};
    padding: 12px 20px;
    z-index: 30;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const TopbarInner = styled.div`
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const TopbarLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const BackButton = styled.button`
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: ${Color.Card};
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    &:hover { background: rgba(255, 255, 255, 0.3); }
`;

const TopbarTitle = styled.h1`
    font-size: 18px;
    font-weight: 700;
    margin: 0;
`;

const TopbarRight = styled.div`
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
`;

// *** SCROLL FIX APPLIED HERE ***
const MainContent = styled.main`
    flex-grow: 1; /* Key 1: Takes up remaining vertical space */
    height: 0; /* Key 2: Required alongside flex-grow for overflow to calculate correctly */
    overflow-y: auto; /* Key 3: Forces the content area to handle its own scrollbar */

    max-width: 1100px;
    margin: 18px auto;
    padding: 0 16px 40px;
    width: 100%;
    
    /* Center the content horizontally within the scrollable area */
    align-self: center; 
`;
// ******************************

const ContentContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Card = styled.div`
    background: ${Color.Card};
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(2, 6, 23, 0.08);
    overflow: hidden;
`;

const CardHeader = styled.div`
    padding: 14px 20px;
    border-bottom: 1px solid #f1f5f9;
    
    h3 {
        margin: 0;
        font-size: 16px;
        color: ${Color.TextDark};
    }
`;

const CardBody = styled.div`
    padding: 10px 20px;
`;

const CardFooter = styled.div`
    padding: 12px 20px;
    border-top: 1px solid #f1f5f9;
    text-align: right;
`;

const LinkButton = styled.button`
    background: transparent;
    border: none;
    color: ${Color.Primary};
    font-weight: 600;
    cursor: pointer;
    transition: color 0.2s;
    &:hover { color: #1e40af; }
`;

const WarehouseCardStyled = styled(Card)`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;

    @media (max-width: 600px) {
        flex-direction: column;
        align-items: flex-start;
    }
`;

const WarehouseName = styled.h2`
    margin: 0;
    font-size: 24px;
    color: ${Color.TextDark};
`;

const WarehouseLocation = styled.div`
    color: ${Color.TextMuted};
    margin-top: 6px;
`;

const WarehouseActions = styled.div`
    display: flex;
    gap: 10px;
    @media (max-width: 600px) {
        margin-top: 15px;
        width: 100%;
    }
`;

const ActionButton = styled.button`
    border: none;
    padding: 10px 16px;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s, color 0.2s;

    &.primary {
        background: ${Color.Primary};
        color: ${Color.Card};
        &:hover { background: #1e40af; }
    }
    &.ghost {
        background: transparent;
        border: 1px solid rgba(37, 99, 235, 0.2);
        color: ${Color.Primary};
        &:hover { background: ${Color.PrimaryLight}; }
    }
    @media (max-width: 600px) {
        flex: 1;
        text-align: center;
    }
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 18px;
    @media (max-width: 500px) {
        grid-template-columns: 1fr;
    }
`;

const StatCardStyled = styled(Card)`
    padding: 18px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    box-shadow: 0 4px 12px rgba(2, 6, 23, 0.05);
`;

const StatIcon = styled.div`
    font-size: 24px;
    margin-bottom: 8px;
    color: ${props => props.color || Color.Primary};
`;

const StatNumber = styled.div`
    font-weight: 700;
    font-size: 22px;
    color: ${Color.TextDark};
    margin-bottom: 4px;
`;

const StatLabel = styled.div`
    color: ${Color.TextMuted};
    font-size: 14px;
`;

const ListRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f3f6fb;
    &:last-child { border-bottom: none; }
`;

const ItemName = styled.div`
    font-weight: 600;
    color: ${Color.TextDark};
`;

const ItemMeta = styled.div`
    color: ${Color.TextMuted};
    font-size: 13px;
`;

const ItemRight = styled.div`
    font-weight: 600;
    
    .pending {
        color: ${Color.Accent};
    }
`;

const LogRow = styled(ListRow)`
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid #f3f6fb;
`;

const LogDot = styled.div`
    min-width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${Color.Card};
    background-color: ${props => props.dotColor || Color.TextMuted};
    font-size: 18px;
    
    svg {
        color: ${Color.Card};
    }
`;

const LogBody = styled.div`
    flex: 1;
`;

const LogDesc = styled.div`
    font-weight: 600;
    color: ${Color.TextDark};
`;

const LogTime = styled.div`
    color: ${Color.TextMuted};
    font-size: 13px;
    margin-top: 2px;
`;

const EmptyState = styled.div`
    color: ${Color.TextMuted};
    padding: 18px 0;
    text-align: center;
    font-style: italic;
`;

const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ModalStyled = styled.div`
    background: ${Color.Card};
    width: 90%;
    max-width: 900px;
    max-height: 80vh;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(2,6,23,0.15);
    display: flex;
    flex-direction: column;
`;

const ModalHead = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px solid #f1f5f9;
    
    h3 {
        margin: 0;
        font-size: 18px;
        color: ${Color.TextDark};
    }
`;

const ModalActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const CloseModalButton = styled.button`
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${Color.TextDark};
`;

const FilterSelect = styled.select`
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #ddd;
    font-size: 14px;
    cursor: pointer;
    background-color: #f7f7f7;
`;

const ModalBody = styled.div`
    padding: 0 20px;
    overflow-y: auto; /* Ensures the modal content scrolls internally */
    flex: 1;
`;

const LogListContainer = styled.div`
    padding-bottom: 20px;
`;


// --- Component ---
export default function WarehouseDetailsWeb({ route }) {
    const { warehouse: initialWarehouse } = route.params || {};
    const [warehouse, setWarehouse] = useState(initialWarehouse || {});
    const [loading, setLoading] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [logFilter, setLogFilter] = useState('all');
    const [currencyUnit, setCurrencyUnit] = useState('₹');

    const { API_BASE_URL, user } = useAuth();
    const navigation = useNavigation();

    useEffect(() => {
        const pref = typeof window !== 'undefined' && window.localStorage?.getItem('supplyCurrency');
        if (pref) setCurrencyUnit(pref);
        if (user && user.id && warehouse?._id) fetchWarehouseDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, warehouse._id]);

    const fetchWarehouseDetails = async () => {
        if (!user || !user.id || !warehouse?._id) return;
        try {
            setLoading(true);
            const url = `${API_BASE_URL}/api/warehouses/${warehouse._id}?userId=${user.id}`;
            const res = await axios.get(url);
            if (res.data && res.data.success) {
                setWarehouse(res.data.data);
                if (res.data.data.activityLogs) {
                    const sorted = [...res.data.data.activityLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    setActivityLogs(sorted.slice(0, 5));
                }
            } else {
                window.alert('Failed to fetch warehouse details');
            }
        } catch (err) {
            console.error('fetchWarehouseDetails web error', err);
            window.alert('Failed to fetch warehouse details');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllLogs = useCallback((filter = 'all') => {
        if (!warehouse || !warehouse.activityLogs) return setActivityLogs([]);
        
        const filtered = (warehouse.activityLogs || []).filter(l => filter === 'all' || l.action === filter);
        const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        setActivityLogs(sorted);
        setLogFilter(filter);
    }, [warehouse]);

    const getSuppliesStats = () => {
        if (!warehouse || !warehouse.supplies) return { items: 0, totalValue: 0 };
        const totalValue = warehouse.supplies
            .filter(s => s.entryPrice)
            .reduce((sum, s) => sum + (parseFloat(s.entryPrice || 0) * (parseFloat(s.quantity || 0) || 0)), 0);
        return { 
            items: warehouse.supplies.length, 
            totalValue: isNaN(totalValue) ? 0 : totalValue 
        };
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        
        const timeOptions = { hour: '2-digit', minute: '2-digit' };

        if (date.toDateString() === today.toDateString()) return `Today ${date.toLocaleTimeString([], timeOptions)}`;
        if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${date.toLocaleTimeString([], timeOptions)}`;
        
        const fullOptions = { month: 'short', day: 'numeric', year: 'numeric', ...timeOptions };
        return date.toLocaleString([], fullOptions);
    };

    const getLogIcon = (action) => {
        switch (action) {
            case 'supply_added': return { icon: <IoAdd />, color: Color.Success };
            case 'supply_updated': return { icon: <IoCreateOutline />, color: Color.Warning };
            case 'supply_deleted': return { icon: <IoTrashOutline />, color: Color.Danger };
            case 'manager_added': return { icon: <IoPersonAddOutline />, color: Color.Success };
            case 'manager_password_reset': return { icon: <IoKeyOutline />, color: Color.Info };
            default: return { icon: <IoInformationCircleOutline />, color: Color.TextMuted };
        }
    };

    // Render helpers
    const renderStatCards = () => {
        const stats = getSuppliesStats();
        const managerCount = warehouse.managers?.length || 0;
        return (
            <StatsGrid>
                <StatCardStyled>
                    <StatIcon color={Color.Primary}><IoCubeOutline size={24} /></StatIcon>
                    <StatNumber>{stats.items}</StatNumber>
                    <StatLabel>Supply Items</StatLabel>
                </StatCardStyled>
                <StatCardStyled>
                    <StatIcon color={Color.Success}><IoCashOutline size={24} /></StatIcon>
                    <StatNumber>{currencyUnit}{stats.totalValue.toFixed(2)}</StatNumber>
                    <StatLabel>Inventory Value</StatLabel>
                </StatCardStyled>
                <StatCardStyled>
                    <StatIcon color={Color.TextDark}><IoPeopleOutline size={24} /></StatIcon>
                    <StatNumber>{managerCount}</StatNumber>
                    <StatLabel>Managers</StatLabel>
                </StatCardStyled>
            </StatsGrid>
        );
    };

    const renderSupplies = () => (
        <Card>
            <CardHeader><h3>Current Supplies</h3></CardHeader>
            <CardBody>
                {warehouse.supplies && warehouse.supplies.length > 0 ? (
                    warehouse.supplies.slice(0, 6).map((s, i) => (
                        <ListRow key={i}>
                            <div className="left">
                                <ItemName>{s.itemName || 'Unknown'}</ItemName>
                                <ItemMeta>Qty: {s.quantity} {s.unit || ''}</ItemMeta>
                            </div>
                            <ItemRight>
                                {s.entryPrice ? `${s.currency || currencyUnit}${parseFloat(s.entryPrice).toFixed(2)}` : <span className="pending">Price Pending</span>}
                            </ItemRight>
                        </ListRow>
                    ))
                ) : (
                    <EmptyState>No supplies added yet</EmptyState>
                )}
            </CardBody>
            <CardFooter>
                <LinkButton onClick={() => navigation.navigate('WarehouseSupplies', { warehouse, currencyUnit, canEdit: user?.role === 'admin' })}>View Full Inventory →</LinkButton>
            </CardFooter>
        </Card>
    );

    const renderManagers = () => {
        if (user?.role !== 'admin') return null;
        return (
            <Card>
                <CardHeader><h3>Assigned Managers</h3></CardHeader>
                <CardBody>
                    {warehouse.managers && warehouse.managers.length > 0 ? (
                        warehouse.managers.map((m, idx) => (
                            <ListRow key={m._id || idx}>
                                <div className="left"><ItemName>{m.username}</ItemName></div>
                                <ItemRight>Manager</ItemRight>
                            </ListRow>
                        ))
                    ) : (
                        <EmptyState>No manager assigned</EmptyState>
                    )}
                </CardBody>
                <CardFooter>
                    <LinkButton onClick={() => navigation.navigate('ManageWarehouseManagers', { warehouse, adminId: user.id })}>Manage Managers →</LinkButton>
                </CardFooter>
            </Card>
        );
    };

    const renderActivity = () => {
        return (
            <Card>
                <CardHeader><h3>Recent Activity</h3></CardHeader>
                <CardBody>
                    {activityLogs.length > 0 ? (
                        activityLogs.slice(0, 5).map((l, i) => {
                            const { icon, color } = getLogIcon(l.action);
                            return (
                                <LogRow key={i}>
                                    <LogDot dotColor={color}>{icon}</LogDot>
                                    <LogBody>
                                        <LogDesc>{l.description}</LogDesc>
                                        <LogTime>{formatTimestamp(l.timestamp)} • <strong>{l.performedByName}</strong></LogTime>
                                    </LogBody>
                                </LogRow>
                            );
                        })
                    ) : (
                        <EmptyState>No recent activity logged</EmptyState>
                    )}
                </CardBody>
                <CardFooter>
                    <LinkButton onClick={() => { fetchAllLogs('all'); setShowLogsModal(true); }}>View All Logs →</LinkButton>
                </CardFooter>
            </Card>
        );
    };

    return (
        <PageRoot>
            <Topbar>
                <TopbarInner>
                    <TopbarLeft>
                        <BackButton onClick={() => navigation.goBack()}>
                            <IoArrowBack size={20} />
                        </BackButton>
                        <TopbarTitle>Warehouse Details</TopbarTitle>
                    </TopbarLeft>
                    <TopbarRight>{user?.username || user?.name}</TopbarRight>
                </TopbarInner>
            </Topbar>

            {loading && <div style={{ textAlign: 'center', padding: '10px', color: Color.Primary }}>Loading...</div>}

            <MainContent>
                <ContentContainer>
                    <WarehouseCardStyled>
                        <div className="warehouse-left">
                            <WarehouseName>{warehouse.warehouseName || '—'}</WarehouseName>
                            <WarehouseLocation>📍 {warehouse.location || 'Location not set'}</WarehouseLocation>
                        </div>
                        <WarehouseActions>
                            <ActionButton className="primary" onClick={() => navigation.navigate('WarehouseSupplies', { warehouse, currencyUnit, canEdit: user?.role === 'admin' })}>Supplies</ActionButton>
                            {user?.role === 'admin' && (
                                <ActionButton className="ghost" onClick={() => navigation.navigate('ManageWarehouseManagers', { warehouse, adminId: user.id })}>Managers</ActionButton>
                            )}
                        </WarehouseActions>
                    </WarehouseCardStyled>

                    {renderStatCards()}
                    {renderSupplies()}
                    {renderManagers()}
                    {renderActivity()}
                </ContentContainer>
            </MainContent>

            {/* Logs Modal */}
            {showLogsModal && (
                <ModalOverlay onClick={() => setShowLogsModal(false)}>
                    <ModalStyled onClick={(e) => e.stopPropagation()}>
                        <ModalHead>
                            <h3>Activity Logs</h3>
                            <ModalActions>
                                <FilterSelect value={logFilter} onChange={(e) => fetchAllLogs(e.target.value)}>
                                    <option value="all">All Actions</option>
                                    <option value="supply_added">Supplies Added</option>
                                    <option value="supply_updated">Supplies Updated</option>
                                    <option value="supply_deleted">Supplies Deleted</option>
                                    <option value="manager_added">Manager Added</option>
                                    <option value="manager_password_reset">Password Reset</option>
                                </FilterSelect>
                                <CloseModalButton onClick={() => setShowLogsModal(false)}>
                                    <IoClose size={24} />
                                </CloseModalButton>
                            </ModalActions>
                        </ModalHead>

                        <ModalBody>
                            <LogListContainer>
                                {activityLogs.length === 0 ? (
                                    <EmptyState>No activity logs found for the selected filter.</EmptyState>
                                ) : (
                                    activityLogs.map((l, i) => {
                                        const { icon, color } = getLogIcon(l.action);
                                        return (
                                            <LogRow key={i} style={{ borderBottom: '1px solid #f3f6fb', padding: '12px 0' }}>
                                                <LogDot dotColor={color}>{icon}</LogDot>
                                                <LogBody>
                                                    <LogDesc>{l.description}</LogDesc>
                                                    <LogTime>{formatTimestamp(l.timestamp)} • <strong>{l.performedByName}</strong></LogTime>
                                                </LogBody>
                                            </LogRow>
                                        );
                                    })
                                )}
                            </LogListContainer>
                        </ModalBody>
                    </ModalStyled>
                </ModalOverlay>
            )}
        </PageRoot>
    );
}