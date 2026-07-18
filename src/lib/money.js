const MINOR_UNIT_MULTIPLIER = 100;

export function toMinorUnits(value) {
  if (value === null || value === undefined || value === "") {
    return BigInt(0);
  }

  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value));

  if (Number.isNaN(numeric)) {
    return BigInt(0);
  }

  return BigInt(Math.round(numeric * MINOR_UNIT_MULTIPLIER));
}

export function fromMinorUnits(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value) / MINOR_UNIT_MULTIPLIER;
}

export function sumMinor(values) {
  return values.reduce((sum, value) => sum + BigInt(value || 0), BigInt(0));
}

export function minorToCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fromMinorUnits(value));
}
