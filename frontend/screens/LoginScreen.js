import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

// Updated ROLES array to include Staff
const ROLES = [
  { key: 'admin', label: 'Admin', color: '#0088E0' },
  { key: 'supervisor', label: 'Supervisor', color: '#4CAF50' },
  { key: 'warehouse_manager', label: 'Warehouse Manager', color: '#E69138' },
  { key: 'staff', label: 'Staff', color: '#9C27B0' }, // Added Staff role
];

function getRoleInfo(index) {
  return ROLES[index % ROLES.length];
}

const LoginScreen = () => {
  const [roleIndex, setRoleIndex] = useState(0);
  const roleInfo = getRoleInfo(roleIndex);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation();

  const handleToggleRole = () => {
    setRoleIndex((roleIndex + 1) % ROLES.length);
    setUsername('');
    setPassword('');
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    setLoading(true);
    // The login function handles the specific endpoint based on roleInfo.key
    const result = await login(username, password, roleInfo.key);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.message);
    }
  };

  const handleSignUp = () => {
    if (roleInfo.key === "admin") {
      navigation.navigate('SignUp');
    } else {
      Alert.alert(
        'Account Creation Restricted',
        `${roleInfo.label} accounts are created by admin users. Please contact your admin for credentials.`
      );
    }
  };

  const handleForgotPassword = () => {
    if (roleInfo.key === 'admin') {
      Alert.alert(
        'Forgot Password',
        'Please contact your Company to reset your password.'
      );
    } else {
      Alert.alert(
        'Forgot Password',
        `Please contact your admin to reset your ${roleInfo.label.toLowerCase()} password.`
      );
    }
  };

  // Helper helper to get an overlay color based on role with some opacity
  // Assuming colors are hex 6 digits. adding 99 for ~60% opacity.
  const overlayColor = roleInfo.color + '99';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Image Section */}
      <View style={styles.topSection}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop' }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[overlayColor, overlayColor]}
            style={styles.overlay}
          >
            <SafeAreaView style={styles.headerContainer}>
              <Text style={styles.greetingText}>Hello!</Text>
              <View style={styles.pillContainer}>
                <Text style={styles.pillText}>Welcome to ConERP</Text>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Bottom Sheet Section */}
      <View style={styles.bottomSheet}>
        <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

            <View style={styles.sheetHeader}>
              <Text style={[styles.loginHeader, { color: roleInfo.color }]}>Login</Text>

              {/* Toggle Role Button - integrated into the flow */}
              <TouchableOpacity onPress={handleToggleRole} style={styles.roleSwitcher}>
                <Ionicons name="sync" size={20} color={roleInfo.color} />
                <Text style={[styles.roleSwitcherText, { color: roleInfo.color }]}>
                  {roleInfo.label}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={`${roleInfo.label} Username`}
                  placeholderTextColor="#A0A0A0"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Password"
                    placeholderTextColor="#A0A0A0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.passwordIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color="#A0A0A0"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButtonWrapper}
                onPress={handleLogin}
                disabled={loading}
              >
                <LinearGradient
                  colors={[roleInfo.color, roleInfo.color]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>LOGIN</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {roleInfo.key === 'admin' ? (
                <View style={[styles.signupContainer, { flexDirection: 'column', alignItems: 'center' }]}>
                  <Text style={[styles.signupText, { marginBottom: 4 }]}>Admin accounts are created by Company.</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.signupText}>Don't have an account? </Text>
                    <TouchableOpacity>
                      <Text style={[styles.signupLink, { color: roleInfo.color }]}>Contact your Company</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.supervisorNote}>
                  {roleInfo.label} accounts are created by admin users
                </Text>
              )}

              <Text style={styles.poweredBy}>Powered by FeathrTech</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

// Helper for Next Role Label if needed, though UI simplified
// function ROLE_OPTIONS_LABEL(currentKey) { ... }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topSection: {
    height: height * 0.4, // Takes up top 40%
    width: '100%',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingBottom: 40,
  },
  greetingText: {
    fontSize: isIpad ? 60 : 48,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Akatab',
    marginTop: 20,
  },
  /* subGreetingText removed/replaced */
  pillContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
    marginTop: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pillText: {
    fontSize: isIpad ? 24 : 16,
    color: '#000',
    fontFamily: 'Akatab',
    fontWeight: 'bold',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -40, // Overlap the image
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  loginHeader: {
    fontSize: isIpad ? 40 : 32,
    fontWeight: 'bold',
    fontFamily: 'Akatab',
  },
  roleSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleSwitcherText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Akatab',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Akatab',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordIcon: {
    padding: 10,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#333',
    fontSize: 14,
    fontFamily: 'Akatab',
  },
  loginButtonWrapper: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 20,
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54, // Ensure clickable area
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: 'Akatab',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  signupText: {
    color: '#333',
    fontSize: 14,
    fontFamily: 'Akatab',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Akatab',
  },
  supervisorNote: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Akatab',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  poweredBy: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    fontFamily: 'Akatab',
    marginTop: 10,
  }
});

export default LoginScreen;