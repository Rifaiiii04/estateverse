import React, { useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RoomNamingSheet } from './RoomNamingSheet';
import { NativeCaptureGuide } from './NativeCaptureGuide';
import { useNativeCapture } from '@/lib/capture/useNativeCapture';
import { preferredPictureSize } from '@/lib/capture/cameraSize';
import { MAX_TOUR_ROOMS, type DraftTourRoom } from '@/types/capture';

interface Props { roomCount: number; onClose: () => void; onComplete: (room: DraftTourRoom) => void }

// Guided360CameraModal manages panorama sweeps, lens calibration, and transfer of completed room drafts.
export function Guided360CameraModal({ onClose, onComplete, roomCount }: Props) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [pictureSize, setPictureSize] = useState<string>();
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState('');
  const [cameraKey, setCameraKey] = useState(0);
  const capture = useNativeCapture(camera);
  const { cameraFailed, phase } = capture;
  useEffect(() => { if (failure && phase === 'capturing') cameraFailed(failure); }, [cameraFailed, failure, phase]);
  // prepareCamera prefers a supported sample size and keeps the camera default when enumeration is unavailable.
  const prepareCamera = async () => {
    const active = camera.current;
    if (!active) return;
    const preferred = await preferredPictureSize(active);
    if (active !== camera.current) return;
    setPictureSize(preferred);
    setReady(true);
  };
  // saveRoom transfers file ownership only when saving a full room draft.
  const saveRoom = (room: DraftTourRoom, finish: boolean) => {
    const bands = capture.collect();
    if (!bands) return;
    onComplete({ ...room, captureId: randomUUID(), bands });
    setReady(false);
    if (finish || roomCount + 1 >= MAX_TOUR_ROOMS) onClose();
  };
  // retryCamera remounts a failed native camera without losing rooms already saved to the listing.
  const retryCamera = () => { setFailure(''); setReady(false); setCameraKey(key => key + 1); };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {permission?.granted && !failure && capture.phase !== 'review' && <CameraView key={cameraKey} ref={camera} facing="back" mirror={false} animateShutter={false} pictureSize={pictureSize} ratio="16:9" onCameraReady={prepareCamera} onMountError={(event) => { const message = event.message || 'Kamera tidak tersedia.'; setFailure(message); setReady(false); cameraFailed(message); }} style={{ position: 'absolute', width: '100%', height: '100%' }} />}
        {capture.phase === 'capturing' && <NativeCaptureGuide capture={capture} />}
        {(capture.phase === 'intro' || capture.phase === 'starting') && <CaptureStart permission={!!permission?.granted} requestPermission={requestPermission} ready={ready} retry={failure ? retryCamera : undefined} capture={capture} />}
        {capture.phase === 'saving' && <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 14, backgroundColor: '#000b' }}>
          <Text style={{ color: '#fff' }}>{capture.error || 'Menyimpan panorama sapuan ini…'}</Text>
          {!!capture.error && <TouchableOpacity onPress={capture.saveBand}><Text style={{ color: '#a9e7ba' }}>Coba simpan lagi</Text></TouchableOpacity>}
        </View>}
        {capture.phase === 'review' && <RoomNamingSheet bands={capture.bands} totalCapturedRooms={roomCount} onRecordAnother={(r) => saveRoom(r, false)} onFinishAll={(r) => saveRoom(r, true)} />}
        <TouchableOpacity accessibilityLabel="Tutup perekam" onPress={onClose} style={{ position: 'absolute', top: 24, right: 24, backgroundColor: '#000b', padding: 12 }}><Text style={{ color: '#fff' }}>Tutup</Text></TouchableOpacity>
      </View>
    </Modal>
  );
}

// CaptureStart explains the panoramic sweep and requests access to the rear camera.
function CaptureStart({ permission, requestPermission, ready, retry, capture }: {
  permission: boolean; requestPermission: () => Promise<unknown>; ready: boolean;
  retry?: () => void;
  capture: ReturnType<typeof useNativeCapture>;
}) {
  const starting = capture.phase === 'starting';
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#000b', padding: 24, gap: 20 }}>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>Kamera panorama 360°</Text>
      <Text style={{ color: '#fff' }}>Pegang HP tegak dan putar perlahan ke kanan dari satu posisi lensa. Gambar yang terekam akan mengisi strip.</Text>
      <Text style={{ color: '#fff' }}>Rekam 3–5 sapuan mengelilingi ruangan. Mulai sejajar mata, lalu ikuti kemiringan berikutnya sampai plafon dan lantai tercakup.</Text>
      {!!capture.error && <Text style={{ color: '#ffd38a' }}>{capture.error}</Text>}
      <TouchableOpacity disabled={starting || (permission && !ready && !retry)} onPress={retry ?? (() => permission ? void capture.start() : void requestPermission())} style={{ backgroundColor: '#345e45', padding: 16 }}><Text style={{ color: '#fff' }}>{retry ? 'Coba buka kamera lagi' : !permission ? 'Izinkan kamera' : starting ? 'Menyiapkan sapuan…' : ready ? 'Mulai sapuan' : 'Menyiapkan kamera…'}</Text></TouchableOpacity>
    </View>
  );
}
