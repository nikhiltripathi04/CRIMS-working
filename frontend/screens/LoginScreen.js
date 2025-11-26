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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';
const isIpad = isIOS && Platform.isPad;

// Updated ROLES array to include Staff
const ROLES = [
  { key: 'admin', label: 'Admin', color: '#0088E0' },
  { key: 'supervisor', label: 'Supervisor', color: '#4CAF50' },
  { key: 'warehouse_manager', label: 'Warehouse Manager', color: '#E69138' },
  { key: 'staff', label: 'Staff', color: '#9C27B0' }, // Added Staff role (Purple)
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
    if (roleInfo.key === "admin") {
      if (!username.trim()) {
        Alert.alert('Username Required', 'Please enter your username to reset your password.');
        return;
      }
      navigation.navigate('ResetPassword', { username });
    } else {
      Alert.alert(
        'Forgot Password',
        `Please contact your admin to reset your ${roleInfo.label.toLowerCase()} password.`
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: roleInfo.color }]}>
      <KeyboardAvoidingView behavior={isIOS ? 'padding' : 'height'} style={styles.keyboardAvoid}>
        <View style={styles.topContainer}>
          <Text style={styles.headerTitle}>We Say Hello!</Text>
          <Text style={styles.headerSubtitle}>
            Welcome back. Use your username and password to Log in.
          </Text>
        </View>

        <View style={styles.bottomContainer}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View>
              {/* Toggle area for cycling roles */}
              <TouchableOpacity style={styles.toggleRoleButton} onPress={handleToggleRole} activeOpacity={0.7}>
                <Ionicons name="sync-circle" size={32} color={roleInfo.color} style={{ marginRight: 14 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleRoleText, { color: roleInfo.color }]}>
                    {roleInfo.label} Login
                  </Text>
                  <Text style={styles.toggleRoleHint}>
                    Tap here to switch: {ROLE_OPTIONS_LABEL(roleInfo.key)}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={`${roleInfo.label} Username`}
                  placeholderTextColor="#000"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.passwordContainer}>
                <View style={styles.inputWrapper}>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Password"
                      placeholderTextColor="#000"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.passwordVisibilityButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.forgotPasswordBtn}
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: roleInfo.color }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {roleInfo.label.toUpperCase()} LOGIN
                  </Text>
                )}
              </TouchableOpacity>
              {roleInfo.key === 'admin' ? (
                <View style={styles.signupContainer}>
                  <Text style={styles.noAccountText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={handleSignUp}>
                    <Text style={styles.signupText}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.supervisorNote}>
                  {roleInfo.label} accounts are created by admin users
                </Text>
              )}
            </View>
            <Text style={styles.poweredBy}>Powered by FeathrTech</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Helper to show the label of the next role in the cycle
function ROLE_OPTIONS_LABEL(currentKey) {
  const currentIndex = ROLES.findIndex(r => r.key === currentKey);
  const nextRole = ROLES[(currentIndex + 1) % ROLES.length];
  return `Next: ${nextRole.label}`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  topContainer: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: isIpad ? 46 : 28, fontWeight: '700', color: '#fff', fontFamily: 'Akatab', marginTop: isIpad ? 60 : undefined },
  headerSubtitle: { fontSize: isIpad ? 30 : 16, color: '#fff', marginTop: 8, fontFamily: 'Akatab' },
  bottomContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 30,
    marginTop: isIpad ? 120 : 20,
  },
  scrollContainer: { flexGrow: 1, justifyContent: 'space-between' },
  toggleRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F1F1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 26,
    marginTop: isIpad ? 60 : 32,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5,
  },
  toggleRoleText: {
    fontWeight: '700',
    fontSize: isIpad ? 26 : 18,
    fontFamily: 'Akatab',
  },
  toggleRoleHint: {
    color: '#888',
    fontFamily: 'Akatab',
    fontSize: isIpad ? 18 : 13,
    marginTop: 4,
  },
  inputWrapper: {
    backgroundColor: '#F1F1F1',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  input: {
    paddingVertical: 18,
    fontSize: isIpad ? 20 : 16,
    color: '#333',
    fontFamily: 'Akatab',
  },
  passwordContainer: { marginBottom: 24 },
  passwordInputContainer: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: {
    flex: 1,
    paddingVertical: 18,
    fontSize: isIpad ? 20 : 16,
    color: '#333',
    fontFamily: 'Akatab',
  },
  passwordVisibilityButton: { padding: isIpad ? 14 : 10 },
  forgotPasswordBtn: { alignSelf: 'flex-end', marginTop: 8 },
  forgotPasswordText: {
    color: '#666',
    fontSize: isIpad ? 24 : 14,
    fontFamily: 'Akatab',
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: isIpad ? 20 : 16,
    fontWeight: '700',
    fontFamily: 'Akatab',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  noAccountText: { color: '#666', fontSize: isIpad ? 24 : 15, fontFamily: 'Akatab' },
  signupText: { color: '#0088E0', fontSize: isIpad ? 18 : 15, fontWeight: '600', fontFamily: 'Akatab' },
  supervisorNote: {
    color: '#666',
    fontSize: isIpad ? 26 : 14,
    fontFamily: 'Akatab',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  poweredBy: {
    textAlign: 'center',
    fontSize: isIpad ? 26 : 16,
    color: '#000',
    fontStyle: 'bold',
    marginBottom: 16,
    fontFamily: 'Akatab',
  },
});

export default LoginScreen;