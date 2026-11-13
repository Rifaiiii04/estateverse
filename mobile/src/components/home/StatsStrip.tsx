import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

interface StatsStripProps {
  totalActive: number;
  cityCount: number;
}

// Renders the summary statistics strip displaying available units and locations.
export function StatsStrip({ totalActive, cityCount }: StatsStripProps) {
  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.number}>{totalActive}</Text>
        <Text style={styles.label}>Unit Siap Huni</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.box}>
        <Text style={styles.number}>{cityCount}</Text>
        <Text style={styles.label}>Kota Pilihan</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.box}>
        <Text style={styles.number}>100%</Text>
        <Text style={styles.label}>Terverifikasi</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  box: {
    alignItems: 'center',
  },
  number: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.sage[700],
  },
  label: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
});
