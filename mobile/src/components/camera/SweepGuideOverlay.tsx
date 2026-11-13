import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';

interface SweepGuideOverlayProps {
  progressPercent: number;
  currentAngle: number;
  isTooFast: boolean;
  onCancel: () => void;
  onManualAdvance?: () => void;
}

// Renders the on-screen 360 degree guided sweep HUD with progress ring and speed warnings.
export function SweepGuideOverlay({
  progressPercent,
  currentAngle,
  isTooFast,
  onCancel,
  onManualAdvance,
}: SweepGuideOverlayProps) {
  const isComplete = progressPercent >= 100;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onCancel} style={styles.iconButton}>
          <Ionicons name="close" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.angleBadge}>
          <Ionicons name="compass-outline" size={14} color="#ffffff" />
          <Text style={styles.angleText}>{Math.round(currentAngle)}°</Text>
        </View>
      </View>

      <View style={styles.centerTargetWrap} pointerEvents="none">
        <View style={[styles.targetRing, isComplete && styles.targetRingDone]}>
          <Text style={styles.progressPercentText}>{Math.min(100, Math.round(progressPercent))}%</Text>
          <Text style={styles.progressSubText}>360° TERCAKUP</Text>
        </View>
        <View style={styles.horizonGuide} />
        <View style={styles.verticalGuide} />
      </View>

      <View style={styles.bottomInstructionCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isTooFast ? styles.dotWarning : styles.dotOk]} />
          <Text style={styles.statusTitle}>
            {isComplete
              ? 'Ruangan Selesai Direkam!'
              : isTooFast
                ? 'Putar Lebih Pelan!'
                : 'Putar HP Secara Perlahan'}
          </Text>
        </View>
        <Text style={styles.instructionText}>
          {isComplete
            ? 'Memproses gambar 360°...'
            : isTooFast
              ? 'Gerakan terlalu cepat, tahan posisi dan putar pelan-pelan ke kanan.'
              : 'Berdiri di tengah ruangan lalu putar badan Anda 360° perlahan hingga lingkaran mencapai 100%.'}
        </Text>

        {!isComplete && onManualAdvance && (
          <TouchableOpacity onPress={onManualAdvance} style={styles.advanceSimBtn}>
            <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.sage[200]} />
            <Text style={styles.advanceSimText}>Simulasi Putar 30°</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  angleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 23, 21, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  angleText: {
    color: '#ffffff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  centerTargetWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
  },
  targetRing: {
    width: 140,
    height: 140,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 23, 21, 0.35)',
  },
  targetRingDone: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  progressPercentText: {
    color: '#ffffff',
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
  },
  progressSubText: {
    color: colors.sage[200],
    fontSize: 9,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  horizonGuide: {
    position: 'absolute',
    width: 200,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  verticalGuide: {
    position: 'absolute',
    height: 200,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  bottomInstructionCard: {
    backgroundColor: 'rgba(20, 23, 21, 0.85)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  dotOk: {
    backgroundColor: '#22c55e',
  },
  dotWarning: {
    backgroundColor: '#f59e0b',
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  instructionText: {
    color: colors.sage[100],
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  advanceSimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 4,
  },
  advanceSimText: {
    color: colors.sage[200],
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
});
