import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// Get screen dimensions for responsive design
const { width: screenWidth } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const CreateSiteScreen = ({ navigation }) => {
  const [siteName, setSiteName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Supervisor Logic (Updated to match web)
  const [supervisorMode, setSupervisorMode] = useState('none'); // 'none', 'new', 'existing'
  const [supervisorUsername, setSupervisorUsername] = useState('');
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [showSupervisorPassword, setShowSupervisorPassword] = useState(false);

  const [existingSupervisors, setExistingSupervisors] = useState([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [isSupervisorModalVisible, setIsSupervisorModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const { API_BASE_URL, user, token } = useAuth(); // Assuming 'token' is available or auth header is handled

  useEffect(() => {
    if (user && user.id) {
      fetchSupervisors();
    }
  }, [user]);

  const fetchSupervisors = async () => {
    try {
      // Ensure we pass token if required, though previous code implies adminId might be enough or handled globally
      // Replicating web fetch logic:
      const res = await axios.get(`${API_BASE_URL}/api/auth/supervisors?adminId=${user.id}`);
      if (res.data.success) {
        setExistingSupervisors(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const handleCreateSite = async () => {
    if (!siteName.trim() || !location.trim()) {
      Alert.alert('Error', 'Please enter site name and location');
      return;
    }

    if (supervisorMode === 'new' && (!supervisorUsername.trim() || !supervisorPassword.trim())) {
      Alert.alert('Error', 'Please enter supervisor username and password');
      return;
    }

    if (supervisorMode === 'existing' && !selectedSupervisor) {
      Alert.alert('Error', 'Please select a supervisor');
      return;
    }

    if (!user || !user.id) {
      Alert.alert('Error', 'User information not available. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Create site data
      const siteData = {
        siteName,
        location,
        description,
        adminId: user.id
      };

      // Add supervisor data based on mode
      if (supervisorMode === 'new') {
        siteData.supervisorUsername = supervisorUsername;
        siteData.supervisorPassword = supervisorPassword;
      } else if (supervisorMode === 'existing') {
        siteData.existingSupervisorId = selectedSupervisor._id;
      }

      const response = await axios.post(`${API_BASE_URL}/api/sites`, siteData);

      console.log('Site creation response:', response.data);

      if (supervisorMode === 'new') {
        Alert.alert(
          'Success',
          `Site created!\n\nSupervisor credentials:\n\nUsername: ${supervisorUsername}\nPassword: ${supervisorPassword}\n\nSave these, as the password will not be shown again.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }] // Or navigation.navigate('AdminDashboard') to refresh
        );
      } else {
        Alert.alert('Success', 'Site created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Create site error:', error);

      if (error.response) {
        Alert.alert('Error', error.response.data.message || 'Failed to create site');
      } else {
        Alert.alert('Error', 'Failed to create site. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Render for Supervisor Selection Modal
  const renderSupervisorItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setSelectedSupervisor(item);
        setIsSupervisorModalVisible(false);
      }}
    >
      <View style={styles.modalItemIcon}>
        <Text style={styles.modalItemInitials}>{item.username.charAt(0).toUpperCase()}</Text>
      </View>
      <View>
        <Text style={styles.modalItemText}>{item.username}</Text>
        <Text style={styles.modalItemSubText}>
          {item.assignedSites?.length ? `${item.assignedSites.length} sites assigned` : 'No sites assigned'}
        </Text>
      </View>
      {selectedSupervisor?._id === item._id && (
        <Ionicons name="checkmark-circle" size={24} color="#2094f3" style={{ marginLeft: 'auto' }} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2094f3" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Site</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Site Name <Text style={styles.requiredStar}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={siteName}
                  onChangeText={setSiteName}
                  placeholder="Enter site name"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location <Text style={styles.requiredStar}>*</Text></Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter location"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <Ionicons
                  name="document-text-outline"
                  size={isIpad ? 24 : 20}
                  color="#666"
                  style={[styles.inputIcon, styles.textAreaIcon]}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter site description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Supervisor Section Divider */}
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Supervisor Assignment</Text>

            {/* Supervisor Mode Selection */}
            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[styles.modeButton, supervisorMode === 'none' && styles.modeButtonActive]}
                onPress={() => setSupervisorMode('none')}
              >
                <Ionicons name="ban-outline" size={20} color={supervisorMode === 'none' ? '#fff' : '#666'} />
                <Text style={[styles.modeText, supervisorMode === 'none' && styles.modeTextActive]}>None</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeButton, supervisorMode === 'new' && styles.modeButtonActive]}
                onPress={() => setSupervisorMode('new')}
              >
                <Ionicons name="person-add-outline" size={20} color={supervisorMode === 'new' ? '#fff' : '#666'} />
                <Text style={[styles.modeText, supervisorMode === 'new' && styles.modeTextActive]}>New</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeButton, supervisorMode === 'existing' && styles.modeButtonActive]}
                onPress={() => setSupervisorMode('existing')}
              >
                <Ionicons name="people-outline" size={20} color={supervisorMode === 'existing' ? '#fff' : '#666'} />
                <Text style={[styles.modeText, supervisorMode === 'existing' && styles.modeTextActive]}>Existing</Text>
              </TouchableOpacity>
            </View>

            {/* New Supervisor Fields */}
            {supervisorMode === 'new' && (
              <View style={styles.supervisorSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Supervisor Username <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={supervisorUsername}
                      onChangeText={setSupervisorUsername}
                      placeholder="Choose username"
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Supervisor Password <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={supervisorPassword}
                      onChangeText={setSupervisorPassword}
                      placeholder="Set password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showSupervisorPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowSupervisorPassword(!showSupervisorPassword)}
                      style={{ paddingHorizontal: 10 }}
                    >
                      <Ionicons
                        name={showSupervisorPassword ? 'eye' : 'eye-off'}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Existing Supervisor Selection */}
            {supervisorMode === 'existing' && (
              <View style={styles.supervisorSection}>
                <Text style={styles.label}>Select Supervisor <Text style={styles.requiredStar}>*</Text></Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setIsSupervisorModalVisible(true)}
                >
                  <Ionicons name="person-outline" size={20} color="#666" style={{ marginRight: 10 }} />
                  <Text style={[styles.selectorText, !selectedSupervisor && { color: '#999' }]}>
                    {selectedSupervisor ? selectedSupervisor.username : 'Select a Supervisor'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleCreateSite}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size={isIpad ? "large" : "small"} />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={isIpad ? 24 : 20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>
                      Create Site
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={isIpad ? 24 : 20} color="#333" style={styles.buttonIcon} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Supervisor Selection Modal */}
      <Modal
        visible={isSupervisorModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSupervisorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Supervisor</Text>
              <TouchableOpacity onPress={() => setIsSupervisorModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={existingSupervisors}
              keyExtractor={item => item._id}
              renderItem={renderSupervisorItem}
              ListEmptyComponent={<Text style={styles.emptyListText}>No supervisors found.</Text>}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2094f3',
  },
  header: {
    backgroundColor: '#2094f3',
    paddingTop: Platform.OS === 'ios' ? (isIpad ? 20 : 10) : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5
  },
  headerTitle: {
    fontSize: isIpad ? 24 : 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: '#2094f3',
  },
  contentContainer: {
    padding: isIpad ? 40 : 20,
    paddingTop: isIpad ? 20 : 10,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: isIpad ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: isIpad ? 30 : 20,
  },
  label: {
    fontSize: isIpad ? 18 : 16,
    marginBottom: isIpad ? 12 : 8,
    color: '#333',
    fontWeight: '600',
    paddingLeft: 4,
  },
  requiredStar: {
    color: '#ff3b30',
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: isIpad ? 16 : 12,
  },
  input: {
    flex: 1,
    padding: isIpad ? 18 : 15,
    fontSize: isIpad ? 18 : 16,
    color: '#333',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  textAreaIcon: {
    paddingTop: isIpad ? 18 : 15,
  },
  textArea: {
    height: isIpad ? 150 : 100,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: isIpad ? 25 : 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#f0f2f5',
    padding: 4,
    borderRadius: 12
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5
  },
  modeButtonActive: {
    backgroundColor: '#2094f3',
    elevation: 2
  },
  modeText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14
  },
  modeTextActive: {
    color: '#fff'
  },
  supervisorSection: {
    marginTop: isIpad ? 10 : 5,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#fff'
  },
  selectorText: {
    fontSize: 16,
    color: '#333'
  },
  buttonContainer: {
    marginTop: isIpad ? 30 : 20,
  },
  button: {
    backgroundColor: '#2094f3',
    padding: isIpad ? 18 : 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: isIpad ? 16 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#82b8ed',
  },
  buttonText: {
    color: '#fff',
    fontSize: isIpad ? 18 : 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    padding: isIpad ? 18 : 15,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: isIpad ? 18 : 16,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '60%', // Take up 60% of screen
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15
  },
  modalItemInitials: {
    color: '#2094f3',
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500'
  },
  modalItemSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999'
  }
});

export default CreateSiteScreen;