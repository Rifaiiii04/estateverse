import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { FAQ_ITEMS, HOW_IT_WORKS_STEPS } from '@/lib/content';

// Renders the workflow steps explaining how to choose and purchase a property.
export function HowItWorksSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Cara Memilih Hunian</Text>
      <Text style={styles.subtitle}>Langkah mudah mendapatkan rumah idaman</Text>
      <View style={styles.stepsWrap}>
        {HOW_IT_WORKS_STEPS.map((step, idx) => (
          <View key={step.title} style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>{idx + 1}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Renders an expandable accordion for frequently asked real estate questions.
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Pertanyaan Populer</Text>
      <Text style={styles.subtitle}>Jawaban praktis seputar properti</Text>
      <View style={styles.faqList}>
        {FAQ_ITEMS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <TouchableOpacity
              key={faq.question}
              activeOpacity={0.8}
              onPress={() => setOpenIndex(isOpen ? null : index)}
              style={styles.faqCard}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.muted}
                />
              </View>
              {isOpen && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  stepsWrap: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.sage[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.sage[700],
  },
  stepText: {
    flex: 1,
    gap: 3,
  },
  stepTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  stepDesc: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    lineHeight: 18,
  },
  faqList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  faqCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.ink,
  },
  faqAnswer: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    lineHeight: 18,
    marginTop: 4,
  },
});
