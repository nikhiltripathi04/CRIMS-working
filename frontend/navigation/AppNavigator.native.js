import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

// --- Screens (Expo picks .native.js or .js) ---
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '@/screens/SignUpScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import OnboardingScreen from '@/screens/Onboarding';
import NextScreen from '@/screens/Next';

// Admin
import AdminDashboard from '../screens/AdminDashboard';
import CreateSiteScreen from '../screens/CreateSiteScreen';
import CreateWarehouseScreen from '../screens/CreateWarehouseScreen';
import CreateStaffScreen from '@/screens/CreateStaffScreen';
import CreateSupervisorScreen from '@/screens/CreateSupervisorScreen'; // NEW
import SiteDetailsScreen from '../screens/SiteDetailsScreen';
import WarehouseDetailsScreen from '../screens/WarehouseDetailsScreen';
import StaffDetailsScreen from '@/screens/StaffDetailsScreen';
import ManageSuppliesScreen from '../screens/ManageSuppliesScreen';
import ManageWorkersScreen from '../screens/ManageWorkersScreen';
import ManageSupervisorsScreen from '../screens/ManageSupervisorsScreen';
import ManageWarehouseManagersScreen from '../screens/ManageWarehouseManagersScreen';
import WarehouseSuppliesScreen from '../screens/WarehouseSuppliesScreen';
import WarehouseReportsScreen from '../screens/WarehouseReportsScreen';
// import AdminMessagesScreen from '@/screens/AdminMessagesScreen'; // Commented out in your original native code

// Warehouse Manager
import WarehouseManagerDashboard from '../screens/WarehouseManagerDashboard';
import CreateSupplyRequestScreen from '@/screens/CreateSupplyRequestScreen';
import SupplyRequestStatusScreen from '@/screens/SupplyRequestStatusScreen';

// Staff & Supervisor
import StaffDashboard from '@/screens/StaffDashboard';
import SupervisorDashboard from '../screens/SupervisorDashboard';
import SupervisorSuppliesScreen from '../screens/SupervisorSuppliesScreen';
import AttendanceReport from '@/screens/AttendanceReport';
import SupervisorDetailScreen from '@/screens/SupervisorDetailScreen';
import Announcements from '@/screens/Announcements';
import SupervisorMessageScreen from '@/screens/SupervisorMessageScreen'; // NEW

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(onboardingStatus === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setTimeout(() => {
          setShowSplash(false);
          setInitializing(false);
        }, 3000); // 3 seconds for Mobile
      }
    };
    checkOnboardingStatus();
  }, []);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasSeenOnboarding(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  if (showSplash) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  if (loading || initializing) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#007bff' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {!hasSeenOnboarding ? (
          <>
            <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
              {props => <OnboardingScreen {...props} onComplete={completeOnboarding} />}
            </Stack.Screen>
            <Stack.Screen name="Next" options={{ headerShown: false }}>
              {props => <NextScreen {...props} onComplete={completeOnboarding} />}
            </Stack.Screen>
          </>
        ) : !user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
          </>
        ) : user.role === 'admin' ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} />
            <Stack.Screen name="CreateSite" component={CreateSiteScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateWarehouse" component={CreateWarehouseScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateStaff" component={CreateStaffScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateSupervisor" component={CreateSupervisorScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SiteDetails" component={SiteDetailsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="WarehouseDetails" component={WarehouseDetailsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StaffDetails" component={StaffDetailsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="WarehouseSupplies" component={WarehouseSuppliesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="WarehouseReports" component={WarehouseReportsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageSupplies" component={ManageSuppliesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageWorkers" component={ManageWorkersScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SupervisorDetail" component={SupervisorDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageSupervisors" component={ManageSupervisorsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Announcements" component={Announcements} options={{ headerShown: false }} />
            <Stack.Screen name="ManageWarehouseManagers" component={ManageWarehouseManagersScreen} options={{ headerShown: false }} />
          </>
        ) : user.role === 'warehouse_manager' ? (
          <>
            <Stack.Screen name="WarehouseManagerDashboard" component={WarehouseManagerDashboard} options={{ headerShown: false }} />
            <Stack.Screen name="WarehouseSupplies" component={WarehouseSuppliesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="WarehouseReports" component={WarehouseReportsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateSupplyRequest" component={CreateSupplyRequestScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SupplyRequestStatus" component={SupplyRequestStatusScreen} options={{ headerShown: false }} />
          </>
        ) : user.role === 'staff' ? (
          <>
            <Stack.Screen name="StaffDashboard" component={StaffDashboard} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="SupervisorDashboard" component={SupervisorDashboard} options={{ headerShown: false }} />
            <Stack.Screen name="SupervisorSupplies" component={SupervisorSuppliesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SupplyRequestStatus" component={SupplyRequestStatusScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageSupplies" component={ManageSuppliesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageWorkers" component={ManageWorkersScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateSupplyRequest" component={CreateSupplyRequestScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AttendanceReport" component={AttendanceReport} options={{ headerShown: false }} />
            <Stack.Screen name="Announcements" component={Announcements} options={{ headerShown: false }} />
            <Stack.Screen name="SupervisorMessage" component={SupervisorMessageScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}