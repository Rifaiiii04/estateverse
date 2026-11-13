import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { DashboardHeaderBlock } from '@/components/dashboard/DashboardHeaderBlock';
import { LeadItem } from '@/components/dashboard/LeadItem';
import { ListingItem } from '@/components/dashboard/ListingItem';
import { SellerGuestView } from '@/components/dashboard/SellerGuestView';
import { Header } from '@/components/Header';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { listOwnedLeads, updateLeadStatus } from '@/db/leadRepository';
import { getDashboardSummary, listOwnedProperties } from '@/db/propertyQueries';
import { deleteProperty, setPropertyStatus } from '@/db/propertyWrites';
import type { DashboardSummary, Lead, Property, PropertyStatus } from '@/types/property';

type DashboardItem =
  | { kind: 'property'; data: Property }
  | { kind: 'lead'; data: Lead };

// Renders the seller dashboard with performance metrics, listing manager, and leads inbox.
export default function DashboardScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'listings' | 'leads'>('listings');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Loads seller performance summary, properties, and prospective buyer leads.
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const [sum, props, leadList] = await Promise.all([
        getDashboardSummary(db, user.id),
        listOwnedProperties(db, user.id, 'all', ''),
        listOwnedLeads(db, user.id, 'all', ''),
      ]);
      setSummary(sum);
      setProperties(props);
      setLeads(leadList);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [db, user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Toggles the publishing status of a property between draft and published.
  const handleToggleStatus = async (prop: Property) => {
    if (!user) return;
    const nextStatus: PropertyStatus = prop.status === 'published' ? 'draft' : 'published';
    await setPropertyStatus(db, user.id, prop.id, nextStatus);
    loadDashboardData();
  };

  // Prompts confirmation and permanently deletes a property listing.
  const handleDelete = (prop: Property) => {
    if (!user) return;
    Alert.alert('Hapus Iklan', `Yakin ingin menghapus "${prop.title}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await deleteProperty(db, user.id, prop.id);
          loadDashboardData();
        },
      },
    ]);
  };

  // Cycles lead status to the next stage in the pipeline.
  const handleAdvanceLeadStatus = async (lead: Lead) => {
    if (!user) return;
    const sequence: Lead['status'][] = ['new', 'contacted', 'scheduled', 'closed'];
    const next = sequence[(sequence.indexOf(lead.status) + 1) % sequence.length];
    await updateLeadStatus(db, user.id, lead.id, next);
    loadDashboardData();
  };

  if (!user) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Header title="Area Pemilik Rumah" />
        <SellerGuestView />
      </SafeAreaView>
    );
  }

  const dashboardItems: DashboardItem[] =
    activeTab === 'listings'
      ? properties.map((p) => ({ kind: 'property', data: p }))
      : leads.map((l) => ({ kind: 'lead', data: l }));

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header
        title="Dashboard Pemilik"
        rightAction={{ icon: 'log-out-outline', onPress: logout, label: 'Keluar' }}
      />
      <FlatList
        data={dashboardItems}
        keyExtractor={(item) => `${item.kind}_${item.data.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollList}
        ListHeaderComponent={
          <DashboardHeaderBlock
            userName={user.name}
            userEmail={user.email}
            summary={summary}
            activeTab={activeTab}
            listingsCount={properties.length}
            leadsCount={leads.length}
            onTabChange={setActiveTab}
            onAddProperty={() => router.push('/dashboard/form' as any)}
          />
        }
        renderItem={({ item }) =>
          item.kind === 'property' ? (
            <ListingItem
              property={item.data}
              onToggleStatus={handleToggleStatus}
              onEdit={(p) => router.push({ pathname: '/dashboard/form', params: { id: p.id } } as any)}
              onDelete={handleDelete}
            />
          ) : (
            <LeadItem lead={item.data} onAdvanceStatus={handleAdvanceLeadStatus} />
          )
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="small" color={colors.sage[600]} style={{ margin: spacing.xl }} />
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>
                {activeTab === 'listings' ? 'Belum Ada Iklan Rumah' : 'Belum Ada Pesan Masuk'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollList: {
    padding: spacing.md,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  emptyWrap: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
});
