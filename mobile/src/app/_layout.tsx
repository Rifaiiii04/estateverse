import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';

// Displays a centered spinner while application providers initialize.
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.sage[600]} />
    </View>
  );
}

// Configures shared backend authentication and the native navigation stack.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <React.Suspense fallback={<LoadingScreen />}>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="property/[slug]" options={{ headerShown: false }} />
              <Stack.Screen name="property/tour" options={{ headerShown: false }} />
              <Stack.Screen
                name="dashboard/form"
                options={{ headerShown: false, presentation: 'modal' }}
              />
              <Stack.Screen
                name="(auth)/login"
                options={{ headerShown: false, presentation: 'modal' }}
              />
              <Stack.Screen
                name="(auth)/register"
                options={{ headerShown: false, presentation: 'modal' }}
              />
            </Stack>
          </AuthProvider>
      </React.Suspense>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
