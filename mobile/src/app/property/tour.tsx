import { showApiError } from '@/lib/api/errors';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '@/components/Header';
import { PanoramaViewer } from '@/components/tour/PanoramaViewer';
import { RoomSelectorDock } from '@/components/tour/RoomSelectorDock';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { getPublishedPropertyBySlug } from '@/lib/api/properties';
import { getTourRoomsForProperty } from '@/lib/api/tours';
import { buildWhatsAppLink } from '@/lib/formatters';
import type { Property, TourRoom } from '@/types/property';

// Renders the full 360 Street View virtual tour screen with room-to-room navigation.
export default function PropertyTourScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<TourRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(true);

  // Loads the target property and its associated 360 panoramic rooms from the shared Go API.
  const loadTourData = useCallback(async () => {
    if (!slug) return;
    try {
      const prop = await getPublishedPropertyBySlug(slug);
      if (prop) {
        setProperty(prop);
        const tourRooms = await getTourRoomsForProperty(prop.id);
        setRooms(tourRooms);
        if (tourRooms.length > 0) {
          setActiveRoomId(tourRooms[0].id);
        }
      }
    } catch (error) { showApiError(error); } finally {
      setLoading(false);
    }
  }, [slug]);

  useFocusEffect(useCallback(() => {
    loadTourData();
  }, [loadTourData]));

  // Transitions the 360 view into a linked target room.
  const handleSelectRoom = (targetRoomId: number) => {
    setActiveRoomId(targetRoomId);
  };

  // Opens WhatsApp with inquiry regarding the active room.
  const handleWhatsAppInquiry = () => {
    if (!property || !activeRoom) return;
    const msg = `Halo, saya sedang melihat Tur 360Ã‚Â° pada bagian "${activeRoom.name}" untuk properti "${property.title}". Apakah bisa dijelaskan lebih lanjut?`;
    Linking.openURL(buildWhatsAppLink(property.whatsappNumber, msg));
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.sage[600]} />
      </SafeAreaView>
    );
  }

  if (!property || rooms.length === 0 || !activeRoomId) {
    return (
      <SafeAreaView edges={['top']} style={styles.centerContainer}>
        <Ionicons name="images-outline" size={48} color={colors.muted} />
        <Text style={styles.emptyTitle}>Tur 360Ã‚Â° Belum Tersedia</Text>
        <Text style={styles.emptyDesc}>Pemilik belum menambahkan foto panorama 360Ã‚Â° untuk properti ini.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Kembali ke Halaman Properti</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header
        title={property.title}
        showBack
        rightAction={{
          icon: 'logo-whatsapp',
          onPress: handleWhatsAppInquiry,
          label: 'Tanya',
        }}
      />

      <View style={styles.roomHeaderBar}>
        <View style={styles.badgeRow}>
          <View style={styles.live360Badge}>
            <Text style={styles.live360Text}>TUR 360Ã‚Â° AKTIF</Text>
          </View>
          <Text style={styles.roomTitle}>{activeRoom.name}</Text>
        </View>
      </View>

      <View style={styles.viewerContainer}>
        <PanoramaViewer
          panoramaUrl={activeRoom.panoramaUrl}
          hotspots={activeRoom.hotspots}
          onSelectHotspot={handleSelectRoom}
          autoRotate={autoRotate}
        />
      </View>

      <RoomSelectorDock
        rooms={rooms}
        activeRoomId={activeRoom.id}
        onSelectRoom={handleSelectRoom}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
        onShowInfo={() => setShowInfo(true)}
      />

      {/* Room Information Modal */}
      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{activeRoom.name}</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSpecs}>{activeRoom.roomSpecs || 'Ruangan dengan pencahayaan alami dan sirkulasi udara baik.'}</Text>
            <TouchableOpacity onPress={() => setShowInfo(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Tutup Informasi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.ink },
  emptyDesc: { fontSize: typography.sizes.xs, color: colors.muted, textAlign: 'center', marginBottom: spacing.sm },
  backBtn: { backgroundColor: colors.sage[600], paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.full },
  backBtnText: { color: '#ffffff', fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold },
  roomHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.sand },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  live360Badge: { backgroundColor: colors.sage[700], paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.sm },
  live360Text: { color: '#ffffff', fontSize: 9, fontWeight: typography.weights.bold },
  roomTitle: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.ink },
  viewerContainer: { flex: 1, backgroundColor: '#0a0d0b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.ink },
  modalSpecs: { fontSize: typography.sizes.sm, color: colors.inkLight, lineHeight: 20 },
  modalCloseBtn: { backgroundColor: colors.sage[600], paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  modalCloseText: { color: '#ffffff', fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
});
