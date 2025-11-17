import React, { useState } from 'react';
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
  Switch
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
  const [createSupervisor, setCreateSupervisor] = useState(false);
  const [supervisorUsername, setSupervisorUsername] = useState('');
  const [supervisorPassword, setSupervisorPassword] = useState('');
  const [showSupervisorPassword, setShowSupervisorPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { API_BASE_URL, user } = useAuth();

  const handleCreateSite = async () => {
    if (!siteName || !location) {
      Alert.alert('Error', 'Please enter site name and location');
      return;
    }

    if (createSupervisor && (!supervisorUsername || !supervisorPassword)) {
      Alert.alert('Error', 'Please enter supervisor username and password');
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

      // If creating supervisor, add supervisor data
      if (createSupervisor) {
        siteData.supervisorUsername = supervisorUsername;
        siteData.supervisorPassword = supervisorPassword;
      }

      const response = await axios.post(`${API_BASE_URL}/api/sites`, siteData);

      console.log('Site creation response:', response.data);

      if (createSupervisor) {
        Alert.alert(
          'Success',
          `Site created!\n\nSupervisor credentials:\n\nUsername: ${supervisorUsername}\nPassword: ${supervisorPassword}\n\nSave these, as the password will not be shown again.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Success', 'Site created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Create site error:', error);

      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        Alert.alert('Error', error.response.data.message || 'Failed to create site');
      } else {
        Alert.alert('Error', 'Failed to create site. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2094f3" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Create New Site</Text>
        </View>
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

            {/* Toggle for creating supervisor */}
            <TouchableOpacity
              style={styles.toggleContainer}
              onPress={() => setCreateSupervisor(!createSupervisor)}
              activeOpacity={0.8}
            >
              <View style={styles.toggleLeft}>
                <Ionicons
                  name="person-add-outline"
                  size={isIpad ? 24 : 20}
                  color="#2094f3"
                  style={styles.toggleIcon}
                />
                <View>
                  <Text style={styles.toggleTitle}>Add Supervisor Account</Text>
                  <Text style={styles.toggleSubtitle}>Create login credentials for site supervisor</Text>
                </View>
              </View>
              <Switch
                value={createSupervisor}
                onValueChange={setCreateSupervisor}
                trackColor={{ false: '#ddd', true: '#81b0ff' }}
                thumbColor={createSupervisor ? '#2094f3' : '#f4f3f4'}
                ios_backgroundColor="#ddd"
              />
            </TouchableOpacity>

            {/* Supervisor Fields */}
            {createSupervisor && (
              <View style={styles.supervisorSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Supervisor Username <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={supervisorUsername}
                      onChangeText={setSupervisorUsername}
                      placeholder="Choose username for supervisor"
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
                      placeholder="Set password for supervisor"
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
                      {createSupervisor ? 'Create Site & Supervisor' : 'Create Site'}
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
    paddingTop: Platform.OS === 'ios' ? (isIpad ? 20 : 40) : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginTop: 80
  },
  headerTitle: {
    fontSize: isIpad ? 28 : 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: isIpad ? 20 : 15,
    borderRadius: 12,
    marginBottom: isIpad ? 20 : 15,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    marginRight: isIpad ? 15 : 12,
  },
  toggleTitle: {
    fontSize: isIpad ? 18 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  toggleSubtitle: {
    fontSize: isIpad ? 14 : 12,
    color: '#666',
  },
  supervisorSection: {
    marginTop: isIpad ? 10 : 5,
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
  }
});

export default CreateSiteScreen;