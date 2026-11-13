import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { persistImageUri } from '@/lib/imageStorage';

interface ImagePickerSectionProps {
  images: string[];
  onChange: (images: string[]) => void;
}

// Manages selecting multiple house photos from the device gallery and local caching.
export function ImagePickerSection({ images, onChange }: ImagePickerSectionProps) {
  // Opens system image picker allowing multiple photo selection.
  const handlePickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const persisted = await Promise.all(
        result.assets.map((asset) => persistImageUri(asset.uri)),
      );
      onChange([...images, ...persisted]);
    }
  };

  // Removes a photo by index.
  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Foto Rumah ({images.length})</Text>
        <TouchableOpacity onPress={handlePickImages} style={styles.pickButton}>
          <Ionicons name="camera-outline" size={16} color={colors.sage[700]} />
          <Text style={styles.pickButtonText}>Pilih Foto</Text>
        </TouchableOpacity>
      </View>

      {images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {images.map((uri, index) => (
            <View key={`${uri}_${index}`} style={styles.imageWrap}>
              <Image source={{ uri }} style={styles.thumbnail} contentFit="cover" />
              {index === 0 && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryText}>Utama</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => handleRemoveImage(index)} style={styles.removeBtn}>
                <Ionicons name="close" size={12} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <TouchableOpacity onPress={handlePickImages} style={styles.placeholderBox}>
          <Ionicons name="images-outline" size={32} color={colors.muted} />
          <Text style={styles.placeholderText}>Ketuk untuk memilih foto dari galeri</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: colors.inkLight },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sage[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  pickButtonText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, color: colors.sage[700] },
  gallery: { gap: spacing.sm, paddingVertical: 4 },
  imageWrap: { position: 'relative', width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: colors.sage[700],
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  primaryText: { color: '#ffffff', fontSize: 9, fontWeight: typography.weights.bold },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sand,
    gap: 6,
  },
  placeholderText: { fontSize: typography.sizes.xs, color: colors.muted },
});
