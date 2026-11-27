import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { useNativeCapture } from '@/lib/capture/useNativeCapture';

type Capture = ReturnType<typeof useNativeCapture>;

// NativeCaptureGuide shows the real accepted strip and guides the lens along the next band of the sphere.
export function NativeCaptureGuide({ capture }: { capture: Capture }) {
  const index = capture.bands.length + 1;
  const percent = Math.floor(capture.progress * 100);
  const tilt = capture.pitch === 0 ? 'Sejajar mata' : `${Math.abs(Math.round(capture.pitch))}° ke ${capture.pitch > 0 ? 'atas' : 'bawah'}`;
  const previous = capture.bands.at(-1);
  const strip = capture.preview || previous?.uri;
  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.hint}>Sapuan {index}{capture.count > 0 ? ` / ${capture.count}` : ''} · {tilt}</Text>
        <View style={styles.strip}>
          {!capture.count && !strip && <Text style={styles.calibration}>Mengukur lensa saat sapuan dimulai…</Text>}
          {!!strip && <Image accessibilityLabel="Panorama yang sudah terekam" source={{ uri: strip }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="none" />}
        </View>
        {!capture.preview && previous && <Text style={styles.progress}>Sapuan sebelumnya tersimpan</Text>}
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
      </View>
      <View style={styles.guide}>
        <View style={styles.line} />
        <View style={styles.aperture}><Text style={styles.arrow}>◎</Text></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.hint}>{capture.hint}</Text>
        {!!capture.error && <Text style={styles.warning}>{capture.error}</Text>}
        <Text style={styles.progress}>{percent}% sapuan ini terekam</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'space-between', padding: 20, paddingTop: 96, paddingBottom: 38 },
  card: { backgroundColor: '#101b17db', borderRadius: 12, padding: 14, gap: 7 },
  strip: { height: 66, backgroundColor: '#252c28', borderRadius: 5, overflow: 'hidden' },
  calibration: { color: '#d8e4dd', margin: 12 },
  track: { backgroundColor: '#54605a', height: 4, borderRadius: 2 },
  fill: { backgroundColor: '#a9e7ba', height: '100%' },
  guide: { alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', width: '88%', height: 2, backgroundColor: '#ffffffaa' },
  aperture: { borderWidth: 2, borderColor: '#fff', borderRadius: 40, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15241dcc' },
  arrow: { color: '#fff', fontWeight: '700', fontSize: 28 },
  hint: { color: '#fff', fontWeight: '600', fontSize: 16 },
  progress: { color: '#c1d1c9' },
  warning: { color: '#ffdb9b' },
});
