import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';

interface HeroBannerProps {
  onSearchPress: () => void;
}

// Renders the high-impact hero header banner on the home screen.
export function HeroBanner({ onSearchPress }: HeroBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.pretitle}>Hunian Modern & Eksklusif</Text>
      <Text style={styles.title}>Temukan Rumah Impian Keluarga Anda</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onSearchPress}
        style={styles.searchBar}
      >
        <Ionicons name="search" size={18} color={colors.sage[600]} />
        <Text style={styles.placeholder}>Cari kota, nama, atau spesifikasi...</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.sage[900],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  pretitle: {
    fontSize: typography.sizes.xs,
    color: colors.sage[200],
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: typography.weights.semibold,
  },
  title: {
    fontSize: typography.sizes.xl,
    color: '#ffffff',
    fontWeight: typography.weights.bold,
    lineHeight: 30,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: 8,
    marginTop: spacing.xs,
  },
  placeholder: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
});
