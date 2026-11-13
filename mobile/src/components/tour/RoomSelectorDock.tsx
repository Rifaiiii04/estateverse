import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { TourRoom } from '@/types/property';

interface RoomSelectorDockProps {
  rooms: TourRoom[];
  activeRoomId: number;
  onSelectRoom: (roomId: number) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onShowInfo: () => void;
}

// Renders the floating bottom room selector bar and utility controls for 360 tours.
export function RoomSelectorDock({
  rooms,
  activeRoomId,
  onSelectRoom,
  autoRotate,
  onToggleAutoRotate,
  onShowInfo,
}: RoomSelectorDockProps) {
  return (
    <View style={styles.dock}>
      <View style={styles.topControlRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.dockLabel}>Pilih Ruangan Tur 360°</Text>
          <Text style={styles.roomCount}>{rooms.length} Sudut Pandang</Text>
        </View>

        <View style={styles.actionsWrap}>
          <TouchableOpacity
            onPress={onToggleAutoRotate}
            style={[styles.utilityBtn, autoRotate && styles.utilityBtnActive]}
          >
            <Ionicons
              name={autoRotate ? 'sync' : 'sync-outline'}
              size={16}
              color={autoRotate ? '#ffffff' : colors.ink}
            />
            <Text style={[styles.utilityText, autoRotate && styles.utilityTextActive]}>
              {autoRotate ? 'Putar Aktif' : 'Otomatis'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onShowInfo} style={styles.utilityBtn}>
            <Ionicons name="information-circle-outline" size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.roomList}
      >
        {rooms.map((room) => {
          const isActive = room.id === activeRoomId;
          return (
            <TouchableOpacity
              key={room.id}
              activeOpacity={0.85}
              onPress={() => onSelectRoom(room.id)}
              style={[styles.roomCard, isActive && styles.roomCardActive]}
            >
              <Ionicons
                name={isActive ? 'eye' : 'navigate-outline'}
                size={14}
                color={isActive ? '#ffffff' : colors.sage[700]}
              />
              <Text
                numberOfLines={1}
                style={[styles.roomName, isActive && styles.roomNameActive]}
              >
                {room.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: {
    gap: 2,
  },
  dockLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  roomCount: {
    fontSize: 11,
    color: colors.muted,
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  utilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sand,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  utilityBtnActive: {
    backgroundColor: colors.sage[600],
  },
  utilityText: {
    fontSize: 11,
    color: colors.ink,
    fontWeight: typography.weights.medium,
  },
  utilityTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
  },
  roomList: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomCardActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  roomName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.ink,
  },
  roomNameActive: {
    color: '#ffffff',
  },
});
