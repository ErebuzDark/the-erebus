import { Link } from 'react-router-dom'
import { img } from '../lib/cloudinary.js'
import { peso } from '../lib/format.js'
import { totalStock } from '../lib/useProducts.js'

export default function ProductCard({ p }) {
  const sold = totalStock(p) === 0
  return (
    <Link to={`/product/${p.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-surface">
        {p.images?.[0] && <img src={img(p.images[0], 700)} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
        {sold && <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs">Sold out</span>}
      </div>
      <div className="px-1 pt-3">
        <p className="text-[15px] font-medium">{p.name}</p>
        <p className="text-sm text-muted">
          {peso(p.basePrice)}
          {p.compareAtPrice > p.basePrice && <span className="ml-2 line-through">{peso(p.compareAtPrice)}</span>}
        </p>
      </div>
    </Link>
  )
}
