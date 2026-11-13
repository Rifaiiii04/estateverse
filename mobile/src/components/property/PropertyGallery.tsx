import React, { useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { PropertyImage } from '@/types/property';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PropertyGalleryProps {
  images: PropertyImage[];
  propertyType: string;
}

// Renders the swipeable horizontal photo gallery carousel with index counter.
export function PropertyGallery({ images, propertyType }: PropertyGalleryProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const photoList =
    images.length > 0
      ? images
      : [{ id: 0, filePath: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', sortOrder: 0 }];

  return (
    <View style={styles.container}>
      <FlatList
        data={photoList}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => String(index)}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActivePhotoIndex(newIndex);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item.filePath }} style={styles.image} contentFit="cover" />
        )}
      />
      <View style={styles.photoCounter}>
        <Text style={styles.photoCounterText}>
          {activePhotoIndex + 1} / {photoList.length}
        </Text>
      </View>
      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>{propertyType}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: 260,
    position: 'relative',
    backgroundColor: colors.sand,
  },
  image: {
    width: SCREEN_WIDTH,
    height: 260,
  },
  photoCounter: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(20, 23, 21, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  photoCounterText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: typography.weights.semibold,
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(20, 23, 21, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: typography.weights.bold,
  },
});
