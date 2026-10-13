import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { img } from '../lib/cloudinary.js'
import { peso } from '../lib/format.js'
import { useCart } from '../context/CartContext.jsx'

export default function Product() {
  const { slug } = useParams()
  const { add } = useCart()
  const [p, setP] = useState(null)
  const [state, setState] = useState('loading')
  const [active, setActive] = useState(0)
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState('')

  useEffect(() => {
    setState('loading')
    getDoc(doc(db, 'products', slug)).then((s) => {
      if (!s.exists()) return setState('missing')
      const d = { id: s.id, ...s.data() }
      setP(d)
      setColor(d.variants?.find((v) => v.stock > 0)?.color || d.variants?.[0]?.color || '')
      setState('ready')
    }).catch(() => setState('missing'))
  }, [slug])

  const colors = useMemo(() => [...new Set((p?.variants || []).map((v) => v.color))], [p])
  const sizes = useMemo(() => (p?.variants || []).filter((v) => v.color === color), [p, color])
  const variant = (p?.variants || []).find((v) => v.color === color && v.size === size)

  if (state === 'loading') return <p className="container-x pt-20 text-muted">Loading…</p>
  if (state === 'missing') return <div className="container-x pt-20"><p>We couldn't find that product.</p><Link to="/shop" className="text-accent">Back to shop</Link></div>

  const price = variant?.price || p.basePrice
  const addToBag = () => {
    if (!variant) return setErr('Select a size first.')
    if (variant.stock < 1) return setErr('That size is sold out.')
    setErr('')
    add({
      productId: p.id, sku: variant.sku, name: p.name, image: p.images?.[0] || '',
      size: variant.size, color: variant.color, price, qty, maxQty: variant.stock,
    })
  }

  return (
    <div className="container-x grid gap-10 pt-10 md:grid-cols-[1.2fr_1fr]">
      <div>
        <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-surface">
          {p.images?.[active] && <img src={img(p.images[active], 1200)} alt={p.name} className="h-full w-full object-cover" />}
        </div>
        {p.images?.length > 1 && (
          <div className="mt-3 flex gap-2">
            {p.images.map((u, i) => (
              <button key={u} onClick={() => setActive(i)} className={`h-20 w-16 overflow-hidden rounded-xl bg-surface ring-2 ${i === active ? 'ring-accent' : 'ring-transparent'}`}>
                <img src={img(u, 200)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="md:sticky md:top-20 md:self-start">
        <p className="text-sm text-muted">{p.category}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{p.name}</h1>
        <p className="mt-2 text-xl">
          {peso(price)}
          {p.compareAtPrice > price && <span className="ml-2 text-base text-muted line-through">{peso(p.compareAtPrice)}</span>}
        </p>

        {colors.length > 0 && (
          <div className="mt-8">
            <p className="mb-2 text-sm">Color: <span className="text-muted">{color}</span></p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button key={c} onClick={() => { setColor(c); setSize('') }}
                  className={`rounded-full border px-4 py-1.5 text-sm ${c === color ? 'border-accent ring-1 ring-accent' : 'border-line'}`}>{c}</button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="mb-2 text-sm">Size</p>
          <div className="grid grid-cols-4 gap-2">
            {sizes.map((v) => (
              <button key={v.sku} disabled={v.stock < 1} onClick={() => { setSize(v.size); setErr(''); setQty(1) }}
                className={`rounded-xl border py-3 text-sm disabled:cursor-not-allowed disabled:text-line disabled:line-through ${v.size === size ? 'border-accent ring-1 ring-accent' : 'border-line'}`}>{v.size}</button>
            ))}
          </div>
          {variant && variant.stock <= 5 && variant.stock > 0 && <p className="mt-2 text-sm text-orange-600">Only {variant.stock} left.</p>}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <p className="text-sm">Quantity</p>
          <div className="flex items-center gap-3">
            <button className="h-8 w-8 rounded-full border border-line" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span className="w-6 text-center">{qty}</span>
            <button className="h-8 w-8 rounded-full border border-line" onClick={() => setQty(Math.min(variant?.stock || 99, qty + 1))}>+</button>
          </div>
        </div>

        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
        <button onClick={addToBag} className="btn-primary mt-6 w-full py-3.5! text-base">Add to bag</button>
        <p className="mt-3 text-center text-sm text-muted">Cash on delivery available nationwide.</p>

        {p.description && <p className="mt-8 whitespace-pre-line leading-relaxed text-[15px]">{p.description}</p>}
      </div>
    </div>
  )
}
