import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RoomNamingSheet } from './RoomNamingSheet';
import { NativeCaptureGuide } from './NativeCaptureGuide';
import { useNativeCapture } from '@/lib/capture/useNativeCapture';
import { removeCaptureFiles, selectPictureSize } from '@/lib/capture/camera';
import type { DraftTourRoom } from '@/types/capture';

interface Props { visible: boolean; onClose: () => void; onComplete: (rooms: DraftTourRoom[]) => void }

// Guided360CameraModal captures real pose-tagged JPEGs using the same protocol and photo grid as the website.
export function Guided360CameraModal({ onClose, onComplete }: Props) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [pictureSize, setPictureSize] = useState<string>();
  const [ready, setReady] = useState(false);
  const [roomCount, setRoomCount] = useState(0);
  const rooms = useRef<DraftTourRoom[]>([]);
  const capture = useNativeCapture(camera);
  useEffect(() => () => rooms.current.forEach((r) => removeCaptureFiles(r.frames || [])), []);
  // prepareCamera selects one consistent, bounded picture size before the first capture.
  const prepareCamera = async () => {
    try {
      const sizes = await camera.current?.getAvailablePictureSizesAsync();
      if (sizes) { setPictureSize(selectPictureSize(sizes)); setReady(true); }
    } catch (error) { capture.setError(error instanceof Error ? error.message : 'Kamera tidak siap.'); }
  };
  // saveRoom transfers file ownership only when saving a full room draft.
  const saveRoom = (room: DraftTourRoom, finish: boolean) => {
    rooms.current.push({ ...room, frames: capture.collect() });
    setRoomCount(rooms.current.length);
    if (!finish) { setReady(false); return; }
    const saved = rooms.current;
    rooms.current = [];
    onComplete(saved);
    onClose();
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {permission?.granted && capture.phase !== 'review' && <CameraView ref={camera} facing="back" mirror={false} pictureSize={pictureSize} ratio="16:9" onCameraReady={prepareCamera} onMountError={(event) => capture.setError(event.message)} style={{ position: 'absolute', width: '100%', height: '100%' }} />}
        {capture.phase === 'capturing' && <NativeCaptureGuide capture={capture} />}
        {(capture.phase === 'intro' || capture.phase === 'starting') && <CaptureStart permission={!!permission?.granted} requestPermission={requestPermission} ready={ready} capture={capture} />}
        {capture.phase === 'calibrating' && <View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'#000b'}}><Text style={{color:'#fff'}}>Mengukur lensa dan menghitung sudut yang masih perlu difoto…</Text></View>}
        {capture.phase === 'review' && <RoomNamingSheet frames={capture.frames} totalCapturedRooms={roomCount} onRecordAnother={(r) => saveRoom(r, false)} onFinishAll={(r) => saveRoom(r, true)} />}
        <TouchableOpacity accessibilityLabel="Tutup perekam" onPress={onClose} style={{ position: 'absolute', top: 24, right: 24, backgroundColor: '#000b', padding: 12 }}><Text style={{ color: '#fff' }}>Tutup</Text></TouchableOpacity>
      </View>
    </Modal>
  );
}

// CaptureStart explains automatic server planning without asking the seller to choose a photo count.
function CaptureStart({ permission, requestPermission, ready, capture }: {
  permission: boolean; requestPermission: () => Promise<unknown>; ready: boolean;
  capture: ReturnType<typeof useNativeCapture>;
}) {
  const starting = capture.phase === 'starting';
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#000b', padding: 24, gap: 20 }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>Rekam Walk Inside 360°</Text>
      <Text style={{ color: '#fff' }}>Pegang HP portrait. Ikuti titik berurutan: sekeliling, atas, bawah. Pertahankan posisi lensa dan tahan saat foto diambil.</Text>
      <Text style={{ color: '#fff' }}>HP hanya merekam foto. Panorama dibuat oleh server setelah properti disimpan.</Text>
      <Text style={{color:'#fff'}}>Ambil tiga foto awal sesuai panduan. Server mengukur lensa lalu menentukan jumlah dan arah foto berikutnya secara otomatis.</Text>
      {!!capture.error && <Text style={{ color: '#ffd38a' }}>{capture.error}</Text>}
      <TouchableOpacity disabled={starting || (permission && !ready)} onPress={() => permission ? void capture.start() : void requestPermission()} style={{ backgroundColor: '#345e45', padding: 16 }}><Text style={{ color: '#fff' }}>{!permission ? 'Izinkan kamera' : starting ? 'Menyiapkan sensor…' : ready ? 'Mulai merekam' : 'Menyiapkan kamera…'}</Text></TouchableOpacity>
    </View>
  );
}
