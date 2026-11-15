import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BenefitsSelector } from '@/components/BenefitsSelector';
import { FormInput } from '@/components/dashboard/FormInput';
import { ImagePickerSection } from '@/components/dashboard/ImagePickerSection';
import { TourRoomManager } from '@/components/dashboard/TourRoomManager';
import { Header } from '@/components/Header';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getOwnedProperty } from '@/lib/api/properties';
import { createProperty, updateProperty } from '@/lib/api/propertyWrites';
import { getOwnerTourRooms } from '@/lib/api/tours';
import { saveTourDrafts } from '@/lib/capture/saveTourDrafts';
import type { DraftTourRoom } from '@/types/capture';
import { PROPERTY_TYPE_OPTIONS } from '@/lib/content';
import { normalizeWhatsAppNumber } from '@/lib/formatters';
import type { PropertyInput, PropertyStatus, PropertyType } from '@/types/property';

// Renders the property creation and editing form with image picking, 360 tour, and specifications.
export default function PropertyFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('house');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [landArea, setLandArea] = useState('');
  const [buildingArea, setBuildingArea] = useState('');
  const [bedrooms, setBedrooms] = useState('3');
  const [bathrooms, setBathrooms] = useState('2');
  const [floors, setFloors] = useState('1');
  const [whatsapp, setWhatsapp] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<PropertyStatus>('published');
  const [benefits, setBenefits] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [tourRooms, setTourRooms] = useState<DraftTourRoom[]>([]);
  const [savedId, setSavedId] = useState(id ? Number(id) : null);
  const [model3dPath, setModel3dPath] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Loads an existing property and its 360 tour rooms if editing by id.
    async function loadExisting() {
      if (!id || !user) return;
      const propId = Number.parseInt(id, 10);
      const [existing, existingRooms] = await Promise.all([
        getOwnedProperty(propId),
        getOwnerTourRooms(propId),
      ]);
      if (!existing) return;
      setTitle(existing.title);
      setPropertyType(existing.propertyType);
      setPrice(String(existing.price));
      setAddress(existing.address);
      setCity(existing.city);
      setProvince(existing.province);
      setLandArea(String(existing.landArea));
      setBuildingArea(String(existing.buildingArea));
      setBedrooms(String(existing.bedrooms));
      setBathrooms(String(existing.bathrooms));
      setFloors(String(existing.floors));
      setWhatsapp(existing.whatsappNumber);
      setDescription(existing.description);
      setStatus(existing.status);
      setBenefits(existing.benefits);
      setImages(existing.images.map((img) => img.filePath));
      setModel3dPath(existing.model3dPath || '');
      setTourRooms(
        existingRooms.map((r) => ({
          id: r.id,
          status: r.status,
          errorMessage: r.errorMessage,
          name: r.name,
          panoramaUrl: r.panoramaUrl,
          roomSpecs: r.roomSpecs,
        })),
      );
    }
    void loadExisting().catch((error) => Alert.alert('Gagal memuat properti', error instanceof Error ? error.message : 'Periksa koneksi server.'));
  }, [id, user]);

  // Saves the backend listing before uploading raw captures to the shared stitching queue.
  const handleSave = async () => {
    if (!user) return;
    const parsedPrice = Number.parseInt(price.replace(/\D/g, ''), 10);
    const parsedLand = Number.parseInt(landArea.replace(/\D/g, ''), 10);
    const parsedBuilding = Number.parseInt(buildingArea.replace(/\D/g, ''), 10);
    const cleanWa = normalizeWhatsAppNumber(whatsapp);

    if (!title.trim() || !parsedPrice || !city.trim() || !cleanWa) {
      Alert.alert('Data Belum Lengkap', 'Judul, harga, kota, dan nomor WhatsApp wajib diisi.');
      return;
    }

    const payload: PropertyInput = {
      title: title.trim(),
      propertyType,
      price: parsedPrice,
      address: address.trim() || city.trim(),
      city: city.trim(),
      province: province.trim() || 'Indonesia',
      landArea: parsedLand || 100,
      buildingArea: parsedBuilding || 80,
      bedrooms: Number.parseInt(bedrooms, 10) || 1,
      bathrooms: Number.parseInt(bathrooms, 10) || 1,
      floors: Number.parseInt(floors, 10) || 1,
      whatsappNumber: cleanWa,
      description: description.trim() || 'Hunian modern dengan lingkungan nyaman.',
      status: tourRooms.some((room) => Boolean(room.frames?.length)) ? 'draft' : status,
      benefits,
      imagePaths: images,
      model3dPath,
    };

    try {
      setSubmitting(true);
      let targetPropId = savedId || 0;
      if (targetPropId) {
        const saved = await updateProperty(targetPropId, payload);
        if (payload.status === 'published' && saved.status === 'draft') {
          Alert.alert('Masih Diproses', 'Perubahan tersimpan sebagai draft sampai semua panorama selesai diproses.');
        }
      } else {
        targetPropId = await createProperty(payload);
        setSavedId(targetPropId);
      }
      await saveTourDrafts(targetPropId, tourRooms, (index, room) => setTourRooms((current) => current.map((r, i) => i === index ? room : r)));

      const hasAsyncCaptures = tourRooms.some((room) => Boolean(room.frames?.length));
      Alert.alert('Berhasil Disimpan', hasAsyncCaptures
        ? 'Properti disimpan sebagai draft. Server sedang menyusun panorama; Anda akan mendapat pemberitahuan saat siap dipublish.'
        : 'Properti tersimpan. Foto ruangan diproses di server; buka Edit untuk melihat status panoramanya.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Belum Selesai', error instanceof Error ? error.message : 'Gagal menyimpan. Coba lagi; rekaman yang belum terkirim tetap tersedia.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title={id ? 'Edit Properti' : 'Pasang Iklan Baru'} showBack />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ImagePickerSection images={images} onChange={setImages} />
          <TourRoomManager rooms={tourRooms} onChange={setTourRooms} propertyId={savedId} disabled={submitting} />

          <FormInput label="Judul Iklan" placeholder="Contoh: Modern Tropical Villa" value={title} onChangeText={setTitle} />
          
          <View style={styles.typeRow}>
            <Text style={styles.label}>Tipe Properti</Text>
            <View style={styles.typePills}>
              {PROPERTY_TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setPropertyType(opt.value)}
                  style={[styles.typePill, propertyType === opt.value && styles.typePillActive]}
                >
                  <Text style={[styles.typePillText, propertyType === opt.value && styles.typePillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <FormInput label="Harga (Rupiah)" placeholder="Contoh: 2500000000" keyboardType="numeric" value={price} onChangeText={setPrice} />
          <FormInput label="Kota" placeholder="Contoh: Bandung" value={city} onChangeText={setCity} />
          <FormInput label="Provinsi" placeholder="Contoh: Jawa Barat" value={province} onChangeText={setProvince} />
          <FormInput label="Alamat / Kawasan" placeholder="Contoh: Dago Atas No. 12" value={address} onChangeText={setAddress} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}><FormInput label="LT (mÂ²)" keyboardType="numeric" value={landArea} onChangeText={setLandArea} /></View>
            <View style={{ flex: 1 }}><FormInput label="LB (mÂ²)" keyboardType="numeric" value={buildingArea} onChangeText={setBuildingArea} /></View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}><FormInput label="Kamar Tidur" keyboardType="numeric" value={bedrooms} onChangeText={setBedrooms} /></View>
            <View style={{ flex: 1 }}><FormInput label="Kamar Mandi" keyboardType="numeric" value={bathrooms} onChangeText={setBathrooms} /></View>
            <View style={{ flex: 1 }}><FormInput label="Lantai" keyboardType="numeric" value={floors} onChangeText={setFloors} /></View>
          </View>

          <FormInput label="Nomor WhatsApp" placeholder="Contoh: 08123456789" keyboardType="phone-pad" value={whatsapp} onChangeText={setWhatsapp} />
          <FormInput label="Deskripsi Rumah" placeholder="Ceritakan kelebihan rumah Anda..." multiline numberOfLines={3} style={{ height: 70, textAlignVertical: 'top' }} value={description} onChangeText={setDescription} />

          <BenefitsSelector selectedBenefits={benefits} onChange={setBenefits} />

          <View style={styles.statusRow}>
            <Text style={styles.label}>Status Iklan</Text>
            <View style={styles.statusOptions}>
              <TouchableOpacity onPress={() => setStatus('published')} style={[styles.statusBtn, status === 'published' && styles.statusBtnActive]}>
                <Ionicons name="checkmark-circle" size={16} color={status === 'published' ? '#ffffff' : colors.muted} />
                <Text style={[styles.statusBtnText, status === 'published' && styles.statusBtnTextActive]}>Tayang</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStatus('draft')} style={[styles.statusBtn, status === 'draft' && styles.statusBtnActive]}>
                <Ionicons name="archive-outline" size={16} color={status === 'draft' ? '#ffffff' : colors.muted} />
                <Text style={[styles.statusBtnText, status === 'draft' && styles.statusBtnTextActive]}>Simpan Draft</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity disabled={submitting} onPress={handleSave} style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}>
            <Text style={styles.saveBtnText}>{submitting ? 'Menyimpan...' : 'Simpan Properti'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background, paddingBottom: 60 },
  label: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: colors.inkLight },
  typeRow: { gap: 6 },
  typePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.sand },
  typePillActive: { backgroundColor: colors.ink },
  typePillText: { fontSize: typography.sizes.xs, color: colors.inkLight },
  typePillTextActive: { color: '#ffffff', fontWeight: typography.weights.bold },
  row: { flexDirection: 'row', gap: spacing.sm },
  statusRow: { gap: 6 },
  statusOptions: { flexDirection: 'row', gap: spacing.sm },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.sand },
  statusBtnActive: { backgroundColor: colors.sage[600] },
  statusBtnText: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: typography.weights.medium },
  statusBtnTextActive: { color: '#ffffff', fontWeight: typography.weights.bold },
  saveBtn: { backgroundColor: colors.sage[600], paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#ffffff', fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
});
