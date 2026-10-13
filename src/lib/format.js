export const peso = (n) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n || 0)

export const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export const dateTime = (ts) => {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null
  return d ? d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : ''
}
