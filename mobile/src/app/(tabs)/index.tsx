import { showApiError } from '@/lib/api/errors';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { Header } from '@/components/Header';
import { FaqSection, HowItWorksSection } from '@/components/home/HomeInfoSections';
import { HeroBanner } from '@/components/home/HeroBanner';
import { StatsStrip } from '@/components/home/StatsStrip';
import { PropertyCard } from '@/components/PropertyCard';
import { colors, spacing, typography } from '@/constants/theme';
import { getCatalogStats, listPublishedProperties } from '@/lib/api/properties';
import type { Property } from '@/types/property';

// Displays the homepage with featured homes, quick search, workflow steps, and FAQs.
export default function HomeScreen() {
  const router = useRouter();
  const [featured, setFeatured] = useState<Property[]>([]);
  const [stats, setStats] = useState({ totalActive: 0, cityCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Loads the featured properties and catalog statistics.
  const loadData = useCallback(async () => {
    try {
      const [listResult, statsResult] = await Promise.all([
        listPublishedProperties({ keyword: '', type: 'all', priceRange: 'all', sort: 'newest' },
          3,
        ),
        getCatalogStats(),
      ]);
      setFeatured(listResult.items);
      setStats({
        totalActive: statsResult.total,
        cityCount: statsResult.cities,
      });
    } catch (error) { showApiError(error); } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  // Refreshes data when user pulls down the scroll view.
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <HeroBanner onSearchPress={() => router.push('/(tabs)/properties')} />
        <StatsStrip totalActive={stats.totalActive} cityCount={stats.cityCount} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Pilihan Unggulan</Text>
              <Text style={styles.sectionSubtitle}>Rekomendasi rumah terbaik untuk Anda</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/properties')}>
              <Text style={styles.seeAllText}>Lihat Semua Ã¢â€ â€™</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.sage[600]} style={styles.loader} />
          ) : (
            featured.map((item) => <PropertyCard key={item.id} property={item} />)
          )}
        </View>

        <HowItWorksSection />
        <FaqSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xxl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  seeAllText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.sage[700],
  },
  loader: {
    marginVertical: spacing.xl,
  },
});
