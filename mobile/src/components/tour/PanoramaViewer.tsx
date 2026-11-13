import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { TourHotspot } from '@/types/property';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANORAMA_WIDTH = SCREEN_WIDTH * 3.5;
const PANORAMA_HEIGHT = SCREEN_HEIGHT * 0.75;
const FOV_HALF = 42; // Half horizontal field of view in degrees

interface PanoramaViewerProps {
  panoramaUrl: string;
  hotspots?: TourHotspot[];
  onSelectHotspot: (targetRoomId: number) => void;
  autoRotate?: boolean;
}

// Renders an interactive 360 degree panoramic room viewer with wrap-around drag and waypoints.
export function PanoramaViewer({
  panoramaUrl,
  hotspots = [],
  onSelectHotspot,
  autoRotate = false,
}: PanoramaViewerProps) {
  const [yaw, setYaw] = useState(0); // 0 to 360 degrees
  const [pitch, setPitch] = useState(0); // -40 to 40 px vertical tilt
  const [isInteracting, setIsInteracting] = useState(false);

  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  yawRef.current = yaw;
  pitchRef.current = pitch;

  // Handles smooth touch drag for horizontal 360 panning and vertical pitch tilting.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsInteracting(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaYaw = -(gestureState.dx / SCREEN_WIDTH) * 60;
        let nextYaw = (yawRef.current + deltaYaw) % 360;
        if (nextYaw < 0) nextYaw += 360;
        setYaw(nextYaw);

        const deltaPitch = gestureState.dy * 0.35;
        const nextPitch = Math.max(-50, Math.min(50, pitchRef.current + deltaPitch));
        setPitch(nextPitch);
      },
      onPanResponderRelease: () => {
        setIsInteracting(false);
      },
    }),
  ).current;

  // Slowly rotates the camera view when auto-rotate is enabled and user is not touching.
  useEffect(() => {
    if (!autoRotate || isInteracting) return;
    const timer = setInterval(() => {
      setYaw((prev) => (prev + 0.35) % 360);
    }, 32);
    return () => clearInterval(timer);
  }, [autoRotate, isInteracting]);

  const offsetRatio = yaw / 360;
  const translateX = -offsetRatio * PANORAMA_WIDTH;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View
        style={[
          styles.canvas,
          {
            transform: [{ translateX }, { translateY: pitch }],
          },
        ]}
      >
        <Image source={{ uri: panoramaUrl }} style={styles.image} contentFit="cover" />
        <Image source={{ uri: panoramaUrl }} style={styles.image} contentFit="cover" />
      </View>

      {/* In-Scene 360 Hotspots */}
      {hotspots.map((h) => {
        const diff = ((((h.yawAngle - yaw) % 360) + 540) % 360) - 180;
        const isVisible = Math.abs(diff) <= FOV_HALF;
        if (!isVisible) return null;

        const screenX = (SCREEN_WIDTH / 2) + (diff / FOV_HALF) * (SCREEN_WIDTH * 0.44) - 70;
        const screenY = (PANORAMA_HEIGHT / 2) + pitch * 0.5 - 20;

        return (
          <TouchableOpacity
            key={h.id}
            onPress={() => onSelectHotspot(h.targetRoomId)}
            style={[styles.hotspotBadge, { left: screenX, top: screenY }]}
          >
            <View style={styles.pulseDot} />
            <Text numberOfLines={1} style={styles.hotspotText}>{h.label}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Compass and gesture indicator overlay */}
      <View style={styles.compassBadge}>
        <Ionicons name="compass-outline" size={16} color={colors.sage[700]} />
        <Text style={styles.compassText}>{Math.round(yaw)}°</Text>
      </View>

      <View style={styles.instructionPill}>
        <Ionicons name="hand-left-outline" size={14} color="#ffffff" />
        <Text style={styles.instructionText}>Geser layar untuk melihat sekeliling 360°</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: PANORAMA_HEIGHT,
    backgroundColor: '#0a0d0b',
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    flexDirection: 'row',
    width: PANORAMA_WIDTH * 2,
    height: PANORAMA_HEIGHT + 100,
    marginTop: -50,
  },
  image: {
    width: PANORAMA_WIDTH,
    height: PANORAMA_HEIGHT + 100,
  },
  hotspotBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 23, 21, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.sage[400],
    zIndex: 10,
    maxWidth: 160,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#22c55e',
  },
  hotspotText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
  compassBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  compassText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  instructionPill: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 23, 21, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
});
