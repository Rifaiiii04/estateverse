import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { formatArea, formatCompactIDR } from '@/lib/formatters';
import type { Property } from '@/types/property';

interface PropertyCardProps {
  property: Property;
  compact?: boolean;
}

// Renders an individual property card with photo, price, specs, and location.
export function PropertyCard({ property, compact = false }: PropertyCardProps) {
  const router = useRouter();
  const coverImage = property.images[0]?.filePath ?? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800';

  const handlePress = () => {
    router.push(`/property/${property.slug}` as any);
  };

  if (compact) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={styles.compactCard}
      >
        <Image source={{ uri: coverImage }} style={styles.compactImage} contentFit="cover" />
        <View style={styles.compactContent}>
          <View style={styles.compactTop}>
            <Text numberOfLines={1} style={styles.compactTitle}>{property.title}</Text>
            <Text style={styles.price}>{formatCompactIDR(property.price)}</Text>
          </View>
          <Text numberOfLines={1} style={styles.specs}>
            {property.bedrooms} KT · {property.bathrooms} KM · LB {formatArea(property.buildingArea)}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.muted} />
            <Text numberOfLines={1} style={styles.locationText}>{property.city}, {property.province}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={styles.card}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: coverImage }} style={styles.image} contentFit="cover" />
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{property.propertyType}</Text>
        </View>
        <View style={styles.rightBadges}>
          <View style={styles.tourTag}>
            <Ionicons name="scan-outline" size={10} color="#ffffff" />
            <Text style={styles.tourTagText}>360°</Text>
          </View>
          <View style={styles.floorBadge}>
            <Text style={styles.floorBadgeText}>{property.floors} Lt</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titlePriceRow}>
          <Text numberOfLines={1} style={styles.title}>{property.title}</Text>
          <Text style={styles.price}>{formatCompactIDR(property.price)}</Text>
        </View>

        <Text numberOfLines={1} style={styles.specs}>
          {property.bedrooms} KT · {property.bathrooms} KM · LB {formatArea(property.buildingArea)} · LT {formatArea(property.landArea)}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={colors.sage[600]} />
            <Text numberOfLines={1} style={styles.locationText}>{property.city}, {property.province}</Text>
          </View>
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={13} color={colors.sage[600]} />
            <Text style={styles.verifiedText}>Terverifikasi</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    backgroundColor: colors.sand,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(20, 23, 21, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: '#ffffff',
  },
  rightBadges: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tourTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.sage[700],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  tourTagText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#ffffff',
  },
  floorBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  floorBadgeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  content: {
    padding: spacing.md,
    gap: 6,
  },
  titlePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  price: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.sage[700],
  },
  specs: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  locationText: {
    fontSize: typography.sizes.xs,
    color: colors.inkLight,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    color: colors.sage[700],
    fontWeight: typography.weights.medium,
  },
  compactCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  compactImage: {
    width: 84,
    height: 84,
    borderRadius: radius.sm,
    backgroundColor: colors.sand,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  compactTitle: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
});
