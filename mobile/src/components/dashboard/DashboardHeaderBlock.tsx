import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { DashboardSummary } from '@/types/property';

interface DashboardHeaderBlockProps {
  userName: string;
  userEmail: string;
  summary: DashboardSummary | null;
  activeTab: 'listings' | 'leads';
  listingsCount: number;
  leadsCount: number;
  onTabChange: (tab: 'listings' | 'leads') => void;
  onAddProperty: () => void;
}

// Renders the seller profile banner, KPI cards, and tab switcher.
export function DashboardHeaderBlock({
  userName,
  userEmail,
  summary,
  activeTab,
  listingsCount,
  leadsCount,
  onTabChange,
  onAddProperty,
}: DashboardHeaderBlockProps) {
  return (
    <View style={styles.container}>
      <View style={styles.userCard}>
        <View>
          <Text style={styles.welcomeText}>Halo, {userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>
        <TouchableOpacity onPress={onAddProperty} style={styles.addPropertyBtn}>
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addPropertyBtnText}>Pasang Iklan</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{summary?.totalProperties ?? 0}</Text>
          <Text style={styles.metricLabel}>Total Listing</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{summary?.publishedCount ?? 0}</Text>
          <Text style={styles.metricLabel}>Unit Tayang</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{summary?.totalLeads ?? 0}</Text>
          <Text style={styles.metricLabel}>Calon Pembeli</Text>
        </View>
      </View>

      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          onPress={() => onTabChange('listings')}
          style={[styles.tabButton, activeTab === 'listings' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'listings' && styles.tabTextActive]}>
            Iklan Saya ({listingsCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onTabChange('leads')}
          style={[styles.tabButton, activeTab === 'leads' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'leads' && styles.tabTextActive]}>
            Pesan Masuk ({leadsCount})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcomeText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  userEmail: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  addPropertyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sage[600],
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  addPropertyBtnText: {
    color: '#ffffff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.sage[700],
  },
  metricLabel: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.sand,
    borderRadius: radius.md,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    fontWeight: typography.weights.medium,
  },
  tabTextActive: {
    color: colors.ink,
    fontWeight: typography.weights.bold,
  },
});
