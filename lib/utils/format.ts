/**
 * Format utilities - Belgian/EU conventions.
 */

const eurFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurWholeFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numFormatter = new Intl.NumberFormat("nl-BE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pctFormatter = new Intl.NumberFormat("nl-BE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatEur(value: number, whole = false): string {
  if (!Number.isFinite(value)) return "-";
  return whole ? eurWholeFormatter.format(value) : eurFormatter.format(value);
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return numFormatter.format(value);
}

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return pctFormatter.format(value);
}

export function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
