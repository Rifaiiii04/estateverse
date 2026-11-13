import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '@/components/Header';
import { LeadFormModal } from '@/components/LeadFormModal';
import { MortgageCard } from '@/components/MortgageCard';
import { PropertyGallery } from '@/components/property/PropertyGallery';
import { PropertySpecsGrid } from '@/components/property/PropertySpecsGrid';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { getPublishedPropertyBySlug } from '@/db/propertyQueries';
import { buildWhatsAppLink, formatIDR } from '@/lib/formatters';
import type { Property } from '@/types/property';

// Renders the detailed property view including photo gallery, specs, and inquiry actions.
export default function PropertyDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const db = useSQLiteContext();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Fetches the property record matching the route slug from local SQLite.
  const loadProperty = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await getPublishedPropertyBySlug(db, slug);
      setProperty(data);
    } finally {
      setLoading(false);
    }
  }, [db, slug]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  // Launches WhatsApp with an introductory message pre-filled.
  const handleOpenWhatsApp = () => {
    if (!property) return;
    const msg = `Halo, saya tertarik dengan "${property.title}" di EstateVerse (${formatIDR(property.price)}). Apakah masih tersedia untuk survei lokasi?`;
    const url = buildWhatsAppLink(property.whatsappNumber, msg);
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.sage[600]} />
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView edges={['top']} style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
        <Text style={styles.errorText}>Properti tidak ditemukan</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Rincian Properti" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PropertyGallery images={property.images} propertyType={property.propertyType} />

        <View style={styles.detailsContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{formatIDR(property.price)}</Text>
            <View style={styles.verifiedChip}>
              <Ionicons name="checkmark-circle" size={14} color={colors.sage[600]} />
              <Text style={styles.verifiedChipText}>Terverifikasi</Text>
            </View>
          </View>

          <Text style={styles.titleText}>{property.title}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={15} color={colors.muted} />
            <Text style={styles.addressText}>{property.address}, {property.city}, {property.province}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/property/tour', params: { slug: property.slug } } as any)}
            style={styles.tour360Banner}
          >
            <View style={styles.tour360Left}>
              <View style={styles.tour360IconWrap}>
                <Ionicons name="scan-outline" size={22} color="#ffffff" />
              </View>
              <View style={styles.tour360TextWrap}>
                <View style={styles.tour360Badge}>
                  <Text style={styles.tour360BadgeText}>STREET VIEW 360°</Text>
                </View>
                <Text style={styles.tour360Title}>Jelajah Ruangan 360°</Text>
                <Text style={styles.tour360Desc}>Bisa keliling dan pindah antar ruangan</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>

          <PropertySpecsGrid
            bedrooms={property.bedrooms}
            bathrooms={property.bathrooms}
            buildingArea={property.buildingArea}
            landArea={property.landArea}
          />

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Tentang Rumah Ini</Text>
            <Text style={styles.descriptionText}>{property.description}</Text>
          </View>

          {property.benefits.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Keunggulan & Fasilitas</Text>
              <View style={styles.benefitsWrap}>
                {property.benefits.map((benefit, index) => (
                  <View key={`${benefit}_${index}`} style={styles.benefitTag}>
                    <Ionicons name="checkmark-sharp" size={14} color={colors.sage[700]} />
                    <Text style={styles.benefitTagText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <MortgageCard propertyPrice={property.price} />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={handleOpenWhatsApp} style={styles.waButton}>
          <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
          <Text style={styles.waButtonText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowLeadModal(true)} style={styles.surveyButton}>
          <Ionicons name="calendar-outline" size={18} color="#ffffff" />
          <Text style={styles.surveyButtonText}>Jadwal Survei</Text>
        </TouchableOpacity>
      </View>

      <LeadFormModal
        visible={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        propertyId={property.id}
        propertyTitle={property.title}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: spacing.sm },
  errorText: { fontSize: typography.sizes.sm, color: colors.muted },
  scrollContent: { paddingBottom: 100, backgroundColor: colors.background },
  detailsContainer: { padding: spacing.lg, gap: spacing.lg },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.sage[700] },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sage[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  verifiedChipText: { fontSize: 11, color: colors.sage[700], fontWeight: typography.weights.semibold },
  titleText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.ink, lineHeight: 26 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressText: { fontSize: typography.sizes.xs, color: colors.muted, flex: 1 },
  tour360Banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.sage[900],
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  tour360Left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  tour360IconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tour360TextWrap: { flex: 1, gap: 2 },
  tour360Badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.sage[600],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  tour360BadgeText: { color: '#ffffff', fontSize: 9, fontWeight: typography.weights.bold },
  tour360Title: { color: '#ffffff', fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  tour360Desc: { color: colors.sage[200], fontSize: 11 },
  section: { gap: spacing.xs },
  sectionHeading: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.ink },
  descriptionText: { fontSize: typography.sizes.sm, color: colors.inkLight, lineHeight: 22 },
  benefitsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benefitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sage[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  benefitTagText: { fontSize: typography.sizes.xs, color: colors.sage[800], fontWeight: typography.weights.medium },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  waButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  waButtonText: { color: '#ffffff', fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  surveyButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.sage[600],
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  surveyButtonText: { color: '#ffffff', fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
});
