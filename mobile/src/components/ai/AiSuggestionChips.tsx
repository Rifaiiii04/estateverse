import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { AI_SUGGESTIONS } from '@/lib/ai/consultantAdvisor';

interface AiSuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

// Renders quick suggestion chips for common real-estate inquiries.
export function AiSuggestionChips({ onSelect }: AiSuggestionChipsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pertanyaan yang Sering Diajukan:</Text>
      {AI_SUGGESTIONS.map((suggestion) => (
        <TouchableOpacity
          key={suggestion}
          onPress={() => onSelect(suggestion)}
          style={styles.chip}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.sage[700]} />
          <Text style={styles.text}>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  header: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.inkLight,
    marginBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.sand,
    borderRadius: radius.sm,
  },
  text: {
    fontSize: typography.sizes.xs,
    color: colors.ink,
    flex: 1,
  },
});
