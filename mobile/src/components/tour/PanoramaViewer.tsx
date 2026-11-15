import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, Text, TouchableOpacity, View } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { createPanoramaRenderer, type PanoramaRenderer } from './panoramaRenderer';
import type { TourHotspot } from '@/types/property';

interface Props { panoramaUrl: string; hotspots?: TourHotspot[]; onSelectHotspot: (id: number) => void; autoRotate?: boolean }

// PanoramaViewer uses spherical projection of the backend panorama rather than stretching a flat image strip.
export function PanoramaViewer({ panoramaUrl, hotspots = [], onSelectHotspot, autoRotate = false }: Props) {
  return <PanoramaSurface key={panoramaUrl} panoramaUrl={panoramaUrl} hotspots={hotspots} onSelectHotspot={onSelectHotspot} autoRotate={autoRotate} />;
}

// PanoramaSurface owns one room's GPU lifetime and clamps pitch while wrapping yaw across the full sphere.
function PanoramaSurface({ panoramaUrl, hotspots = [], onSelectHotspot, autoRotate }: Props) {
  const renderer = useRef<PanoramaRenderer | null>(null);
  const alive = useRef(true);
  const pose = useRef({ yaw: 0, pitch: 0 });
  const origin = useRef({ yaw: 0, pitch: 0 });
  const touching = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState({ yaw: 0, pitch: 0 });
  // draw updates only camera orientation; all image generation has already happened on the server.
  const draw = (yaw: number, pitch: number) => {
    pose.current = { yaw: (yaw+360)%360, pitch: Math.max(-89, Math.min(89, pitch)) };
    renderer.current?.draw(pose.current.yaw, pose.current.pitch);
    setView({ ...pose.current });
  };
  // eslint-disable-next-line react-hooks/refs -- PanResponder stores these callbacks and invokes them only for gestures.
  const gestures = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false, onMoveShouldSetPanResponder: (_, g) => Math.hypot(g.dx, g.dy)>5,
    onPanResponderGrant: () => { touching.current = true; origin.current = { ...pose.current }; },
    onPanResponderMove: (_, g) => draw(origin.current.yaw-g.dx*0.15, origin.current.pitch+g.dy*0.15),
    onPanResponderRelease: () => { touching.current = false; }, onPanResponderTerminate: () => { touching.current = false; },
  }), []);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; renderer.current?.dispose(); renderer.current = null; };
  }, []);
  useEffect(() => {
    if (!autoRotate || loading || error) return;
    const timer = setInterval(() => { if (!touching.current) draw(pose.current.yaw+0.3, pose.current.pitch); }, 50);
    return () => clearInterval(timer);
  }, [autoRotate, error, loading]);
  // initialize loads exactly the panorama URL supplied by the shared tour API.
  const initialize = async (gl: ExpoWebGLRenderingContext) => {
    try {
      const next = await createPanoramaRenderer(gl, panoramaUrl);
      if (!alive.current) { next.dispose(); return; }
      renderer.current = next; next.draw(0, 0); setLoading(false);
    } catch { if (alive.current) { setLoading(false); setError('Panorama gagal dimuat. Periksa koneksi lalu buka kembali ruangan.'); } }
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#111' }} {...gestures.panHandlers}>
      <GLView style={{ flex: 1 }} onContextCreate={(gl) => void initialize(gl)} />
      {(loading || error) && <View style={{ position: 'absolute', top: '45%', alignSelf: 'center', padding: 12 }}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>{error}</Text>}</View>}
      <Text style={{ position: 'absolute', top: 12, left: 12, color: '#fff' }}>{Math.round(view.yaw)}° · Geser untuk melihat sekeliling</Text>
      <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {hotspots.map((h) => <TouchableOpacity key={h.id} onPress={() => onSelectHotspot(h.targetRoomId)} style={{ backgroundColor: '#345e45', padding: 12, borderRadius: 12 }}><Text style={{ color: '#fff' }}>→ {h.label}</Text></TouchableOpacity>)}
      </View>
    </View>
  );
}
