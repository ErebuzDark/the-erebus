import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { call } from '../lib/firebase.js'
import { peso } from '../lib/format.js'

const STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered']

export default function Track() {
  const [params] = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(params.get('order') || '')
  const [email, setEmail] = useState(params.get('email') || '')
  const [order, setOrder] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const lookup = async (e) => {
    e?.preventDefault()
    setErr(''); setOrder(null); setBusy(true)
    try {
      const snap = await getDoc(doc(db, 'orders', orderNumber.trim().toUpperCase()))
      const o = snap.data()
      if (!snap.exists() || o.customer.email !== email.trim().toLowerCase()) throw new Error('not found')
      setOrder({ orderNumber: o.orderNumber, status: o.status, trackingNumber: o.trackingNumber, total: o.total, items: o.items })
    } catch {
      setErr('We could not find an order with that number and email.')
    }
    setBusy(false)
  }

  useEffect(() => { if (params.get('order') && params.get('email')) lookup() }, []) // eslint-disable-line

  const stepIndex = order ? STEPS.indexOf(order.status) : -1

  return (
    <div className="container-x max-w-xl pt-16">
      <h1 className="text-4xl font-semibold tracking-tight">Track your order.</h1>
      <form onSubmit={lookup} className="mt-8 space-y-3">
        <div><label className="label">Order number</label><input required className="input" placeholder="ORD-1001" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} /></div>
        <div><label className="label">Email used at checkout</label><input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <button disabled={busy} className="btn-primary">{busy ? 'Looking…' : 'Find order'}</button>
      </form>
      {err && <p className="mt-6 text-sm text-red-600">{err}</p>}
      {order && (
        <div className="card mt-8 p-6">
          <p className="text-sm text-muted">Order {order.orderNumber}</p>
          {order.status === 'cancelled' ? <p className="mt-2 text-lg font-semibold">This order was cancelled.</p> : (
            <div className="mt-4 flex">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1 text-center">
                  <div className={`mx-auto h-2.5 w-2.5 rounded-full ${i <= stepIndex ? 'bg-accent' : 'bg-line'}`} />
                  <p className={`mt-2 text-xs capitalize ${i <= stepIndex ? 'text-ink' : 'text-muted'}`}>{s}</p>
                </div>
              ))}
            </div>
          )}
          {order.trackingNumber && <p className="mt-5 text-sm">Tracking number: <span className="font-medium">{order.trackingNumber}</span></p>}
          <div className="mt-5 space-y-1 border-t border-line pt-4 text-sm">
            {order.items.map((i, k) => <div key={k} className="flex justify-between"><span>{i.name} ({i.size}, {i.color}) × {i.qty}</span><span>{peso(i.price * i.qty)}</span></div>)}
            <div className="flex justify-between pt-2 font-semibold"><span>Total</span><span>{peso(order.total)}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
