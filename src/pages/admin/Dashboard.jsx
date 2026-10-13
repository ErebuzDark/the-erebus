import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'
import { dateTime, peso } from '../../lib/format.js'

export default function Dashboard() {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(200)))
      .then((s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
    getDocs(collection(db, 'products')).then((s) => setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  const today = new Date().toDateString()
  const live = orders.filter((o) => o.status !== 'cancelled')
  const todays = orders.filter((o) => o.createdAt?.toDate().toDateString() === today)
  const pending = orders.filter((o) => o.status === 'pending')
  const revenue = live.reduce((s, o) => s + o.total, 0)
  const low = products.flatMap((p) => (p.variants || []).filter((v) => v.stock <= 3).map((v) => ({ p, v })))

  const stat = (label, value) => (
    <div className="rounded-3xl bg-white p-6"><p className="text-sm text-muted">{label}</p><p className="mt-1 text-3xl font-semibold">{value}</p></div>
  )

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat('Orders today', todays.length)}
        {stat('Needs confirmation', pending.length)}
        {stat('Revenue (last 200 orders)', peso(revenue))}
        {stat('Low stock variants', low.length)}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Latest orders</h2>
          {orders.slice(0, 6).map((o) => (
            <Link key={o.id} to={`/admin/orders/${o.id}`} className="flex justify-between border-t border-line/50 py-3 text-sm">
              <span><span className="font-medium">{o.orderNumber}</span> <span className="text-muted">{o.customer.name} · {dateTime(o.createdAt)}</span></span>
              <span className="capitalize">{o.status}</span>
            </Link>
          ))}
          {orders.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
        </section>
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Low stock</h2>
          {low.slice(0, 8).map(({ p, v }) => (
            <Link key={v.sku} to={`/admin/products/${p.id}`} className="flex justify-between border-t border-line/50 py-3 text-sm">
              <span>{p.name} <span className="text-muted">{v.size} · {v.color}</span></span>
              <span className={v.stock === 0 ? 'text-red-600' : 'text-orange-600'}>{v.stock} left</span>
            </Link>
          ))}
          {low.length === 0 && <p className="text-sm text-muted">Stock levels look fine.</p>}
        </section>
      </div>
    </div>
  )
}
