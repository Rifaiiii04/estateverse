export type PriceRangeFilter = "all" | "under_300m" | "300m_to_700m" | "700m_to_1500m" | "over_1500m";

export interface PriceRangeOption {
  value: Exclude<PriceRangeFilter, "all">;
  label: string;
  description: string;
  min: number;
  max: number;
}

/** Price bands sized for first-home buyers and small sellers rather than luxury estates. */
export const PRICE_RANGES: PriceRangeOption[] = [
  { value: "under_300m", label: "< Rp 300 Juta", description: "Rumah pertama / terjangkau", min: 0, max: 300_000_000 },
  { value: "300m_to_700m", label: "Rp 300 – 700 Juta", description: "Rumah keluarga muda", min: 300_000_000, max: 700_000_000 },
  { value: "700m_to_1500m", label: "Rp 700 Juta – 1,5 Miliar", description: "Rumah menengah", min: 700_000_000, max: 1_500_000_000 },
  { value: "over_1500m", label: "> Rp 1,5 Miliar", description: "Rumah besar", min: 1_500_000_000, max: Number.POSITIVE_INFINITY },
];

// parsePriceRange converts a URL parameter into a known price band, defaulting to all prices.
export function parsePriceRange(raw: string | null): PriceRangeFilter {
  return PRICE_RANGES.find((r) => r.value === raw)?.value ?? "all";
}

// matchesPriceRange reports whether a price falls inside the selected band.
export function matchesPriceRange(price: number, range: PriceRangeFilter): boolean {
  if (range === "all") return true;
  const band = PRICE_RANGES.find((r) => r.value === range);
  return !band || (price >= band.min && price < band.max);
}
