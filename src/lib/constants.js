export const CATEGORIES = ['Shirts', 'Pants', 'Shorts', 'Hoodies', 'Jackets', 'Accessories']

export const REGIONS = [
  { key: 'metro', label: 'Metro Manila' },
  { key: 'luzon', label: 'Luzon (outside Metro Manila)' },
  { key: 'visayas', label: 'Visayas' },
  { key: 'mindanao', label: 'Mindanao' },
]

export const ORDER_STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']

export const DEFAULT_SETTINGS = {
  storeName: 'Your Brand',
  freeShippingThreshold: 2500,
  shippingRates: { metro: 100, luzon: 150, visayas: 180, mindanao: 200 },
  paymongoEnabled: false,
  banners: {
    hero: { image: '', title: 'New season. Simply made.', subtitle: 'Everyday essentials in clean cuts and soft fabrics.', cta: 'Shop now' },
    shirts: { image: '', title: 'Shirts', subtitle: 'Light, breathable, everyday.' },
    pants: { image: '', title: 'Pants', subtitle: 'Fit that moves with you.' },
  },
}
