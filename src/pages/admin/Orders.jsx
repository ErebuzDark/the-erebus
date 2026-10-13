import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'
import { ORDER_STATUSES } from '../../lib/constants.js'
import { dateTime, peso } from '../../lib/format.js'

export const statusColor = {
  pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800', packed: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
}

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [status, setStatus] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(300)))
      .then((s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  const list = (orders || []).filter((o) => (status === 'all' || o.status === status) &&
    (o.orderNumber + o.customer.name + o.customer.email).toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
      <div className="mt-5 flex flex-wrap gap-2">
        {['all', ...ORDER_STATUSES].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-4 py-1.5 text-sm capitalize ${status === s ? 'bg-ink text-white' : 'bg-white'}`}>{s}</button>
        ))}
        <input className="input w-56! py-1.5! sm:ml-auto" placeholder="Search order, name, email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-4">Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>
            {orders === null && <tr><td className="p-4 text-muted">Loading…</td></tr>}
            {list.map((o) => (
              <tr key={o.id} className="border-t border-line/50 hover:bg-surface/60">
                <td className="p-4"><Link to={`/admin/orders/${o.id}`} className="font-medium text-accent">{o.orderNumber}</Link></td>
                <td>{o.customer.name}<br /><span className="text-muted">{o.address.city}</span></td>
                <td className="text-muted">{dateTime(o.createdAt)}</td>
                <td>{peso(o.total)}</td>
                <td className="capitalize">{o.paymentMethod} · <span className={o.paymentStatus === 'paid' ? 'text-green-700' : 'text-muted'}>{o.paymentStatus}</span></td>
                <td><span className={`rounded-full px-3 py-1 text-xs capitalize ${statusColor[o.status]}`}>{o.status}</span></td>
              </tr>
            ))}
            {orders && list.length === 0 && <tr><td colSpan={6} className="p-6 text-muted">No orders match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
