import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';

// Renders the guest view inviting sellers to sign in or register an account.
export function SellerGuestView() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="shield-checkmark-outline" size={56} color={colors.sage[600]} />
      <Text style={styles.title}>Kelola Iklan & Calon Pembeli</Text>
      <Text style={styles.desc}>
        Masuk sebagai pemilik untuk memasang iklan hunian, mengatur status tayang, dan memantau permintaan survei.
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/(auth)/login' as any)}
        style={styles.primaryBtn}
      >
        <Text style={styles.primaryBtnText}>Masuk Akun Pemilik</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push('/(auth)/register' as any)}
        style={styles.secondaryBtn}
      >
        <Text style={styles.secondaryBtnText}>Daftar Akun Baru</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    textAlign: 'center',
  },
  desc: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.sage[600],
    paddingVertical: 14,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  secondaryBtn: {
    backgroundColor: colors.sand,
    paddingVertical: 14,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.ink,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});
