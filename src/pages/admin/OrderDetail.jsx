import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db, call } from '../../lib/firebase.js'
import { ORDER_STATUSES, REGIONS } from '../../lib/constants.js'
import { dateTime, peso } from '../../lib/format.js'
import { img } from '../../lib/cloudinary.js'
import { statusColor } from './Orders.jsx'

export default function OrderDetail() {
  const { id } = useParams()
  const [o, setO] = useState(null)
  const [status, setStatus] = useState('')
  const [tracking, setTracking] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => getDoc(doc(db, 'orders', id)).then((s) => {
    const d = { id: s.id, ...s.data() }
    setO(d); setStatus(d.status); setTracking(d.trackingNumber || '')
  })
  useEffect(() => { load() }, [id])

  const update = async (payload, okMsg) => {
    setBusy(true); setMsg('')
    try {
      const warnings = await adminSetOrder(id, payload)
      await load()
      setMsg(warnings.length ? `Saved, but check: ${warnings.join(' ')}` : okMsg)
    } catch (e) { setMsg(e.message) }
    setBusy(false)
  }

  if (!o) return <p className="text-muted">Loading…</p>
  const region = REGIONS.find((r) => r.key === o.address.region)?.label

  return (
    <div className="max-w-4xl">
      <Link to="/admin/orders" className="text-sm text-accent">← All orders</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{o.orderNumber}</h1>
        <span className={`rounded-full px-3 py-1 text-xs capitalize ${statusColor[o.status]}`}>{o.status}</span>
        <button onClick={() => window.print()} className="btn-ghost ml-auto py-1.5!">Print packing slip</button>
      </div>
      <p className="text-sm text-muted">{dateTime(o.createdAt)}</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 text-sm">
          <h2 className="mb-2 text-lg font-semibold">Customer</h2>
          <p className="font-medium">{o.customer.name}</p>
          <p>{o.customer.email}</p><p>{o.customer.phone}</p>
          <p className="mt-1 text-muted">{o.uid ? 'Has an account' : 'Guest checkout'}</p>
          <h2 className="mb-2 mt-5 text-lg font-semibold">Ship to</h2>
          <p>{o.address.line1}, {o.address.barangay}</p>
          <p>{o.address.city}, {o.address.province} {o.address.zip}</p>
          <p className="text-muted">{region}</p>
          {o.notes && <p className="mt-3 rounded-xl bg-surface p-3">Note: {o.notes}</p>}
        </section>

        <section className="rounded-3xl bg-white p-6 text-sm print:hidden">
          <h2 className="mb-3 text-lg font-semibold">Manage</h2>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {ORDER_STATUSES.map((s) => <option key={s} className="capitalize">{s}</option>)}
          </select>
          <label className="label mt-3">Tracking number</label>
          <input className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Courier tracking number" />
          <button disabled={busy} className="btn-primary mt-4 w-full" onClick={() => {
            if (status === 'cancelled' && o.status !== 'cancelled' && !window.confirm('Cancel this order and return its items to stock?')) return
            update({ status, trackingNumber: tracking }, 'Order updated. The customer was emailed if the status changed.')
          }}>Save changes</button>
          <div className="mt-5 border-t border-line pt-4">
            <p>Payment: <span className="capitalize font-medium">{o.paymentMethod}</span> · <span className="capitalize">{o.paymentStatus}</span></p>
            {o.paymentStatus !== 'paid' && o.status !== 'cancelled' && (
              <button disabled={busy} className="btn-ghost mt-3 w-full" onClick={() => update({ paymentStatus: 'paid' }, 'Marked as paid.')}>Mark as paid</button>
            )}
          </div>
          {msg && <p className="mt-3 text-muted">{msg}</p>}
        </section>
      </div>

      <section className="mt-5 rounded-3xl bg-white p-6 text-sm">
        <h2 className="mb-3 text-lg font-semibold">Items</h2>
        {o.items.map((i, k) => (
          <div key={k} className="flex items-center gap-4 border-t border-line/50 py-3">
            <img src={img(i.image, 120)} alt="" className="h-14 w-12 rounded-lg bg-surface object-cover" />
            <div className="flex-1"><p className="font-medium">{i.name}</p><p className="text-muted">{i.size} · {i.color} · {i.sku}</p></div>
            <p>{i.qty} × {peso(i.price)}</p>
          </div>
        ))}
        <dl className="ml-auto mt-4 max-w-xs space-y-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{peso(o.subtotal)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between"><dt>Discount ({o.promoCode})</dt><dd>−{peso(o.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{peso(o.shipping)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{peso(o.total)}</dd></div>
        </dl>
      </section>
    </div>
  )
}
