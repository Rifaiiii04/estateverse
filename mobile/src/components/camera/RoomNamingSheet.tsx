import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { CapturedFrame, DraftTourRoom } from '@/types/capture';

interface Props {
  frames: CapturedFrame[];
  totalCapturedRooms: number;
  onRecordAnother: (room: DraftTourRoom) => void;
  onFinishAll: (room: DraftTourRoom) => void;
}

// RoomNamingSheet labels raw camera frames honestly as a draft that still requires backend processing.
export function RoomNamingSheet({ frames, totalCapturedRooms, onRecordAnother, onFinishAll }: Props) {
  const [name, setName] = useState(`Ruangan ${totalCapturedRooms+1}`);
  const [note, setNote] = useState('');
  // finish hands raw photos to the draft without presenting one photograph as a completed panorama.
  const finish = (callback: Props['onFinishAll']) => {
    if (name.trim()) callback({ name: name.trim(), roomSpecs: note.trim(), panoramaUrl: '', frames });
  };
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 18, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>{frames.length} foto ruangan terekam</Text>
      <Text>Panorama akan dibuat di server setelah properti disimpan. Rekaman ini belum menjadi foto 360°.</Text>
      <Text>Nama ruangan</Text>
      <TextInput accessibilityLabel="Nama ruangan" value={name} maxLength={40} onChangeText={setName} style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
      <Text>Catatan (opsional)</Text>
      <TextInput accessibilityLabel="Catatan ruangan" value={note} maxLength={160} onChangeText={setNote} style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
      <TouchableOpacity disabled={!name.trim()} onPress={() => finish(onRecordAnother)}><Text style={{ fontSize: 18, color: '#345e45' }}>Simpan & rekam ruangan lain</Text></TouchableOpacity>
      <TouchableOpacity disabled={!name.trim()} onPress={() => finish(onFinishAll)}><Text style={{ fontSize: 18, color: '#345e45' }}>Simpan rekaman & selesai</Text></TouchableOpacity>
    </View>
  );
}
