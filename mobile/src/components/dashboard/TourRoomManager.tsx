import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Guided360CameraModal } from '@/components/camera/Guided360CameraModal';
import { colors, radius, spacing, typography } from '@/constants/theme';
import type { DraftTourRoom } from '@/types/capture';
import { deleteTourRoom } from '@/lib/api/tours';
import { removeCaptureFiles } from '@/lib/capture/camera';
import { useTourStatus } from '@/lib/hooks/useTourStatus';

interface TourRoomManagerProps {
  rooms: DraftTourRoom[];
  onChange: (rooms: DraftTourRoom[]) => void;
  propertyId: number | null;
  disabled: boolean;
}

// Manages real-time camera sweep capture and list of 360 rooms for a property.
export function TourRoomManager({ rooms, onChange, propertyId, disabled }: TourRoomManagerProps) {
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const handleReady = useCallback((room: DraftTourRoom) => {
    Alert.alert('Panorama selesai', `Panorama ${room.name} sudah selesai diproses oleh server. Setelah semua ruangan siap, properti dapat dipublish.`);
  }, []);
  const statusError = useTourStatus(propertyId, rooms, onChange, disabled, handleReady);

  // Appends batch of captured 360 rooms from the guided camera session.
  const handleCompleteRooms = (newRooms: DraftTourRoom[]) => {
    onChange([...rooms, ...newRooms]);
  };

  // Removes a 360 room node by index.
  const handleRemoveRoom = async (indexToRemove: number) => {
    try {
      const room = rooms[indexToRemove];
      if (room.id) await deleteTourRoom(room.id);
      removeCaptureFiles(room.frames || []);
      onChange(rooms.filter((_, idx) => idx !== indexToRemove));
    } catch { Alert.alert('Gagal menghapus', 'Ruangan belum terhapus. Coba lagi.'); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.label}>Tur Street View 360° Ruangan</Text>
          <Text style={styles.sublabel}>
            {rooms.length === 0 ? 'Belum ada rekaman 360°' : `${rooms.length} Ruangan tersimpan`}
          </Text>
        </View>
        <TouchableOpacity disabled={disabled || rooms.length >= 8} onPress={() => setCameraModalVisible(true)} style={styles.recordBtn}>
          <Ionicons name="camera-reverse-outline" size={16} color={colors.sage[700]} />
          <Text style={styles.recordBtnText}>Rekam 360°</Text>
        </TouchableOpacity>
      </View>

      {rooms.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardList}>
          {rooms.map((room, index) => (
            <View key={`${room.name}_${index}`} style={styles.roomCard}>
              {room.panoramaUrl ? <Image source={{ uri: room.panoramaUrl }} style={styles.thumbnail} contentFit="cover" />
                : <View style={[styles.thumbnail, { justifyContent: 'center', padding: 12 }]}><Text>{room.frames ? `${room.frames.length} foto · belum dikirim` : room.status === 'failed' ? 'Gagal diproses' : 'Diproses di server…'}</Text></View>}
              <View style={styles.cardInfo}>
                <Text numberOfLines={1} style={styles.cardTitle}>{room.name}</Text>
                <Text numberOfLines={1} style={styles.cardSpecs}>{room.roomSpecs}</Text>
                {!!room.errorMessage && <Text style={{ color: colors.error, fontSize: 11 }}>{room.errorMessage}</Text>}
              </View>
              <TouchableOpacity disabled={disabled} onPress={() => void handleRemoveRoom(index)} style={styles.removeBtn}>
                <Ionicons name="trash-outline" size={14} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <TouchableOpacity disabled={disabled} onPress={() => setCameraModalVisible(true)} style={styles.placeholderBox}>
          <View style={styles.camIconCircle}>
            <Ionicons name="camera" size={26} color={colors.sage[600]} />
          </View>
          <Text style={styles.placeholderTitle}>Buka Kamera & Rekam Ruangan 360°</Text>
          <Text style={styles.placeholderText}>
            Ikuti titik foto yang dihitung otomatis. HP hanya merekam; server menggabungkan foto menjadi panorama setelah properti disimpan.
          </Text>
        </TouchableOpacity>
      )}

      {!!statusError && <Text style={{ color: colors.error }}>{statusError}</Text>}
      {cameraModalVisible && <Guided360CameraModal
        visible={cameraModalVisible}
        onClose={() => setCameraModalVisible(false)}
        onComplete={handleCompleteRooms}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs, marginVertical: spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleWrap: { gap: 2 },
  label: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.inkLight },
  sublabel: { fontSize: 11, color: colors.muted },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sage[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  recordBtnText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: colors.sage[700] },
  cardList: { gap: spacing.sm, paddingVertical: 4 },
  roomCard: {
    width: 170,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: { width: '100%', height: 90 },
  cardInfo: { padding: spacing.xs, gap: 2 },
  cardTitle: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.ink },
  cardSpecs: { fontSize: 10, color: colors.muted },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.sand,
    gap: 6,
  },
  camIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.sage[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, color: colors.ink },
  placeholderText: { fontSize: 11, color: colors.muted, textAlign: 'center', lineHeight: 16 },
});
