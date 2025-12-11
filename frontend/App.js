import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppNavigator from './navigation/AppNavigator';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Akatab': require('../frontend/assets/fonts/Akatab-Regular.ttf'),
          'Akatab-Bold': require('./assets/fonts/Akatab-Bold.ttf'), // Add if you have it
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts', error);
        setFontsLoaded(true);
      } finally {
        // Hide splash screen after fonts are loaded
        await SplashScreen.hideAsync();
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return null; // Return null while fonts are loading, splash screen will show
  }

  return (
    <AuthProvider>
      <SocketProvider>
        <StatusBar style="light" backgroundColor="#007bff" />
        <AppNavigator />
      </SocketProvider>
    </AuthProvider>
  );
}