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
  ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Get screen dimensions for responsive design
const { width: screenWidth } = Dimensions.get("window");
const isIpad = screenWidth >= 768;

const CreateStaffScreen = () => {
  const navigation = useNavigation();
  const { API_BASE_URL, token } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateStaff = async () => {
    // 1. Validation
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter a full name');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Authentication token missing. Please login again.');
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
      Alert.alert(
        'Success',
        `Staff member created successfully!\n\nUsername: ${username}\nPassword: ${password}\n\nPlease save these credentials.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to create staff member';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#AF52DE" />

      {/* Header Section */}
      <View style={styles.headerWrapper}>
        <ImageBackground
          // source={{ uri: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop' }}
          style={styles.headerBackground}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['#AF52DE99', '#AF52DE99']}
            style={styles.headerGradient}
          >
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.headerContent}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Staff Member</Text>
                <View style={{ width: 40 }} />
              </View>
            </SafeAreaView>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCard}>

              {/* Header Icon/Description inside Card */}
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="person" size={24} color="#AF52DE" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Staff Details</Text>
                  <Text style={styles.cardSubtitle}>Create account for general staff access</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Username Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="id-card-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="e.g. johndoe"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={isIpad ? 24 : 20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ paddingHorizontal: 10 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye' : 'eye-off'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleCreateStaff}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size={isIpad ? "large" : "small"} />
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={isIpad ? 24 : 20} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>
                        Create Staff Member
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#AF52DE',
  },
  headerWrapper: {
    height: screenWidth * 0.55,
    maxHeight: 220,
    width: '100%',
  },
  headerBackground: {
    flex: 1,
    width: '100%',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },

  // Content
  contentContainer: {
    flex: 1,
    backgroundColor: '#F2F4F8',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    overflow: 'hidden',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: isIpad ? 20 : 18,
    fontWeight: '700',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: isIpad ? 16 : 14,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: isIpad ? 25 : 20,
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
  buttonContainer: {
    marginTop: isIpad ? 30 : 20,
  },
  button: {
    backgroundColor: '#AF52DE',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#AF52DE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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

export default CreateStaffScreen;