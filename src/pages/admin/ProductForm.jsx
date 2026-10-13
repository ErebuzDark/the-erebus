import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'
import { uploadImage, img } from '../../lib/cloudinary.js'
import { CATEGORIES } from '../../lib/constants.js'
import { slugify } from '../../lib/format.js'
import { resetProductsCache } from '../../lib/useProducts.js'

const empty = {
  name: '', slug: '', category: CATEGORIES[0], description: '', basePrice: '', compareAtPrice: '',
  status: 'draft', featured: false, images: [], variants: [],
}

export default function ProductForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const editing = !!id
  const [f, setF] = useState(empty)
  const [sizes, setSizes] = useState('S, M, L, XL')
  const [colors, setColors] = useState('Black, White')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!editing) return
    getDoc(doc(db, 'products', id)).then((s) => s.exists() && setF({ ...empty, ...s.data(), id: s.id }))
  }, [id, editing])

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const onFiles = async (e) => {
    setErr(''); setUploading(true)
    try {
      const urls = await Promise.all([...e.target.files].map((file) => uploadImage(file)))
      set('images', [...f.images, ...urls])
    } catch (x) { setErr(x.message) }
    setUploading(false); e.target.value = ''
  }
  const moveImg = (i, dir) => {
    const a = [...f.images]; const j = i + dir
    if (j < 0 || j >= a.length) return
    ;[a[i], a[j]] = [a[j], a[i]]; set('images', a)
  }

  const generate = () => {
    const S = sizes.split(',').map((s) => s.trim()).filter(Boolean)
    const C = colors.split(',').map((s) => s.trim()).filter(Boolean)
    const slug = f.slug || slugify(f.name) || 'item'
    const next = []
    C.forEach((c) => S.forEach((s) => {
      const old = f.variants.find((v) => v.size === s && v.color === c)
      next.push(old || { sku: `${slug}-${slugify(c)}-${slugify(s)}`.toUpperCase(), size: s, color: c, stock: 0, price: '' })
    }))
    set('variants', next)
  }
  const setVariant = (i, k, v) => set('variants', f.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)))

  const save = async (e) => {
    e.preventDefault(); setErr('')
    const slug = (editing ? id : f.slug || slugify(f.name))
    if (!slug) return setErr('Add a product name.')
    if (!f.variants.length) return setErr('Generate at least one size and color variant.')
    if (new Set(f.variants.map((v) => v.sku)).size !== f.variants.length) return setErr('Each variant needs a unique SKU.')
    setBusy(true)
    try {
      if (!editing && (await getDoc(doc(db, 'products', slug))).exists()) {
        setBusy(false); return setErr('A product with this name already exists. Change the name or slug.')
      }
      const data = {
        name: f.name.trim(), slug, category: f.category, description: f.description,
        basePrice: Number(f.basePrice), compareAtPrice: Number(f.compareAtPrice) || 0,
        status: f.status, featured: !!f.featured, images: f.images,
        variants: f.variants.map((v) => ({ sku: v.sku, size: v.size, color: v.color, stock: Number(v.stock) || 0, price: Number(v.price) || 0 })),
        updatedAt: serverTimestamp(),
      }
      if (!editing) data.createdAt = serverTimestamp()
      await setDoc(doc(db, 'products', slug), data, { merge: true })
      resetProductsCache()
      nav('/admin/products')
    } catch (x) { setErr(x.message); setBusy(false) }
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{editing ? 'Edit product' : 'Add product'}</h1>

      <section className="space-y-3 rounded-3xl bg-white p-6">
        <div><label className="label">Name</label><input required className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        {!editing && <div><label className="label">URL slug (auto from name if empty)</label><input className="input" value={f.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder={slugify(f.name)} /></div>}
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">Category</label>
            <select className="input" value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Price (PHP)</label><input required type="number" min="0" className="input" value={f.basePrice} onChange={(e) => set('basePrice', e.target.value)} /></div>
          <div><label className="label">Compare-at price</label><input type="number" min="0" className="input" value={f.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} /></div>
        </div>
        <div><label className="label">Description</label><textarea rows={4} className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.status === 'published'} onChange={(e) => set('status', e.target.checked ? 'published' : 'draft')} /> Published</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.featured} onChange={(e) => set('featured', e.target.checked)} /> Show on home page</label>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Images</h2>
        <div className="flex flex-wrap gap-3">
          {f.images.map((u, i) => (
            <div key={u} className="w-24">
              <img src={img(u, 240)} alt="" className="h-28 w-24 rounded-xl bg-surface object-cover" />
              <div className="mt-1 flex justify-between text-xs text-muted">
                <button type="button" onClick={() => moveImg(i, -1)}>←</button>
                <button type="button" className="text-red-600" onClick={() => set('images', f.images.filter((x) => x !== u))}>Remove</button>
                <button type="button" onClick={() => moveImg(i, 1)}>→</button>
              </div>
            </div>
          ))}
          <label className="flex h-28 w-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line text-center text-xs text-muted hover:bg-surface">
            {uploading ? 'Uploading…' : '+ Add images'}
            <input type="file" accept="image/*" multiple hidden onChange={onFiles} />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">The first image is the cover.</p>
      </section>

      <section className="rounded-3xl bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Sizes, colors, and stock</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input className="input" value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="Sizes: S, M, L" />
          <input className="input" value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Colors: Black, White" />
          <button type="button" onClick={generate} className="btn-ghost">Generate</button>
        </div>
        {f.variants.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted"><tr><th>Color</th><th>Size</th><th>SKU</th><th>Stock</th><th>Price override</th><th /></tr></thead>
              <tbody>
                {f.variants.map((v, i) => (
                  <tr key={v.sku + i} className="border-t border-line/50">
                    <td className="py-2">{v.color}</td><td>{v.size}</td>
                    <td><input className="input w-44! py-1.5!" value={v.sku} onChange={(e) => setVariant(i, 'sku', e.target.value)} /></td>
                    <td><input type="number" min="0" className="input w-20! py-1.5!" value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} /></td>
                    <td><input type="number" min="0" className="input w-28! py-1.5!" placeholder="Optional" value={v.price || ''} onChange={(e) => setVariant(i, 'price', e.target.value)} /></td>
                    <td><button type="button" className="text-red-600" onClick={() => set('variants', f.variants.filter((_, j) => j !== i))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="flex gap-3">
        <button disabled={busy || uploading} className="btn-primary">{busy ? 'Saving…' : 'Save product'}</button>
        <button type="button" className="btn-ghost" onClick={() => nav('/admin/products')}>Cancel</button>
      </div>
    </form>
  )
}
