import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { FilterBar } from '@/components/FilterBar';
import { Header } from '@/components/Header';
import { PropertyCard } from '@/components/PropertyCard';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { listPublishedProperties } from '@/db/propertyQueries';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { PriceRange, Property, SortOption, TypeFilter } from '@/types/property';

// Renders the searchable and filterable property catalog screen.
export default function PropertiesScreen() {
  const db = useSQLiteContext();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [price, setPrice] = useState<PriceRange>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [isCompact, setIsCompact] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Queries matching properties from SQLite based on current filters.
  const fetchProperties = useCallback(async () => {
    try {
      const result = await listPublishedProperties(
        db,
        { keyword: debouncedSearch, type, priceRange: price, sort },
        50,
      );
      setProperties(result.items);
      setTotal(result.items.length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, debouncedSearch, type, price, sort]);

  useEffect(() => {
    setLoading(true);
    fetchProperties();
  }, [fetchProperties]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProperties();
  };

  // Clears all filters and search input back to defaults.
  const handleResetFilters = () => {
    setSearch('');
    setType('all');
    setPrice('all');
    setSort('newest');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Katalog Properti" />
      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        selectedType={type}
        onTypeChange={setType}
        selectedPrice={price}
        onPriceChange={setPrice}
        sortOption={sort}
        onSortChange={setSort}
        isCompactView={isCompact}
        onToggleView={() => setIsCompact((prev) => !prev)}
      />

      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          Menampilkan <Text style={styles.boldText}>{properties.length}</Text> dari {total} unit
        </Text>
        {(search.length > 0 || type !== 'all' || price !== 'all') && (
          <TouchableOpacity onPress={handleResetFilters}>
            <Text style={styles.resetText}>Atur Ulang</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.sage[600]} />
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PropertyCard property={item} compact={isCompact} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="home-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>Tidak Ada Properti yang Cocok</Text>
              <Text style={styles.emptyDesc}>
                Coba ubah kata kunci pencarian atau sesuaikan pilihan harga dan kategori Anda.
              </Text>
              <TouchableOpacity onPress={handleResetFilters} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Tampilkan Semua Properti</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.sand,
  },
  summaryText: {
    fontSize: typography.sizes.xs,
    color: colors.inkLight,
  },
  boldText: {
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  resetText: {
    fontSize: typography.sizes.xs,
    color: colors.sage[700],
    fontWeight: typography.weights.semibold,
  },
  listContent: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  emptyDesc: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.sage[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  resetBtnText: {
    color: '#ffffff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});
