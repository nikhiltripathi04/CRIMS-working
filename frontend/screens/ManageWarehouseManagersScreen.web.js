import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styled, { css, keyframes } from 'styled-components';
import { IoArrowBack, IoPerson, IoLockClosed, IoEye, IoEyeOff, IoKeyOutline, IoTrashOutline, IoAdd, IoCheckmarkCircle, IoRefreshCircle } from 'react-icons/io5';

// --- Web Utilities & Constants ---
const ORANGE = '#E69138';
const ORANGE_DARK = '#C97713';
const DANGER = '#ff4444';
const SUCCESS = '#34c759';
const WHITE = '#fff';
const GRAY_BG = '#F3F4F6';
const SHADOW = '0 4px 6px rgba(0, 0, 0, 0.1)';

const isIpad = window.innerWidth >= 768;

// Web Alert replacement
const WebAlert = (title, message, buttons) => {
    if (buttons) {
        const result = window.confirm(`${title}\n\n${message}`);
        const actionButton = buttons.find(btn => btn.style !== 'cancel');

        if (result && actionButton && actionButton.onPress) {
            actionButton.onPress();
        }
    } else {
        window.alert(`${title}: ${message}`);
    }
};

// Loading spinner keyframes
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// --- Styled Components ---

const Container = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: ${ORANGE_DARK}; /* Fallback for gradient */
`;

const GradientHeader = styled.header`
    background: linear-gradient(90deg, ${ORANGE}, ${ORANGE_DARK});
    color: ${WHITE};
    padding: 20px;
    padding-top: 40px;
    position: sticky;
    top: 0;
    z-index: 20;
`;

const HeaderContent = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 1100px;
    margin: 0 auto;
    width: 100%;
`;

// NEW Back Button Wrapper
const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px; /* Space above title */
`;

const BackButtonWeb = styled.button`
    background: transparent;
    border: none;
    color: ${WHITE};
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px; /* Space between icon and text */
    transition: background 0.2s;
    border-radius: 50%;
    
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;


const Title = styled.h1`
    color: ${WHITE};
    font-weight: bold;
    font-size: 24px;
    margin: 0;
`;

const Subtitle = styled.p`
    color: ${WHITE};
    font-size: 16px;
    margin-top: 4px;
    margin-bottom: 0;
`;

const MainContentArea = styled.div`
    flex: 1;
    background-color: ${GRAY_BG};
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    padding: 20px;
    margin-top: -20px; /* Overlap header */
    box-shadow: ${SHADOW};
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
`;

const ListWrapper = styled.div`
    /* SCROLL FIX: Allow content list to scroll internally */
    flex: 1; 
    overflow-y: auto; 
    padding-right: 15px; /* space for scrollbar */
    margin-right: -15px; /* offset the scrollbar space */
`;

const ListContainer = styled.div`
    padding-bottom: 80px;
    max-width: 100%;
    margin: 0 auto;
    width: 100%;
`;

const Card = styled.div`
    background-color: ${WHITE};
    border-radius: 12px;
    padding: ${isIpad ? '20px' : '16px'};
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const Info = styled.div`
    flex: 1;
`;

const Name = styled.span`
    font-size: ${isIpad ? '18px' : '16px'};
    font-weight: bold;
    color: #333;
    display: block;
`;

const Role = styled.span`
    font-size: ${isIpad ? '16px' : '14px'};
    color: #666;
`;

const Actions = styled.div`
    display: flex;
    gap: 10px;
`;

const ActionButton = styled.button`
    border: none;
    padding: ${isIpad ? '12px' : '10px'};
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
`;

const ViewButton = styled(ActionButton)`
    background-color: rgba(230, 145, 56, 0.1);
    &:hover { background-color: rgba(230, 145, 56, 0.2); }
`;

const DeleteButton = styled(ActionButton)`
    background-color: rgba(255, 68, 68, 0.1);
    &:hover { background-color: rgba(255, 68, 68, 0.2); }
