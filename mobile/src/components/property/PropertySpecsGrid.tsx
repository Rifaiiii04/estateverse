import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { formatArea } from '@/lib/formatters';

interface PropertySpecsGridProps {
  bedrooms: number;
  bathrooms: number;
  buildingArea: number;
  landArea: number;
}

// Renders the key specifications grid displaying bedrooms, bathrooms, and areas.
export function PropertySpecsGrid({
  bedrooms,
  bathrooms,
  buildingArea,
  landArea,
}: PropertySpecsGridProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.box}>
        <Ionicons name="bed-outline" size={20} color={colors.sage[700]} />
        <Text style={styles.value}>{bedrooms} KT</Text>
        <Text style={styles.label}>Kamar Tidur</Text>
      </View>
      <View style={styles.box}>
        <Ionicons name="water-outline" size={20} color={colors.sage[700]} />
        <Text style={styles.value}>{bathrooms} KM</Text>
        <Text style={styles.label}>Kamar Mandi</Text>
      </View>
      <View style={styles.box}>
        <Ionicons name="business-outline" size={20} color={colors.sage[700]} />
        <Text style={styles.value}>{formatArea(buildingArea)}</Text>
        <Text style={styles.label}>Bangunan</Text>
      </View>
      <View style={styles.box}>
        <Ionicons name="map-outline" size={20} color={colors.sage[700]} />
        <Text style={styles.value}>{formatArea(landArea)}</Text>
        <Text style={styles.label}>Luas Tanah</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
  },
  box: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  value: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  label: {
    fontSize: 10,
    color: colors.muted,
  },
});
