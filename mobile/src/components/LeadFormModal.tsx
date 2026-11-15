import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { createLead } from '@/lib/api/leads';
import { normalizeWhatsAppNumber } from '@/lib/formatters';

interface LeadFormModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: number;
  propertyTitle: string;
}

// Displays a modal form allowing prospective buyers to schedule a property visit.
export function LeadFormModal({
  visible,
  onClose,
  propertyId,
  propertyTitle,
}: LeadFormModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Submits the visit request and sends it to the shared backend seller inbox.
  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const cleanPhone = normalizeWhatsAppNumber(phone);

    if (!trimmedName) {
      Alert.alert('Nama Diperlukan', 'Silakan masukkan nama lengkap Anda.');
      return;
    }
    if (cleanPhone.length < 9) {
      Alert.alert('Nomor WhatsApp Tidak Valid', 'Silakan masukkan nomor telepon atau WhatsApp aktif.');
      return;
    }

    try {
      setSubmitting(true);
      await createLead({
        propertyId,
        name: trimmedName,
        phone: cleanPhone,
        note: note.trim(),
      });
      Alert.alert(
        'Kunjungan Dijadwalkan',
        'Permintaan jadwal survei Anda telah dicatat. Pemilik properti akan segera menghubungi Anda.',
      );
      setName('');
      setPhone('');
      setNote('');
      onClose();
    } catch {
      Alert.alert('Gagal Mengirim', 'Terjadi kendala saat menyimpan permintaan kunjungan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>Jadwalkan Kunjungan Survei</Text>
              <Text numberOfLines={1} style={styles.subtitle}>{propertyTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Contoh: Budi Santoso"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Nomor WhatsApp Aktif</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Contoh: 08123456789"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Catatan Tambahan (Opsional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Rencana hari survei atau hal yang ingin ditanyakan..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textarea]}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={submitting}
              onPress={handleSubmit}
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            >
              <Ionicons name="calendar-outline" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>
                {submitting ? 'Menyimpan...' : 'Kirim Permintaan Jadwal'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.inkLight,
  },
  input: {
    backgroundColor: colors.sand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.sizes.sm,
    color: colors.ink,
  },
  textarea: {
    height: 72,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: colors.sage[600],
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#ffffff',
  },
});
