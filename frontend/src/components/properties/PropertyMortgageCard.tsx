"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";
import { formatIDR, formatRupiahInput, parseRupiahInput } from "@/lib/utils/formatters";
import { assessAffordability, AffordabilityLevel, MAX_ANNUAL_RATE_PCT, minimumIncomeFor, monthlyInstallment, parseAnnualRate, residualIncome } from "@/lib/utils/mortgage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PropertyMortgageCardProps {
  price: number;
}

const DP_OPTIONS = [10, 20, 30];
const TENOR_OPTIONS = [10, 15, 20, 25];
const LEVEL_STYLE: Record<AffordabilityLevel, { label: string; className: string }> = {
  nyaman: { label: "nyaman (≤30% gaji, patokan perencanaan keuangan)", className: "bg-sage-50 text-sage-800 border-sage-200" },
  "batas-bank": { label: "mendekati batas bank (umumnya 35–40%)", className: "bg-amber-50 text-amber-800 border-amber-200" },
  berisiko: { label: "di atas batas umum bank — berisiko ditolak", className: "bg-rose-50 text-rose-800 border-rose-200" },
};

// PropertyMortgageCard estimates the monthly KPR installment and checks it against the buyer's income.
export function PropertyMortgageCard({ price }: PropertyMortgageCardProps) {
  const [dp, setDp] = useState(10);
  const [years, setYears] = useState(15);
  const [rate, setRate] = useState("7");
  const [incomeRaw, setIncomeRaw] = useState("");
  const [expensesRaw, setExpensesRaw] = useState("");

  const annualRate = parseAnnualRate(rate);
  const rateError = annualRate === null ? `Isi bunga lebih dari 0% dan maksimal ${MAX_ANNUAL_RATE_PCT}%, contoh 7 atau 6,5.` : "";
  const installment = annualRate === null ? 0 : monthlyInstallment({ price, downPaymentPct: dp, annualRatePct: annualRate, years });
  const income = parseRupiahInput(incomeRaw);
  const check = income > 0 && annualRate !== null ? assessAffordability(installment, income) : null;
  const leftover = residualIncome(income, installment, parseRupiahInput(expensesRaw));

  return (
    <section aria-labelledby="mortgage-title" className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-sage-600" aria-hidden="true" />
        <h4 id="mortgage-title" className="text-sm font-bold text-neutral-950">Cek Kemampuan Bayar KPR</h4>
      </div>

      <ChoiceGroup label="Uang muka (DP)" options={DP_OPTIONS} value={dp} suffix="%" onChange={setDp} />
      <ChoiceGroup label="Tenor" options={TENOR_OPTIONS} value={years} suffix=" thn" onChange={setYears} />

      <div className="grid grid-cols-2 gap-3">
        <Input id="mortgage-rate" label="Bunga per tahun (%)" inputMode="decimal" value={rate} error={rateError} onChange={(e) => setRate(e.target.value)} />
        <Input id="mortgage-income" label="Gaji bulanan (opsional)" inputMode="numeric" value={incomeRaw} placeholder="Rp 6.000.000" onChange={(e) => setIncomeRaw(formatRupiahInput(e.target.value))} />
      </div>
      {income > 0 && (
        <Input
          id="mortgage-expenses"
          label="Pengeluaran rutin lain per bulan (makan, transport, cicilan lain)"
          inputMode="numeric"
          value={expensesRaw}
          placeholder="Rp 3.000.000"
          onChange={(e) => setExpensesRaw(formatRupiahInput(e.target.value))}
        />
      )}

      {annualRate !== null && (
      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1" aria-live="polite">
        <span className="text-xs text-neutral-700 block">Estimasi cicilan bulanan</span>
        <div className="text-xl font-extrabold text-sage-700">
          {formatIDR(installment)}
          <span className="text-xs font-normal text-neutral-600"> / bulan</span>
        </div>
        <span className="text-[11px] text-neutral-600 block">
          Agar nyaman, gaji sekitar {formatIDR(minimumIncomeFor(installment))} (cicilan ≤30% gaji).
        </span>
        {check && (
          <span className={`inline-block mt-2 text-xs font-semibold border rounded-lg px-2 py-1 ${LEVEL_STYLE[check.level].className}`}>
            Rasio cicilan (DSR) {Math.round(check.ratio * 100)}% — {LEVEL_STYLE[check.level].label}
          </span>
        )}
        {check && (
          <p className={`text-xs font-semibold pt-1 ${leftover < 0 ? "text-rose-700" : "text-neutral-800"}`}>
            Sisa uang per bulan setelah cicilan{expensesRaw ? " & pengeluaran rutin" : ""}: {leftover < 0 ? "−" : ""}{formatIDR(Math.abs(leftover))}
          </p>
        )}
      </div>
      )}
      <p className="text-[11px] text-neutral-600">
        Perkiraan saja. Batas DSR, bunga, dan syarat sebenarnya ditentukan masing-masing bank. Pastikan sisa uang cukup untuk kebutuhan pokok — rasio saja tidak cukup. Siapkan juga biaya pajak dan notaris sekitar 5–10% dari harga.
      </p>
    </section>
  );
}

// ChoiceGroup renders a labelled row of toggle buttons for one numeric option.
function ChoiceGroup({ label, options, value, suffix, onChange }: {
  label: string;
  options: number[];
  value: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-neutral-700">{label}</legend>
      <div className="flex gap-2">
        {options.map((opt) => (
          <Button
            key={opt}
            variant={value === opt ? "default" : "outline"}
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
            className="flex-1"
          >
            {opt}
            {suffix}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
