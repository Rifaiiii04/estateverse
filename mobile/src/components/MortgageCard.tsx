import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { formatCompactIDR, formatIDR } from '@/lib/formatters';

interface MortgageCardProps {
  propertyPrice: number;
}

const DP_OPTIONS = [10, 20, 30];
const TENOR_OPTIONS = [10, 15, 20, 25];
const ANNUAL_RATE = 0.0575; // 5.75% fixed per year

// Calculates the estimated monthly mortgage installment.
function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const totalMonths = years * 12;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  return Math.round((principal * (monthlyRate * factor)) / (factor - 1));
}

// Renders an interactive mortgage and installment estimator card.
export function MortgageCard({ propertyPrice }: MortgageCardProps) {
  const [selectedDp, setSelectedDp] = useState(20);
  const [selectedTenor, setSelectedTenor] = useState(20);

  const downPaymentAmount = Math.round(propertyPrice * (selectedDp / 100));
  const loanPrincipal = propertyPrice - downPaymentAmount;
  const monthlyEstimate = calculateMonthlyPayment(loanPrincipal, ANNUAL_RATE, selectedTenor);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="calculator-outline" size={20} color={colors.sage[700]} />
        <Text style={styles.headerTitle}>Simulasi Cicilan KPR</Text>
      </View>

      <View style={styles.resultBox}>
        <Text style={styles.resultLabel}>Estimasi Cicilan per Bulan</Text>
        <Text style={styles.resultValue}>{formatIDR(monthlyEstimate)}</Text>
        <Text style={styles.resultNote}>Bunga estimasi 5.75% fix / tahun</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uang Muka (DP): {selectedDp}% ({formatCompactIDR(downPaymentAmount)})</Text>
        <View style={styles.optionRow}>
          {DP_OPTIONS.map((dp) => {
            const active = selectedDp === dp;
            return (
              <TouchableOpacity
                key={dp}
                onPress={() => setSelectedDp(dp)}
                style={[styles.optionBtn, active && styles.optionBtnActive]}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {dp}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jangka Waktu (Tenor): {selectedTenor} Tahun</Text>
        <View style={styles.optionRow}>
          {TENOR_OPTIONS.map((tenor) => {
            const active = selectedTenor === tenor;
            return (
              <TouchableOpacity
                key={tenor}
                onPress={() => setSelectedTenor(tenor)}
                style={[styles.optionBtn, active && styles.optionBtnActive]}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {tenor} Thn
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.disclaimer}>
        *Perhitungan ini merupakan simulasi estimasi awal. Besaran suku bunga dan persetujuan kredit final ditentukan oleh pihak bank penyedia KPR.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  resultBox: {
    backgroundColor: colors.sage[50],
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.sage[200],
  },
  resultLabel: {
    fontSize: typography.sizes.xs,
    color: colors.sage[700],
    marginBottom: 4,
  },
  resultValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.sage[700],
  },
  resultNote: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.inkLight,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.sand,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: colors.ink,
  },
  optionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.ink,
  },
  optionTextActive: {
    color: '#ffffff',
    fontWeight: typography.weights.bold,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
});
