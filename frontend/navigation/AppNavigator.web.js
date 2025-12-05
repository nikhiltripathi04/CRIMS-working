import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

// --- Screens (Expo picks .web.js or .js) ---
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
import SiteDetailsScreen from '../screens/SiteDetailsScreen';
import WarehouseDetailsScreen from '../screens/WarehouseDetailsScreen';
import StaffDetailsScreen from '@/screens/StaffDetailsScreen';
import ManageSuppliesScreen from '../screens/ManageSuppliesScreen';
import ManageWorkersScreen from '../screens/ManageWorkersScreen';
import ManageSupervisorsScreen from '../screens/ManageSupervisorsScreen';
import GlobalManageSupervisorsScreen from '../screens/GlobalManageSupervisorsScreen'; // Only imported for Web
import ManageWarehouseManagersScreen from '../screens/ManageWarehouseManagersScreen';
import WarehouseSuppliesScreen from '../screens/WarehouseSuppliesScreen';
import WarehouseReportsScreen from '../screens/WarehouseReportsScreen';
import AdminMessagesScreen from '@/screens/AdminMessagesScreen'; 

// Warehouse Manager
import WarehouseManagerDashboard from '../screens/WarehouseManagerDashboard';
import CreateSupplyRequestScreen from '@/screens/CreateSupplyRequestScreen';
import SupplyRequestStatusScreen from '@/screens/SupplyRequestStatusScreen';

// Staff & Supervisor
import StaffDashboard from '@/screens/StaffDashboard';
import SupervisorDashboard from '../screens/SupervisorDashboard';
import AttendanceReport from '@/screens/AttendanceReport';
import SupervisorDetailScreen from '@/screens/SupervisorDetailScreen';
import Announcements from '@/screens/Announcements';

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
        // Shorter splash timeout for web (1s) feels snappier
        setTimeout(() => {
          setShowSplash(false);
          setInitializing(false);
        }, 1000); 
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

  if (loading || initializing) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false, // Web usually has its own Sidebar/Header
          cardStyle: { flex: 1 } // Ensures full height usage
        }}
      >
        {!hasSeenOnboarding ? (
          <>
            <Stack.Screen name="Onboarding">
              {props => <OnboardingScreen {...props} onComplete={completeOnboarding} />}
            </Stack.Screen>
            <Stack.Screen name="Next">
              {props => <NextScreen {...props} onComplete={completeOnboarding} />}
            </Stack.Screen>
          </>
        ) : !user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : user.role === 'admin' ? (
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="CreateSite" component={CreateSiteScreen} />
            <Stack.Screen name="CreateWarehouse" component={CreateWarehouseScreen} />
            <Stack.Screen name="CreateStaff" component={CreateStaffScreen} />
            <Stack.Screen name="SiteDetails" component={SiteDetailsScreen} />
            <Stack.Screen name="WarehouseDetails" component={WarehouseDetailsScreen} />
            <Stack.Screen name="StaffDetails" component={StaffDetailsScreen} />
            <Stack.Screen name="WarehouseSupplies" component={WarehouseSuppliesScreen} />
            <Stack.Screen name="WarehouseReports" component={WarehouseReportsScreen} />
            <Stack.Screen name="AdminMessages" component={AdminMessagesScreen} />
            <Stack.Screen name="ManageSupplies" component={ManageSuppliesScreen} />
            <Stack.Screen name="ManageWorkers" component={ManageWorkersScreen} />
            <Stack.Screen name="SupervisorDetail" component={SupervisorDetailScreen} />
            <Stack.Screen name="ManageSupervisors" component={ManageSupervisorsScreen} />
            <Stack.Screen name="GlobalManageSupervisors" component={GlobalManageSupervisorsScreen} />
            <Stack.Screen name="Announcements" component={Announcements} />
            <Stack.Screen name="ManageWarehouseManagers" component={ManageWarehouseManagersScreen} />
          </>
        ) : user.role === 'warehouse_manager' ? (
          <>
            <Stack.Screen name="WarehouseManagerDashboard" component={WarehouseManagerDashboard} />
            <Stack.Screen name="WarehouseSupplies" component={WarehouseSuppliesScreen} />
            <Stack.Screen name="WarehouseReports" component={WarehouseReportsScreen} />
            <Stack.Screen name="CreateSupplyRequest" component={CreateSupplyRequestScreen} />
            <Stack.Screen name="SupplyRequestStatus" component={SupplyRequestStatusScreen} />
          </>
        ) : user.role === 'staff' ? (
          <>
            <Stack.Screen name="StaffDashboard" component={StaffDashboard} />
          </>
        ) : (
          <>
            <Stack.Screen name="SupervisorDashboard" component={SupervisorDashboard} />
            <Stack.Screen name="ManageSupplies" component={ManageSuppliesScreen} />
            <Stack.Screen name="ManageWorkers" component={ManageWorkersScreen} />
            <Stack.Screen name="CreateSupplyRequest" component={CreateSupplyRequestScreen} />
            <Stack.Screen name="AttendanceReport" component={AttendanceReport} />
            <Stack.Screen name="Announcements" component={Announcements} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}