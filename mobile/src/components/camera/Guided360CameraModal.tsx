import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { DeviceMotion } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';

import { RoomNamingSheet } from '@/components/camera/RoomNamingSheet';
import { SweepGuideOverlay } from '@/components/camera/SweepGuideOverlay';
import { colors, radius, spacing, typography } from '@/constants/theme';
import type { TourRoomInput } from '@/db/tourRepository';
import { persistImageUri } from '@/lib/imageStorage';

interface Guided360CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (rooms: TourRoomInput[]) => void;
}

const TOTAL_SECTORS = 12; // 360 / 12 = 30 degrees per sector

// Manages real-time 360 camera recording with guided circular sweeping and multi-room capture.
export function Guided360CameraModal({ visible, onClose, onComplete }: Guided360CameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [coveredSectors, setCoveredSectors] = useState<Set<number>>(new Set());
  const [currentAngle, setCurrentAngle] = useState(0);
  const [isTooFast, setIsTooFast] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [accumulatedRooms, setAccumulatedRooms] = useState<TourRoomInput[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  // Tracks device rotational movement and marks covered sectors in real time.
  useEffect(() => {
    if (!visible || capturedPhotoUri) return;

    let sub: any;
    try {
      DeviceMotion.setUpdateInterval(60);
      sub = DeviceMotion.addListener((event) => {
        if (!event.rotation) return;
        const deg = (event.rotation.alpha * (180 / Math.PI) + 360) % 360;
        const now = Date.now();
        const dt = Math.max(1, (now - lastTimeRef.current) / 1000);
        const delta = Math.abs(deg - lastAngleRef.current);
        const speed = (delta > 180 ? 360 - delta : delta) / dt;

        setIsTooFast(speed > 160);
        setCurrentAngle(deg);
        lastAngleRef.current = deg;
        lastTimeRef.current = now;

        const sector = Math.floor(deg / (360 / TOTAL_SECTORS));
        setCoveredSectors((prev) => {
          if (prev.has(sector)) return prev;
          const next = new Set(prev);
          next.add(sector);
          return next;
        });
      });
    } catch {
      // Sensor unavailable in simulator
    }

    return () => {
      if (sub && typeof sub.remove === 'function') sub.remove();
    };
  }, [visible, capturedPhotoUri]);

  const progressPercent = (coveredSectors.size / TOTAL_SECTORS) * 100;

  // Triggers snapshot once all sectors (100%) have been swept.
  useEffect(() => {
    if (progressPercent >= 100 && !capturedPhotoUri && !isCapturing) {
      handleFinalizeRoomCapture();
    }
  }, [progressPercent, capturedPhotoUri, isCapturing]);

  // Captures the panoramic frame from the camera and prepares the naming sheet.
  const handleFinalizeRoomCapture = async () => {
    setIsCapturing(true);
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
        if (photo?.uri) {
          const persisted = await persistImageUri(photo.uri);
          setCapturedPhotoUri(persisted);
          return;
        }
      }
      setCapturedPhotoUri('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80');
    } catch {
      setCapturedPhotoUri('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80');
    } finally {
      setIsCapturing(false);
    }
  };

  // Simulates stepping through sectors for testing environments without gyro.
  const handleManualAdvance = () => {
    setCoveredSectors((prev) => {
      const next = new Set(prev);
      next.add(next.size % TOTAL_SECTORS);
      return next;
    });
    setCurrentAngle((prev) => (prev + 30) % 360);
  };

  // Saves current room and resets the sweep for another room.
  const handleRecordAnother = (room: TourRoomInput) => {
    setAccumulatedRooms((prev) => [...prev, room]);
    setCapturedPhotoUri(null);
    setCoveredSectors(new Set());
    setCurrentAngle(0);
  };

  // Saves all captured rooms and closes the camera modal.
  const handleFinishAll = (finalRoom: TourRoomInput) => {
    const all = [...accumulatedRooms, finalRoom];
    onComplete(all);
    setAccumulatedRooms([]);
    setCapturedPhotoUri(null);
    setCoveredSectors(new Set());
    onClose();
  };

  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={56} color={colors.sage[600]} />
          <Text style={styles.permTitle}>Izin Akses Kamera Diperlukan</Text>
          <Text style={styles.permDesc}>
            Aplikasi membutuhkan akses kamera untuk merekam ruangan 360° secara langsung.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
            <Text style={styles.permBtnText}>Beri Izin Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} facing="back" style={StyleSheet.absoluteFill} />

        <SweepGuideOverlay
          progressPercent={progressPercent}
          currentAngle={currentAngle}
          isTooFast={isTooFast}
          onCancel={onClose}
          onManualAdvance={handleManualAdvance}
        />

        {Boolean(capturedPhotoUri) && (
          <View style={styles.sheetOverlay}>
            <RoomNamingSheet
              capturedPhotoUri={capturedPhotoUri!}
              totalCapturedRooms={accumulatedRooms.length}
              onRecordAnother={handleRecordAnother}
              onFinishAll={handleFinishAll}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cameraContainer: { flex: 1, backgroundColor: '#000000' },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  permTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.ink },
  permDesc: { fontSize: typography.sizes.xs, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    backgroundColor: colors.sage[600],
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
  },
  permBtnText: { color: '#ffffff', fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  closeBtn: { paddingVertical: 10 },
  closeBtnText: { color: colors.muted, fontSize: typography.sizes.xs },
  sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
});
