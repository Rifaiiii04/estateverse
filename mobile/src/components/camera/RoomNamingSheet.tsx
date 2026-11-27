import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MAX_TOUR_ROOMS, type CapturedBand, type DraftTourRoom } from '@/types/capture';

interface Props {
  bands: CapturedBand[];
  totalCapturedRooms: number;
  onRecordAnother: (room: DraftTourRoom) => void;
  onFinishAll: (room: DraftTourRoom) => void;
}

// RoomNamingSheet previews the completed panorama strips and names the room before upload.
export function RoomNamingSheet({ bands, totalCapturedRooms, onRecordAnother, onFinishAll }: Props) {
  const [name, setName] = useState(`Ruangan ${totalCapturedRooms+1}`);
  const [note, setNote] = useState('');
  // finish transfers the room description to the owner of its panorama files.
  const finish = (callback: Props['onFinishAll']) => {
    if (name.trim()) callback({ name: name.trim(), roomSpecs: note.trim(), panoramaUrl: '' });
  };
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 18, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>{bands.length} panorama ruangan terekam</Text>
      <View style={{ height: 125, gap: 2, backgroundColor: '#19241e' }}>
        {[...bands].sort((a, b) => b.meta.pitch - a.meta.pitch).map(band => <Image key={band.meta.index} source={{ uri: band.uri }} contentFit="contain" style={{ flex: 1 }} />)}
      </View>
      <Text>Simpan properti untuk menggabungkan sapuan ini menjadi satu ruangan Walk Inside.</Text>
      <Text>Nama ruangan</Text>
      <TextInput accessibilityLabel="Nama ruangan" value={name} maxLength={40} onChangeText={setName} style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
      <Text>Catatan (opsional)</Text>
      <TextInput accessibilityLabel="Catatan ruangan" value={note} maxLength={160} onChangeText={setNote} style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
      {totalCapturedRooms + 1 < MAX_TOUR_ROOMS && <TouchableOpacity disabled={!name.trim()} onPress={() => finish(onRecordAnother)}><Text style={{ fontSize: 18, color: '#345e45' }}>Simpan & rekam ruangan lain</Text></TouchableOpacity>}
      <TouchableOpacity disabled={!name.trim()} onPress={() => finish(onFinishAll)}><Text style={{ fontSize: 18, color: '#345e45' }}>Simpan rekaman & selesai</Text></TouchableOpacity>
    </View>
  );
}