`;

const AddButton = styled.button`
    position: fixed;
    bottom: 30px;
    right: 30px;
    background-color: ${ORANGE};
    width: ${isIpad ? '70px' : '60px'};
    height: ${isIpad ? '70px' : '60px'};
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    transition: background-color 0.2s;
    z-index: 10;
    
    &:hover {
        background-color: ${ORANGE_DARK};
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    margin-top: 80px;
    text-align: center;
`;

const EmptyText = styled.p`
    font-size: 16px;
    font-weight: 500;
    color: #666;
    margin-top: 10px;
`;

const EmptySubtext = styled.p`
    font-size: 14px;
    color: #888;
    margin-top: 5px;
`;

// --- Modal Styles (omitted for brevity, assume they remain correct) ---

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
`;

const ModalContent = styled.div`
    background-color: ${WHITE};
    width: min(90%, 400px);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
`;

const ModalTitle = styled.h2`
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 20px;
    color: #333;
    text-align: center;
    margin-top: 0;
`;

const InputContainer = styled.div`
    display: flex;
    align-items: center;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-bottom: 12px;
    padding: 0 10px;
    height: 50px;
`;

const Input = styled.input`
    flex: 1;
    height: 100%;
    border: none;
    outline: none;
    font-size: 16px;
    color: #333;
    padding: 0 8px;
`;

const InputIcon = styled.div`
    margin-right: 8px;
    color: ${ORANGE};
    display: flex;
    align-items: center;
`;

const VisibilityButton = styled.button`
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
`;

const ModalButtons = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 20px;
    gap: 10px;
`;

const Button = styled.button`
    flex: 1;
    border-radius: 8px;
    align-items: center;
    padding: 12px;
    border: none;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;

    &:disabled {
        background-color: #ccc !important;
        cursor: not-allowed;
    }
`;

const CancelButton = styled(Button)`
    background-color: #eee;
    color: #333;
    &:hover:not(:disabled) { background-color: #ddd; }
`;

const CreateButton = styled(Button)`
    background-color: ${ORANGE};
    color: ${WHITE};
    &:hover:not(:disabled) { background-color: ${ORANGE_DARK}; }
`;

const ResetButton = styled(CreateButton)``;


const CredentialsModalContent = styled(ModalContent)`
    padding: 24px;
    align-items: center;
    text-align: center;
    border-radius: 16px;
`;

const CredentialsHeader = styled.div`
    align-items: center;
    margin-bottom: 20px;
`;

const CredentialsTitle = styled.h3`
    font-size: 22px;
    font-weight: bold;
    color: #333;
    margin-top: 12px;
    margin-bottom: 0;
`;

const CredentialsSubtitle = styled.p`
    font-size: 14px;
    color: #666;
    margin-bottom: 20px;
    padding: 0 10px;
`;

const CredentialBox = styled.div`
    background-color: #f5f5f5;
    border-radius: 12px;
    padding: 20px;
    width: 100%;
    margin-bottom: 16px;
`;

const CredentialItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    &:last-child { margin-bottom: 0; }
`;

const CredentialLabel = styled.span`
    font-size: 14px;
    color: #666;
    font-weight: 500;
`;

const CredentialValue = styled.span`
    font-size: 16px;
    color: #333;
    font-weight: bold;
    font-family: monospace;
`;

const CredentialsWarning = styled.p`
    font-size: 12px;
    color: ${DANGER};
    margin-bottom: 16px;
    font-style: italic;
`;

const ResetPasswordButton = styled(Button)`
    background-color: ${ORANGE};
    color: ${WHITE};
    width: 100%;
    margin-bottom: 12px;
    &:hover { background-color: ${ORANGE_DARK}; }
`;

const CloseButton = styled(Button)`
    background-color: #f5f5f5;
    color: #333;
    width: 100%;
    &:hover { background-color: #ddd; }
`;

const ResetPasswordInfo = styled.p`
    font-size: 14px;
    color: #666;
    text-align: center;
    margin-bottom: 20px;
    padding: 0 10px;
`;

const ActivityIndicatorStyled = styled.div`
    animation: ${spin} 1s linear infinite;
    display: inline-block;
`;


// --- Component Implementation ---

const ManageWarehouseManagersScreen = ({ route, navigation }) => {
    const { warehouse } = route.params;
    const { API_BASE_URL, user } = useAuth();

    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Create Manager
    const [modalVisible, setModalVisible] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    // Credentials Modal
    const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
    const [selectedManager, setSelectedManager] = useState(null);

    // Reset Password Modal
    const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

    const resetForm = () => {
        setFormData({ username: '', password: '' });
        setShowPassword(false);
    };

    /** -------- Fetch all managers -------- */
    const fetchManagers = async () => {
        if (!user?.id || !warehouse?._id) return;
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/warehouses/${warehouse._id}/managers?userId=${user.id}`
            );
            if (res.data?.success) {
                setManagers(res.data.data || []);
            } else {
                WebAlert('Error', 'Failed to fetch managers');
            }
        } catch (e) {
            console.log('Error fetching managers:', e?.response?.data || e.message);
            WebAlert('Error', 'Failed to fetch managers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchManagers();
    }, [user?.id]);

    /** -------- Create Manager -------- */
    const createManager = async () => {
        if (!formData.username || !formData.password) {
            WebAlert('Error', 'Please enter username and password');
            return;
        }
        if (!user?.id) {
            WebAlert('Error', 'You must be logged in as admin');
            return;
        }

        try {
            setLoading(true);
            const res = await axios.post(
                `${API_BASE_URL}/api/warehouses/${warehouse._id}/managers`,
                { username: formData.username, password: formData.password, adminId: user.id }
            );

            if (res.data?.success) {
                await fetchManagers();
                setSelectedManager({
                    _id: res.data.data?.id,
                    username: formData.username,
                    password: formData.password,
                    isNew: true,
                });
                setCredentialsModalVisible(true);
                setModalVisible(false);
                resetForm();
            } else {
                WebAlert('Error', res.data?.message || 'Failed to create manager');
            }
        } catch (e) {
            console.log('Error creating manager:', e?.response?.data || e.message);
            WebAlert('Error', e?.response?.data?.message || 'Failed to create manager');
        } finally {
            setLoading(false);
        }
    };

    /** -------- Reset Password -------- */
    const resetManagerPassword = async () => {
        if (!newPassword) {
            WebAlert('Error', 'Please enter a new password');
            return;
        }
        if (!user?.id) {
            WebAlert('Error', 'You must be logged in as admin');
            return;
        }

        setResetPasswordLoading(true);
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/warehouses/${warehouse._id}/managers/${selectedManager._id}/reset-password`,
                { newPassword, adminId: user.id }
            );

            if (res.data?.success) {
                setSelectedManager({
                    ...selectedManager,
                    password: newPassword,
                    isReset: true,
                });
                setResetPasswordModalVisible(false);
                setCredentialsModalVisible(true);
                setNewPassword('');
                setShowNewPassword(false);
            } else {
                WebAlert('Error', res.data?.message || 'Failed to reset password');
            }
        } catch (e) {
            console.log('Error resetting password:', e?.response?.data || e.message);
            WebAlert('Error', 'Failed to reset manager password');
        } finally {
            setResetPasswordLoading(false);
        }
    };

    const openResetPasswordModal = () => {
        setCredentialsModalVisible(false);
        // Delay opening the next modal slightly for smoother visual transition
        setTimeout(() => setResetPasswordModalVisible(true), 300);
    };

    /** -------- Delete Manager -------- */
    const deleteManager = async (managerId, username) => {
        if (!user?.id) {
            WebAlert('Error', 'You must be logged in as admin');
            return;
        }

        WebAlert(
            'Confirm Delete',
            `Are you sure you want to remove warehouse manager "${username}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await axios.delete(
                                `${API_BASE_URL}/api/warehouses/${warehouse._id}/managers/${managerId}?userId=${user.id}`
                            );
                            await fetchManagers();
                            WebAlert('Success', `Manager "${username}" removed successfully`);
                        } catch (e) {
                            console.log('Error deleting manager:', e?.response?.data || e.message);
                            WebAlert('Error', 'Failed to remove manager');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const showCredentials = (manager) => {
        setSelectedManager({ ...manager, password: '', isNew: false, isReset: false });
        setCredentialsModalVisible(true);
    };

    const renderManagerItem = (item) => (
        <Card key={item._id?.toString() || Math.random().toString()}>
            <Info>
                <Name>{item.username}</Name>
                <Role>Warehouse Manager</Role>
            </Info>

            <Actions>
                <ViewButton onClick={() => showCredentials(item)}>
                    <IoKeyOutline size={isIpad ? 26 : 22} color={ORANGE} />
                </ViewButton>
                <DeleteButton onClick={() => deleteManager(item._id, item.username)}>
                    <IoTrashOutline size={isIpad ? 26 : 22} color={DANGER} />
                </DeleteButton>
            </Actions>
        </Card>
    );

    /** -------- UI -------- */
    if (!user) {
        return (
            <Container style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: ORANGE }}>
                <ActivityIndicatorStyled>
                    <IoRefreshCircle size={48} color={WHITE} />
                </ActivityIndicatorStyled>
                <p style={{ marginTop: 20, color: WHITE, fontSize: isIpad ? 18 : 16 }}>Loading user data...</p>
            </Container>
        );
    }

    return (
        <Container>
            <GradientHeader>
                <HeaderContent>
                    <HeaderRow>
                        {/* BACK BUTTON IMPLEMENTATION */}
                        {/* Assuming navigation.goBack() exists in the parent router context */}
                        <BackButtonWeb onClick={() => navigation.goBack()}>
                            <IoArrowBack size={24} />
                        </BackButtonWeb>
                        {/* Empty div to balance space if needed, or remove if Title spans full width */}
                        <div style={{ flex: 1 }}></div> 
                    </HeaderRow>
                    <Title>Warehouse Managers</Title>
                    <Subtitle>{warehouse.warehouseName}</Subtitle>
                </HeaderContent>
            </GradientHeader>

            <MainContentArea>
                <ListWrapper>
                    <ListContainer>
                        {loading && managers.length === 0 ? (
                            <EmptyState>
                                <ActivityIndicatorStyled>
                                    <IoRefreshCircle size={48} color={ORANGE} />
                                </ActivityIndicatorStyled>
                                <EmptyText>Loading managers...</EmptyText>
                            </EmptyState>
                        ) : managers.length === 0 ? (
                            <EmptyState>
                                <IoPerson size={isIpad ? 80 : 64} color="#9CA3AF" />
                                <EmptyText>No managers assigned</EmptyText>
                                <EmptySubtext>Click the + button to add a warehouse manager</EmptySubtext>
                            </EmptyState>
                        ) : (
                            managers.map(renderManagerItem)
                        )}
                    </ListContainer>
                </ListWrapper>

                <AddButton onClick={() => setModalVisible(true)}>
                    <IoAdd size={isIpad ? 30 : 24} color={WHITE} />
                </AddButton>
            </MainContentArea>

            {/* Create Manager Modal */}
            {modalVisible && (
                <ModalOverlay onClick={() => setModalVisible(false)}>
                    <ModalContent onClick={(e) => e.stopPropagation()}>
                        <ModalTitle>Create Warehouse Manager</ModalTitle>
                        
                        <InputContainer>
                            <InputIcon><IoPerson size={20} /></InputIcon>
                            <Input
                                placeholder="Username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                autoCapitalize="none"
                            />
                        </InputContainer>
                        
                        <InputContainer>
                            <InputIcon><IoLockClosed size={20} /></InputIcon>
                            <Input
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                type={showPassword ? 'text' : 'password'}
                                autoCapitalize="none"
                            />
                            <VisibilityButton onClick={() => setShowPassword(!showPassword)}>
                                <IoEye size={20} color={ORANGE} />
                            </VisibilityButton>
                        </InputContainer>

                        <ModalButtons>
                            <CancelButton onClick={() => setModalVisible(false)} disabled={loading}>
                                Cancel
                            </CancelButton>
                            <CreateButton onClick={createManager} disabled={loading}>
                                {loading ? (
                                    <ActivityIndicatorStyled>
                                        <IoRefreshCircle size={20} color={WHITE} />
                                    </ActivityIndicatorStyled>
                                ) : (
                                    'Create'
                                )}
                            </CreateButton>
                        </ModalButtons>
                    </ModalContent>
                </ModalOverlay>
            )}

            {/* Credentials Modal */}
            {credentialsModalVisible && selectedManager && (
                <ModalOverlay onClick={() => setCredentialsModalVisible(false)}>
                    <CredentialsModalContent onClick={(e) => e.stopPropagation()}>
                        <CredentialsHeader>
                            {selectedManager?.isNew ? (
                                <IoCheckmarkCircle size={isIpad ? 56 : 48} color={SUCCESS} />
                            ) : selectedManager?.isReset ? (
                                <IoRefreshCircle size={isIpad ? 56 : 48} color={ORANGE} />
                            ) : (
                                <IoKeyOutline size={isIpad ? 56 : 48} color={ORANGE} />
                            )}
                            <CredentialsTitle>
                                {selectedManager?.isNew ? 'Manager Created' :
                                    selectedManager?.isReset ? 'Password Reset Successfully' :
                                        'Manager Credentials'}
                            </CredentialsTitle>
                        </CredentialsHeader>

                        <CredentialsSubtitle>
                            {selectedManager?.isNew ?
                                'Save these credentials in a secure place:' :
                                selectedManager?.isReset ?
                                    'New password has been set. The manager will need to log in again.' :
                                    'Login credentials for this manager:'}
                        </CredentialsSubtitle>

                        <CredentialBox>
                            <CredentialItem>
                                <CredentialLabel>Username:</CredentialLabel>
                                <CredentialValue>{selectedManager.username}</CredentialValue>
                            </CredentialItem>
                            <CredentialItem>
                                <CredentialLabel>Password:</CredentialLabel>
                                <CredentialValue>
                                    {(selectedManager?.isNew || selectedManager?.isReset) ?
                                        selectedManager.password : '••••••••'}
                                </CredentialValue>
                            </CredentialItem>
                        </CredentialBox>

                        {(selectedManager?.isNew || selectedManager?.isReset) && (
                            <CredentialsWarning>
                                This password will not be shown again!
                            </CredentialsWarning>
                        )}

                        {!selectedManager?.isNew && !selectedManager?.isReset && (
                            <ResetPasswordButton onClick={openResetPasswordModal}>
                                Reset Password
                            </ResetPasswordButton>
                        )}

                        <CloseButton onClick={() => setCredentialsModalVisible(false)}>
                            Close
                        </CloseButton>
                    </CredentialsModalContent>
                </ModalOverlay>
            )}

            {/* Reset Password Modal */}
            {resetPasswordModalVisible && selectedManager && (
                <ModalOverlay onClick={() => {
                    setResetPasswordModalVisible(false);
                    setNewPassword('');
                    setShowNewPassword(false);
                }}>
                    <ModalContent onClick={(e) => e.stopPropagation()}>
                        <ModalTitle>Reset Password</ModalTitle>

                        <ResetPasswordInfo>
                            You are resetting the password for manager **"{selectedManager.username}"**.
                            This will force the manager to log in again.
                        </ResetPasswordInfo>

                        <InputContainer>
                            <InputIcon>
                                <IoLockClosed size={isIpad ? 24 : 20} />
                            </InputIcon>
                            <Input
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                type={showNewPassword ? 'text' : 'password'}
                                autoCapitalize="none"
                                autoCorrect="false"
                            />
                            <VisibilityButton onClick={() => setShowNewPassword(!showNewPassword)}>
                                <IoEye size={isIpad ? 24 : 20} color={ORANGE} />
                            </VisibilityButton>
                        </InputContainer>

                        <ModalButtons>
                            <CancelButton
                                onClick={() => {
                                    setResetPasswordModalVisible(false);
                                    setNewPassword('');
                                    setShowNewPassword(false);
                                }}
                                disabled={resetPasswordLoading}
                            >
                                Cancel
                            </CancelButton>

                            <ResetButton
                                onClick={resetManagerPassword}
                                disabled={resetPasswordLoading || newPassword.length === 0}
                            >
                                {resetPasswordLoading ? (
                                    <ActivityIndicatorStyled>
                                        <IoRefreshCircle size={20} color={WHITE} />
                                    </ActivityIndicatorStyled>
                                ) : (
                                    'Reset Password'
                                )}
                            </ResetButton>
                        </ModalButtons>
                    </ModalContent>
                </ModalOverlay>
            )}
        </Container>
    );
};

export default ManageWarehouseManagersScreen;