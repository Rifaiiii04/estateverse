import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { CaptureTarget } from '../../../../shared/capturePolicy.ts';
import type { CapturedFrame } from '@/types/capture';

interface Props { frames: CapturedFrame[]; targets: CaptureTarget[]; index: number }
const bandNames = { horizon: 'Sejajar mata', up: 'Bagian atas', down: 'Bagian bawah', ceiling: 'Plafon', floor: 'Lantai' };

// SweepStrip previews central slices from accepted JPEGs in the current pass, leaving pending views empty.
export const SweepStrip = memo(function SweepStrip({ frames, targets, index }: Props) {
  const target = targets[Math.min(index, targets.length - 1)];
  const pass = targets.filter(item => item.ring === target.ring && item.pitch === target.pitch);
  const accepted = pass.filter(item => frames[item.id]).length;
  const calibrating = targets.length === 3;
  return (
    <View style={styles.panel}>
      <View style={styles.labelRow}>
        <Text style={styles.text}>{calibrating ? 'Sapuan awal' : bandNames[target.ring]}</Text>
        <Text style={styles.text}>{accepted}/{pass.length}</Text>
      </View>
      <View style={styles.strip} accessibilityLabel={`Pratinjau sapuan, ${accepted} dari ${pass.length} bagian`}>
        {pass.map(item => (
          <View key={item.id} style={[styles.slot, item.id === index && styles.current]}>
            {frames[item.id] && <Image source={{ uri: frames[item.id].uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="none" />}
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: { gap: 7 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  text: { color: '#fff', fontWeight: '600' },
  strip: { flexDirection: 'row', height: 56, backgroundColor: '#323835', borderRadius: 6, overflow: 'hidden' },
  slot: { flex: 1 },
  current: { borderColor: '#9ae3ae', borderWidth: 2 },
});
