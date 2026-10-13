import { useEffect, useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'
import { uploadImage, img } from '../../lib/cloudinary.js'
import { REGIONS } from '../../lib/constants.js'
import { useSettings } from '../../context/SettingsContext.jsx'

const BANNERS = [['hero', 'Home hero banner'], ['shirts', 'Shirts banner'], ['pants', 'Pants banner']]

export default function Settings() {
  const { settings, reload } = useSettings()
  const [s, setS] = useState(settings)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setS(settings)
  }, [settings])

  const banner = (k, field, v) => setS((p) => ({ ...p, banners: { ...p.banners, [k]: { ...p.banners[k], [field]: v } } }))
  const upload = async (k, file) => {
    if (!file) return
    setMsg('Uploading…')
    try { banner(k, 'image', await uploadImage(file, 'banners')); setMsg('') } catch (e) { setMsg(e.message) }
  }

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      await setDoc(doc(db, 'settings', 'store'), {
        storeName: s.storeName,
        freeShippingThreshold: Number(s.freeShippingThreshold) || 0,
        shippingRates: Object.fromEntries(Object.entries(s.shippingRates).map(([k, v]) => [k, Number(v) || 0])),
        paymongoEnabled: !!s.paymongoEnabled,
        banners: s.banners,
      })
      await reload(); setMsg('Saved.')
    } catch (x) { setMsg(x.message) }
    setBusy(false)
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <section className="space-y-3 rounded-3xl bg-white p-6">
        <h2 className="text-lg font-semibold">Store</h2>
        <div><label className="label">Store name</label><input className="input" value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.paymongoEnabled} onChange={(e) => setS({ ...s, paymongoEnabled: e.target.checked })} /> Offer GCash, Maya, and card payments (turn on only after PayMongo is set up)</label>
      </section>

      <section className="rounded-3xl bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Shipping rates (PHP)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {REGIONS.map((r) => (
            <div key={r.key}><label className="label">{r.label}</label>
              <input type="number" min="0" className="input" value={s.shippingRates[r.key]} onChange={(e) => setS({ ...s, shippingRates: { ...s.shippingRates, [r.key]: e.target.value } })} /></div>
          ))}
          <div><label className="label">Free shipping at subtotal of</label>
            <input type="number" min="0" className="input" value={s.freeShippingThreshold} onChange={(e) => setS({ ...s, freeShippingThreshold: e.target.value })} /></div>
        </div>
      </section>

      {BANNERS.map(([k, label]) => (
        <section key={k} className="space-y-3 rounded-3xl bg-white p-6">
          <h2 className="text-lg font-semibold">{label}</h2>
          {s.banners[k].image && <img src={img(s.banners[k].image, 700)} alt="" className="h-40 w-full rounded-2xl object-cover" />}
          <input type="file" accept="image/*" className="text-sm" onChange={(e) => upload(k, e.target.files[0])} />
          <input className="input" placeholder="Title" value={s.banners[k].title} onChange={(e) => banner(k, 'title', e.target.value)} />
          <input className="input" placeholder="Subtitle" value={s.banners[k].subtitle} onChange={(e) => banner(k, 'subtitle', e.target.value)} />
          {s.banners[k].image && <button type="button" className="text-sm text-red-600" onClick={() => banner(k, 'image', '')}>Remove image</button>}
        </section>
      ))}

      {msg && <p className="text-sm text-muted">{msg}</p>}
      <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save settings'}</button>
    </form>
  )
}
