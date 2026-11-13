import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { PriceRange, SortOption, TypeFilter } from '@/types/property';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: TypeFilter;
  onTypeChange: (type: TypeFilter) => void;
  selectedPrice: PriceRange;
  onPriceChange: (price: PriceRange) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  isCompactView?: boolean;
  onToggleView?: () => void;
}

const TYPE_PILLS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'house', label: 'Rumah' },
  { value: 'villa', label: 'Villa' },
  { value: 'other', label: 'Lainnya' },
];

const PRICE_PILLS: Array<{ value: PriceRange; label: string }> = [
  { value: 'all', label: 'Semua Harga' },
  { value: 'under_3b', label: '< 3 Miliar' },
  { value: '3b_to_7b', label: '3 - 7 Miliar' },
  { value: 'over_7b', label: '> 7 Miliar' },
];

// Renders the search field, property type filter pills, and price filter chips.
export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedPrice,
  onPriceChange,
  isCompactView,
  onToggleView,
}: FilterBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Cari nama properti, kota, atau daerah..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {onToggleView && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ganti Tampilan"
            onPress={onToggleView}
            style={styles.viewToggleBtn}
          >
            <Ionicons
              name={isCompactView ? 'grid-outline' : 'list-outline'}
              size={18}
              color={colors.ink}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
      >
        {TYPE_PILLS.map((pill) => {
          const active = selectedType === pill.value;
          return (
            <TouchableOpacity
              key={pill.value}
              onPress={() => onTypeChange(pill.value)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {pill.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScroll}
      >
        {PRICE_PILLS.map((pill) => {
          const active = selectedPrice === pill.value;
          return (
            <TouchableOpacity
              key={pill.value}
              onPress={() => onPriceChange(pill.value)}
              style={[styles.pricePill, active && styles.pricePillActive]}
            >
              <Text style={[styles.pricePillText, active && styles.pricePillTextActive]}>
                {pill.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.ink,
    paddingVertical: 0,
  },
  viewToggleBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsScroll: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
  },
  pillActive: {
    backgroundColor: colors.ink,
  },
  pillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.inkLight,
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
  },
  pricePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pricePillActive: {
    borderColor: colors.sage[600],
    backgroundColor: colors.sage[50],
  },
  pricePillText: {
    fontSize: 11,
    color: colors.muted,
  },
  pricePillTextActive: {
    color: colors.sage[700],
    fontWeight: typography.weights.bold,
  },
});
