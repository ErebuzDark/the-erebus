export function computeShipping(settings, region, subtotal) {
  if (!region) return 0
  if (subtotal >= settings.freeShippingThreshold) return 0
  return settings.shippingRates?.[region] ?? 0
}
