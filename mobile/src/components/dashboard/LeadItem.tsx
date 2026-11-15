import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { LEAD_STATUS_OPTIONS } from '@/lib/content';
import { buildWhatsAppLink, formatDate } from '@/lib/formatters';
import type { Lead } from '@/types/property';

interface LeadItemProps {
  lead: Lead;
  onAdvanceStatus: (lead: Lead) => void;
}

// Renders an inquiry lead card with buyer details, note, status, and direct WhatsApp CTA.
export function LeadItem({ lead, onAdvanceStatus }: LeadItemProps) {
  const statusConfig = LEAD_STATUS_OPTIONS.find((s) => s.value === lead.status);
  const waUrl = buildWhatsAppLink(
    lead.phone,
    `Halo Bapak/Ibu ${lead.name}, terima kasih telah mengajukan jadwal survei rumah di EstateVerse. Kapan waktu yang cocok untuk kita bertemu?`,
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{lead.name}</Text>
        <TouchableOpacity onPress={() => onAdvanceStatus(lead)} style={styles.statusChip}>
          <Text style={styles.statusText}>{statusConfig?.label ?? lead.status} ↻</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.date}>Diterima: {formatDate(lead.createdAt)}</Text>
      {Boolean(lead.note) && <Text style={styles.note}>&quot;{lead.note}&quot;</Text>}

      <TouchableOpacity onPress={() => Linking.openURL(waUrl)} style={styles.waBtn}>
        <Ionicons name="logo-whatsapp" size={16} color="#ffffff" />
        <Text style={styles.waBtnText}>Hubungi {lead.phone}</Text>
      </TouchableOpacity>
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
  },
  name: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  statusChip: {
    backgroundColor: colors.sage[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusText: {
    color: colors.sage[700],
    fontSize: 11,
    fontWeight: typography.weights.semibold,
  },
  date: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  note: {
    fontSize: typography.sizes.xs,
    color: colors.inkLight,
    fontStyle: 'italic',
    backgroundColor: colors.sand,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingVertical: 8,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  waBtnText: {
    color: '#ffffff',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
});
