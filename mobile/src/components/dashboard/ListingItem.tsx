import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { formatCompactIDR } from '@/lib/formatters';
import type { Property } from '@/types/property';

interface ListingItemProps {
  property: Property;
  onToggleStatus: (property: Property) => void;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
}

// Renders an individual property item within the seller dashboard manager.
export function ListingItem({
  property,
  onToggleStatus,
  onEdit,
  onDelete,
}: ListingItemProps) {
  const isPublished = property.status === 'published';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.title}>{property.title}</Text>
        <TouchableOpacity
          onPress={() => onToggleStatus(property)}
          style={[styles.statusChip, isPublished ? styles.statusPub : styles.statusDraft]}
        >
          <Text style={[styles.statusText, isPublished ? styles.pubText : styles.draftText]}>
            {isPublished ? 'Tayang' : 'Draft'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.price}>{formatCompactIDR(property.price)}</Text>
      <Text style={styles.subtitle}>
        {property.city} · {property.bedrooms} KT · {property.bathrooms} KM · {property.buildingArea} m²
      </Text>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => onEdit(property)} style={styles.editBtn}>
          <Ionicons name="create-outline" size={14} color={colors.ink} />
          <Text style={styles.btnLabel}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(property)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={14} color={colors.error} />
          <Text style={styles.deleteLabel}>Hapus</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  price: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.sage[700],
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.sand,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  btnLabel: {
    fontSize: 11,
    color: colors.ink,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  deleteLabel: {
    fontSize: 11,
    color: colors.error,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  statusPub: {
    backgroundColor: colors.sage[50],
  },
  pubText: {
    color: colors.sage[700],
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  statusDraft: {
    backgroundColor: colors.sand,
  },
  draftText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
});
