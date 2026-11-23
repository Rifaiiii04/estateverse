import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { sweepGuidance } from '@/lib/capture/sweepGuidance';
import type { useNativeCapture } from '@/lib/capture/useNativeCapture';
import { SweepStrip } from './SweepStrip';

type Capture = ReturnType<typeof useNativeCapture>;

// NativeCaptureGuide shows the real accepted strip and guides the lens along the next band of the sphere.
export function NativeCaptureGuide({ capture }: { capture: Capture }) {
  const index = capture.frames.length;
  const target = capture.targets[index] ?? capture.targets[capture.targets.length - 1];
  const { arrow, hint } = sweepGuidance(capture.sample?.quaternion, target, capture.speed, index > 0);
  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={styles.card}>
        <SweepStrip frames={capture.frames} targets={capture.targets} index={index} />
      </View>
      <View style={styles.guide}>
        <View style={styles.line} />
        <View style={styles.aperture}><Text style={styles.arrow}>{arrow}</Text></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.hint}>{hint}</Text>
        {!!capture.error && <Text style={styles.warning}>{capture.error}</Text>}
        {capture.targets.length > 3 && <Text style={styles.progress}>Seluruh ruangan · {index}/{capture.targets.length} bagian</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'space-between', padding: 20, paddingTop: 96, paddingBottom: 38 },
  card: { backgroundColor: '#101b17db', borderRadius: 12, padding: 14, gap: 7 },
  guide: { alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', width: '88%', height: 2, backgroundColor: '#ffffffaa' },
  aperture: { borderWidth: 2, borderColor: '#fff', borderRadius: 40, width: 56, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15241dcc' },
  arrow: { color: '#fff', fontWeight: '700', fontSize: 28 },
  hint: { color: '#fff', fontWeight: '600', fontSize: 16 },
  progress: { color: '#c1d1c9' },
  warning: { color: '#ffdb9b' },
});
