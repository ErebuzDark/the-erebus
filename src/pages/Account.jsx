import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { dateTime, peso } from '../lib/format.js'

export default function Account() {
  const { user, logout } = useAuth()
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    getDocs(query(collection(db, 'orders'), where('uid', '==', user.uid)))
      .then((s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))))
      .catch(() => setOrders([]))
  }, [user.uid])

  return (
    <div className="container-x max-w-3xl pt-14">
      <div className="flex items-end justify-between">
        <div><h1 className="text-4xl font-semibold tracking-tight">Your account.</h1><p className="mt-1 text-muted">{user.displayName || user.email}</p></div>
        <button onClick={logout} className="btn-ghost">Sign out</button>
      </div>
      <h2 className="mb-4 mt-12 text-xl font-semibold">Orders</h2>
      {orders === null ? <p className="text-muted">Loading…</p> : orders.length === 0 ? (
        <p className="text-muted">No orders yet. <Link to="/shop" className="text-accent">Start shopping</Link></p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} to={`/track?order=${o.orderNumber}&email=${encodeURIComponent(o.customer.email)}`} className="card flex items-center justify-between p-5">
              <div><p className="font-medium">{o.orderNumber}</p><p className="text-sm text-muted">{dateTime(o.createdAt)}</p></div>
              <div className="text-right"><p className="font-medium">{peso(o.total)}</p><p className="text-sm capitalize text-muted">{o.status}</p></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
