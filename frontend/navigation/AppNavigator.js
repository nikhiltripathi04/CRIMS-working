import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { Platform } from 'react-native';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import AdminDashboard from '../screens/AdminDashboard';
import SupervisorDashboard from '../screens/SupervisorDashboard';
import CreateSiteScreen from '../screens/CreateSiteScreen';
import SiteDetailsScreen from '../screens/SiteDetailsScreen';
import ManageSuppliesScreen from '../screens/ManageSuppliesScreen';
import ManageWorkersScreen from '../screens/ManageWorkersScreen';
import ManageSupervisorsScreen from '../screens/ManageSupervisorsScreen';
import AttendanceReport from '@/screens/AttendanceReport';
import Announcements from '@/screens/Announcements';
import OnboardingScreen from '@/screens/Onboarding';
import NextScreen from '@/screens/Next';
import SignUpScreen from '@/screens/SignUpScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import CreateWarehouseScreen from '../screens/CreateWarehouseScreen';
import WarehouseDetailsScreen from '../screens/WarehouseDetailsScreen';
import WarehouseManagerDashboard from '../screens/WarehouseManagerDashboard';
import WarehouseSuppliesScreen from '../screens/WarehouseSuppliesScreen';
import WarehouseReportsScreen from '../screens/WarehouseReportsScreen';
import ManageWarehouseManagersScreen from '../screens/ManageWarehouseManagersScreen';
import CreateSupplyRequestScreen from '@/screens/CreateSupplyRequestScreen';
import SupplyRequestStatusScreen from '@/screens/SupplyRequestStatusScreen';
// ...other imports // Import the ResetPasswordScreen

const Stack = createStackNavigator();

let AdminDashboardScreen;
let CreateSiteScreenScreen;
let CreateWarehouseScreenScreen;
let SiteDetailsScreenScreen;
let ManageWorkersScreenScreen;

if (Platform.OS === 'web') {
  AdminDashboardScreen = require('../screens/AdminDashboard.web').default;
  CreateSiteScreenScreen = require('../screens/CreateSiteScreen.web').default;
  CreateWarehouseScreenScreen = require('../screens/CreateWarehouseScreen.web').default;
  SiteDetailsScreenScreen = require('../screens/SiteDetailsScreen.web').default;
  ManageWorkersScreenScreen = require('../screens/ManageWorkersScreen.web').default;
} else {
  AdminDashboardScreen = require('../screens/AdminDashboard').default;
  CreateSiteScreenScreen = require('../screens/CreateSiteScreen').default;
  CreateWarehouseScreenScreen = require('../screens/CreateWarehouseScreen').default;
  SiteDetailsScreenScreen = require('../screens/SiteDetailsScreen').default;
  ManageWorkersScreenScreen = require('../screens/ManageWorkersScreen').default;
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Check if user has seen onboarding and handle splash screen
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Get onboarding status from AsyncStorage
        const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(onboardingStatus === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        // Hide splash after a delay regardless of onboarding status
        setTimeout(() => {
          setShowSplash(false);
          setInitializing(false);
        }, 3000);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Function to mark onboarding as complete
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasSeenOnboarding(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  // Show splash screen during initialization
  if (showSplash) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Still loading auth state, return null or a loading indicator
  if (loading || initializing) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!hasSeenOnboarding ? (
          // Show onboarding first if user hasn't seen it
          <>
            <Stack.Screen
              name="Onboarding"
              options={{ headerShown: false }}
            >
              {props => <OnboardingScreen {...props} onComplete={completeOnboarding} />}
            </Stack.Screen>
            <Stack.Screen
              name="Next"
              options={{ headerShown: false }}
            >
              {props => <NextScreen {...props} onComplete={completeOnboarding} />}
            </Stack.Screen>
          </>
        ) : !user ? (
          // User has seen onboarding but isn't logged in
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : user.role === 'admin' ? (
          // ------- ADMIN --------
          <>
            {/* <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} /> */}
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
            
            {/* <Stack.Screen name="CreateSite" component={CreateSiteScreen} options={{ headerShown: false }} /> */}
            <Stack.Screen name="CreateSite" component={CreateSiteScreenScreen} options={{ headerShown: false }} />
            
            {/* <Stack.Screen name="CreateWarehouse" component={CreateWarehouseScreen} options={{ headerShown: false }} /> */}
            <Stack.Screen name="CreateWarehouse" component={CreateWarehouseScreenScreen} options={{ headerShown: false }} />
            
            {/* <Stack.Screen name="SiteDetails" component={SiteDetailsScreen} options={{ headerShown: false }} /> */}
            <Stack.Screen name="SiteDetails" component={SiteDetailsScreenScreen} options={{ headerShown: false }} />
            
            <Stack.Screen name="WarehouseDetails" component={WarehouseDetailsScreen} options={{ headerShown: false }} />
            
            
            <Stack.Screen name="WarehouseSupplies" component={WarehouseSuppliesScreen} options={{ headerShown: false }} />
            
            
            <Stack.Screen name="WarehouseReports" component={WarehouseReportsScreen} options={{ headerShown: false }} />
            
            
            <Stack.Screen name="ManageSupplies" component={ManageSuppliesScreen} options={{ headerShown: false }} />
            
            
            {/* <Stack.Screen name="ManageWorkers" component={ManageWorkersScreen} options={{ headerShown: false }} /> */}
            <Stack.Screen name="ManageWorkers" component={ManageWorkersScreenScreen} options={{ headerShown: false }} />
            
            <Stack.Screen name="ManageSupervisors" component={ManageSupervisorsScreen} options={{ headerShown: false }} />
            
            
            <Stack.Screen name="Announcements" component={Announcements} options={{ headerShown: false }} />
            
            <Stack.Screen
              name="ManageWarehouseManagers"
              component={ManageWarehouseManagersScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : user.role === 'warehouse_manager' ? (
          // ------- WAREHOUSE MANAGER --------
          <>
            <Stack.Screen name="WarehouseManagerDashboard" component={WarehouseManagerDashboard} options={{ headerShown: false }} />
            {/* <Stack.Screen name="WarehouseDetails" component={WarehouseDetailsScreen} options={{ headerShown: false }} /> */}
            {/* Add any other manager-specific screens here */}
            <Stack.Screen
              name="WarehouseSupplies"
              component={WarehouseSuppliesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WarehouseReports"
              component={WarehouseReportsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateSupplyRequest"
              component={CreateSupplyRequestScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SupplyRequestStatus"
              component={SupplyRequestStatusScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // ------- SUPERVISOR --------
          <>
            <Stack.Screen name="SupervisorDashboard" component={SupervisorDashboard} options={{ headerShown: false }} />
            <Stack.Screen name="ManageSupplies" component={ManageSuppliesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ManageWorkers" component={ManageWorkersScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="CreateSupplyRequest"
              component={CreateSupplyRequestScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="AttendanceReport" component={AttendanceReport} options={{ headerShown: false }} />
            <Stack.Screen name="Announcements" component={Announcements} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}