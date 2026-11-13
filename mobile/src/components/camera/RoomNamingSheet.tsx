import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { TourRoomInput } from '@/db/tourRepository';

interface RoomNamingSheetProps {
  capturedPhotoUri: string;
  totalCapturedRooms: number;
  onRecordAnother: (room: TourRoomInput) => void;
  onFinishAll: (room: TourRoomInput) => void;
}

const ROOM_NAME_PRESETS = [
  'Ruang Tamu & Foyer',
  'Kamar Tidur Utama',
  'Dapur Bersih & Dining',
  'Teras & Kolam Renang',
  'Kamar Tidur Anak',
  'Balkon / Rooftop',
];

// Renders the room naming bottom sheet with options to continue recording other rooms or finish.
export function RoomNamingSheet({
  capturedPhotoUri,
  totalCapturedRooms,
  onRecordAnother,
  onFinishAll,
}: RoomNamingSheetProps) {
  const [roomName, setRoomName] = useState(
    totalCapturedRooms === 0 ? 'Ruang Tamu & Foyer' : 'Kamar Tidur Utama',
  );
  const [roomSpecs, setRoomSpecs] = useState('Pencahayaan alami dan sirkulasi udara baik.');

  // Packages the current room data and invokes the callback.
  const handleAction = (callback: (room: TourRoomInput) => void) => {
    callback({
      name: roomName.trim() || `Ruangan ${totalCapturedRooms + 1}`,
      panoramaUrl: capturedPhotoUri,
      roomSpecs: roomSpecs.trim() || 'Pencahayaan alami dan sirkulasi udara baik.',
    });
  };

  return (
    <View style={styles.sheetContainer}>
      <View style={styles.successBanner}>
        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerTitle}>360° Selesai Direkam!</Text>
          <Text style={styles.bannerSub}>Ruangan ke-{totalCapturedRooms + 1} berhasil dicakup 100%.</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Pilih Cepat Nama Ruangan</Text>
          <View style={styles.presetWrap}>
            {ROOM_NAME_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                onPress={() => setRoomName(preset)}
                style={[styles.presetChip, roomName === preset && styles.presetChipActive]}
              >
                <Text style={[styles.presetChipText, roomName === preset && styles.presetChipTextActive]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Nama Ruangan</Text>
          <TextInput
            value={roomName}
            onChangeText={setRoomName}
            placeholder="Contoh: Ruang Tamu & Foyer"
            placeholderTextColor={colors.muted}
            style={styles.textInput}
          />
        </View>

        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Keterangan / Ukuran Ruangan (Opsional)</Text>
          <TextInput
            value={roomSpecs}
            onChangeText={setRoomSpecs}
            placeholder="Contoh: Ukuran 6x5m, plafon 3.8m, marmer"
            placeholderTextColor={colors.muted}
            style={styles.textInput}
          />
        </View>

        <View style={styles.actionButtonGroup}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleAction(onRecordAnother)}
            style={styles.recordAnotherBtn}
          >
            <Ionicons name="camera-reverse-outline" size={18} color="#ffffff" />
            <Text style={styles.recordAnotherText}>Rekam Ruangan Lain</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleAction(onFinishAll)}
            style={styles.finishBtn}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={colors.ink} />
            <Text style={styles.finishText}>Selesai & Simpan Semua</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
    gap: spacing.md,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sage[50],
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sage[200],
  },
  bannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.sage[800],
  },
  bannerSub: {
    fontSize: 11,
    color: colors.muted,
  },
  formScroll: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  fieldSection: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.inkLight,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
  },
  presetChipActive: {
    backgroundColor: colors.ink,
  },
  presetChipText: {
    fontSize: 11,
    color: colors.inkLight,
  },
  presetChipTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
  },
  textInput: {
    backgroundColor: colors.sand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.sizes.sm,
    color: colors.ink,
  },
  actionButtonGroup: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  recordAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.sage[600],
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  recordAnotherText: {
    color: '#ffffff',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.sand,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  finishText: {
    color: colors.ink,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
