import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { migrateDbIfNeeded } from '@/db/schema';

// Displays a simple centered spinner while SQLite initializes.
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.sage[600]} />
    </View>
  );
}

// Configures the root application providers, SQLite database, and navigation stack.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <React.Suspense fallback={<LoadingScreen />}>
        <SQLiteProvider databaseName="estateverse.db" onInit={migrateDbIfNeeded}>
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
        </SQLiteProvider>
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
