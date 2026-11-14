/**
 * Debt service ratio (DSR) thresholds. 30% is a financial-planning guideline, not a KPR regulation
 * (OJK's 30% cap applies to online lending); banks set their own KPR limits, commonly around 35-40%.
 */
export const COMFORT_DSR = 0.3;
export const BANK_DSR_LIMIT = 0.4;

export interface MortgageInput {
  price: number;
  downPaymentPct: number; // 0..100
  annualRatePct: number; // e.g. 6.5
  years: number;
}

// monthlyInstallment computes the fixed monthly payment of an annuity loan.
export function monthlyInstallment({ price, downPaymentPct, annualRatePct, years }: MortgageInput): number {
  const principal = price * (1 - downPaymentPct / 100);
  const months = Math.max(1, Math.round(years * 12));
  const r = annualRatePct / 100 / 12;
  if (principal <= 0) return 0;
  if (r === 0) return Math.round(principal / months);
  const factor = Math.pow(1 + r, months);
  return Math.round((principal * r * factor) / (factor - 1));
}

export type AffordabilityLevel = "nyaman" | "batas-bank" | "berisiko";

// debtServiceRatio returns the share of monthly income consumed by the installment (0 when income is unknown).
export function debtServiceRatio(installment: number, monthlyIncome: number): number {
  return monthlyIncome > 0 ? installment / monthlyIncome : 0;
}

// assessAffordability classifies the DSR: comfortable (<=30%), near typical bank limits (<=40%), or risky.
export function assessAffordability(installment: number, monthlyIncome: number): { ratio: number; level: AffordabilityLevel } {
  const ratio = debtServiceRatio(installment, monthlyIncome);
  if (ratio <= COMFORT_DSR) return { ratio, level: "nyaman" };
  if (ratio <= BANK_DSR_LIMIT) return { ratio, level: "batas-bank" };
  return { ratio, level: "berisiko" };
}

// residualIncome is what remains each month after the installment and other routine spending (residual-income approach).
export function residualIncome(monthlyIncome: number, installment: number, otherExpenses: number): number {
  return monthlyIncome - installment - Math.max(0, otherExpenses);
}

// minimumIncomeFor returns the income at which the installment equals the comfortable 30% DSR guideline.
export function minimumIncomeFor(installment: number): number {
  return Math.round(installment / COMFORT_DSR);
}

const AMOUNT_PATTERN = /(\d+(?:[.,]\d+)*)\s*(miliar|milyar|juta|jt|ribu|rb)?/gi;
const MULTIPLIERS: Record<string, number> = { miliar: 1e9, milyar: 1e9, juta: 1e6, jt: 1e6, ribu: 1e3, rb: 1e3 };

// parseRupiahAmounts extracts money amounts like "350 juta", "1,2 miliar", or "Rp 450.000.000" from text.
export function parseRupiahAmounts(text: string): number[] {
  const out: number[] = [];
  for (const match of text.matchAll(AMOUNT_PATTERN)) {
    const unit = (match[2] || "").toLowerCase();
    const raw = match[1];
    const value = unit ? Number(raw.replace(/\./g, "").replace(",", ".")) * MULTIPLIERS[unit] : Number(raw.replace(/[.,]/g, ""));
    if (Number.isFinite(value) && value >= 1_000_000) out.push(value);
  }
  return out;
}
