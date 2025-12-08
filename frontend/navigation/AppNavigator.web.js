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
// import OnboardingScreen from '@/screens/Onboarding'; // REMOVED
// import NextScreen from '@/screens/Next'; // REMOVED
import RegisterCompanyScreen from '../screens/RegisterCompanyScreen';
import ActivityLogsScreen from '../screens/ActivityLogsScreen';

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
import SupervisorSuppliesScreen from '../screens/SupervisorSuppliesScreen';
import AttendanceReport from '@/screens/AttendanceReport';
import SupervisorDetailScreen from '@/screens/SupervisorDetailScreen';
import Announcements from '@/screens/Announcements';
import CompanyDashboard from '../screens/CompanyDashboard';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setShowSplash(false);
      setInitializing(false);
    }, 1000);
  }, []);

  if (loading || initializing) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // Web usually has its own Sidebar/Header
          cardStyle: { flex: 1 } // Ensures full height usage
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="RegisterCompany" component={RegisterCompanyScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : user.role === 'company_owner' ? (
          <>
            <Stack.Screen name="CompanyDashboard" component={CompanyDashboard} />
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
            <Stack.Screen name="ActivityLogs" component={ActivityLogsScreen} />
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
            <Stack.Screen name="SupervisorSupplies" component={SupervisorSuppliesScreen} />
            <Stack.Screen name="SupplyRequestStatus" component={SupplyRequestStatusScreen} />
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