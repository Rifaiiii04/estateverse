import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { BENEFIT_TEMPLATES } from '@/lib/content';

interface BenefitsSelectorProps {
  selectedBenefits: string[];
  onChange: (benefits: string[]) => void;
}

// Renders an interactive chip selector for property advantages and custom tags.
export function BenefitsSelector({ selectedBenefits, onChange }: BenefitsSelectorProps) {
  const [customText, setCustomText] = useState('');

  // Toggles inclusion of a benefit chip.
  const handleToggle = (benefit: string) => {
    if (selectedBenefits.includes(benefit)) {
      onChange(selectedBenefits.filter((item) => item !== benefit));
    } else {
      onChange([...selectedBenefits, benefit]);
    }
  };

  // Adds a user-typed custom benefit chip.
  const handleAddCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    if (!selectedBenefits.includes(trimmed)) {
      onChange([...selectedBenefits, trimmed]);
    }
    setCustomText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Keunggulan & Fasilitas Properti</Text>

      <View style={styles.inputRow}>
        <TextInput
          value={customText}
          onChangeText={setCustomText}
          placeholder="Tambah fasilitas lain (misal: Ruang Kerja)..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          onSubmitEditing={handleAddCustom}
        />
        <TouchableOpacity
          onPress={handleAddCustom}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Tambah Fasilitas"
        >
          <Ionicons name="add" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.chipsContainer}>
        {BENEFIT_TEMPLATES.map((item) => {
          const isSelected = selectedBenefits.includes(item);
          return (
            <TouchableOpacity
              key={item}
              onPress={() => handleToggle(item)}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Ionicons
                name={isSelected ? 'checkmark' : 'add'}
                size={14}
                color={isSelected ? '#ffffff' : colors.inkLight}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.inkLight,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.sand,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.sizes.sm,
    color: colors.ink,
  },
  addBtn: {
    backgroundColor: colors.sage[600],
    borderRadius: radius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.sage[700],
    backgroundColor: colors.sage[600],
  },
  chipText: {
    fontSize: typography.sizes.xs,
    color: colors.inkLight,
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: typography.weights.medium,
  },
});
