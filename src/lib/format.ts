const priceFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

const priceWithCentsFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Full-precision variant (thousands separator + 2 decimals) used for the live
// preview under the price input, where the exact amount being entered matters.
export function formatPriceWithCents(amount: number): string {
  return priceWithCentsFormatter.format(amount);
}
