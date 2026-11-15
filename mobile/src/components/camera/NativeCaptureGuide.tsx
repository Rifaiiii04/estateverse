import React from 'react';
import { View, Text } from 'react-native';
import { poseAngles } from '../../../../shared/captureMath.ts';
import { STEADY_SPEED_DEG_S } from '../../../../shared/capturePolicy.ts';
import type { useNativeCapture } from '@/lib/capture/useNativeCapture';

// NativeCaptureGuide guides each required pitch and yaw instead of marking unphotographed sectors as covered.
export function NativeCaptureGuide({ capture }: { capture: ReturnType<typeof useNativeCapture> }) {
  const target = capture.targets[capture.frames.length];
  const angles = capture.sample ? poseAngles(capture.sample.quaternion) : { yaw: 0, pitch: 0 };
  const horizontal = target ? ((target.yaw-angles.yaw+540)%360)-180 : 0;
  const vertical = target ? target.pitch-angles.pitch : 0;
  const moving = capture.speed > STEADY_SPEED_DEG_S;
  return (
    <View pointerEvents="none" style={{ flex: 1, justifyContent: 'space-between', padding: 24, paddingTop: 85 }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{capture.targets.length === 3 ? 'Kalibrasi kamera · ' : ''}{capture.frames.length}/{capture.targets.length} foto</Text>
      <View style={{ alignSelf: 'center', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: '#fff', fontSize: 56 }}>{Math.abs(vertical)>8 ? vertical>0 ? '↑' : '↓' : Math.abs(horizontal)>5 ? horizontal>0 ? '→' : '←' : '◎'}</Text>
        <Text style={{ color: '#fff', backgroundColor: '#000b', padding: 10 }}>Arah {Math.round(horizontal)}° · Kemiringan {Math.round(vertical)}°</Text>
      </View>
      <View style={{ backgroundColor: '#000c', borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ color: '#fff' }}>{moving ? 'Tahan HP sampai benar-benar diam.' : 'Ikuti panah, lalu tahan sampai penghitung foto bertambah.'}</Text>
        <Text style={{ color: '#fff' }}>Jaga posisi lensa. Jangan berjalan atau mengayunkan HP.</Text>
        {!!capture.error && <Text style={{ color: '#ffd38a' }}>{capture.error}</Text>}
      </View>
    </View>
  );
}
