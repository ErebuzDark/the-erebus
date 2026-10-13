import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
// import { call } from '../lib/firebase.js'
import { createOrder } from '../lib/orders.js'
import { REGIONS } from '../lib/constants.js'
import { computeShipping } from '../lib/shipping.js'
import { img } from '../lib/cloudinary.js'
import { peso } from '../lib/format.js'

export default function Checkout() {
  const { items, subtotal, clear } = useCart()
  const { user } = useAuth()
  const { settings } = useSettings()
  const nav = useNavigate()

  const [f, setF] = useState({
    name: user?.displayName || '', email: user?.email || '', phone: '',
    line1: '', barangay: '', city: '', province: '', zip: '', region: 'metro', notes: '', promo: '',
  })
  const [payment, setPayment] = useState('cod')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const shipping = computeShipping(settings, f.region, subtotal)
  const total = subtotal + shipping

  if (!items.length) return (
    <div className="container-x pt-24 text-center">
      <h1 className="text-3xl font-semibold">Nothing to check out yet.</h1>
      <Link to="/shop" className="btn-primary mt-6">Browse products</Link>
    </div>
  )

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!/^(09|\+639)\d{9}$/.test(f.phone.replace(/\s|-/g, ''))) return setErr('Enter a valid Philippine mobile number, like 09171234567.')
    setBusy(true)
    try {
      const res = await createOrder({
        cart: items,
        customer: { name: f.name.trim(), email: f.email.trim().toLowerCase(), phone: f.phone.trim() },
        address: { line1: f.line1, barangay: f.barangay, city: f.city, province: f.province, zip: f.zip, region: f.region },
        notes: f.notes, uid: user?.uid || null, settings,
      })
      clear()
      nav(`/order-success/${res.orderNumber}`, { state: { email: f.email, total: res.total, payment: 'cod' } })
    } catch (e2) {
      setErr(e2.message || 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="container-x grid gap-12 pt-12 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Check out.</h1>
        {!user && <p className="mt-2 text-sm text-muted">Checking out as a guest. <Link to="/login" className="text-accent">Sign in</Link> to save your orders.</p>}

        <h2 className="mb-3 mt-10 text-xl font-semibold">Contact</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Full name</label><input required className="input" value={f.name} onChange={set('name')} /></div>
          <div><label className="label">Email</label><input required type="email" className="input" value={f.email} onChange={set('email')} /></div>
          <div><label className="label">Mobile number</label><input required className="input" placeholder="09171234567" value={f.phone} onChange={set('phone')} /></div>
        </div>

        <h2 className="mb-3 mt-10 text-xl font-semibold">Delivery address</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Street, building, house no.</label><input required className="input" value={f.line1} onChange={set('line1')} /></div>
          <div><label className="label">Barangay</label><input required className="input" value={f.barangay} onChange={set('barangay')} /></div>
          <div><label className="label">City / Municipality</label><input required className="input" value={f.city} onChange={set('city')} /></div>
          <div><label className="label">Province</label><input required className="input" value={f.province} onChange={set('province')} /></div>
          <div><label className="label">ZIP code</label><input required className="input" value={f.zip} onChange={set('zip')} /></div>
          <div className="sm:col-span-2">
            <label className="label">Shipping region</label>
            <select className="input" value={f.region} onChange={set('region')}>
              {REGIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className="label">Order notes (optional)</label><textarea rows={2} className="input" value={f.notes} onChange={set('notes')} /></div>
        </div>

        <h2 className="mb-3 mt-10 text-xl font-semibold">Payment</h2>
        <div className="space-y-2">
          <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${payment === 'cod' ? 'border-accent ring-1 ring-accent' : 'border-line'}`}>
            <input type="radio" checked={payment === 'cod'} onChange={() => setPayment('cod')} className="mt-1" />
            <span><span className="font-medium">Cash on delivery</span><br /><span className="text-sm text-muted">Pay the courier when your order arrives. We may text you to confirm.</span></span>
          </label>
          <label className={`flex items-start gap-3 rounded-2xl border p-4 ${settings.paymongoEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${payment === 'paymongo' ? 'border-accent ring-1 ring-accent' : 'border-line'}`}>
            <input type="radio" disabled={!settings.paymongoEnabled} checked={payment === 'paymongo'} onChange={() => setPayment('paymongo')} className="mt-1" />
            <span><span className="font-medium">GCash, Maya, or card</span><br /><span className="text-sm text-muted">{settings.paymongoEnabled ? 'Pay securely online.' : 'Coming soon.'}</span></span>
          </label>
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="card p-6">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <div className="mt-4 space-y-4">
            {items.map((i) => (
              <div key={`${i.productId}${i.sku}`} className="flex gap-3 text-sm">
                <img src={img(i.image, 160)} alt="" className="h-16 w-14 rounded-lg bg-white object-cover" />
                <div className="flex-1"><p className="font-medium">{i.name}</p><p className="text-muted">{i.size} · {i.color} · Qty {i.qty}</p></div>
                <p>{peso(i.price * i.qty)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <input className="input py-2!" placeholder="Promo code" value={f.promo} onChange={set('promo')} />
          </div>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[15px]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{peso(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>{shipping === 0 ? 'Free' : peso(shipping)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd>{peso(total)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-muted">Promo discounts are applied when you place the order. Free shipping over {peso(settings.freeShippingThreshold)}.</p>
          {err && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <button disabled={busy} className="btn-primary mt-5 w-full py-3.5! text-base">{busy ? 'Placing order…' : 'Place order'}</button>
        </div>
      </aside>
    </form>
  )
}
