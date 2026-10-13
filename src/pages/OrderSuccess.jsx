import { Link, useLocation, useParams } from 'react-router-dom'
import { peso } from '../lib/format.js'

export default function OrderSuccess() {
  const { orderNumber } = useParams()
  const { state } = useLocation()
  return (
    <div className="container-x max-w-xl pt-24 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white">✓</div>
      <h1 className="text-4xl font-semibold tracking-tight">Thank you. Your order is in.</h1>
      <p className="mt-4 text-muted">Order number</p>
      <p className="text-2xl font-semibold">{orderNumber}</p>
      {state?.total != null && <p className="mt-4">Total to pay on delivery: <span className="font-semibold">{peso(state.total)}</span></p>}
      <p className="mt-6 text-muted">
        We sent a confirmation to {state?.email || 'your email'}. We will message you to confirm the order before we ship it.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to={`/track?order=${orderNumber}${state?.email ? `&email=${encodeURIComponent(state.email)}` : ''}`} className="btn-ghost">Track order</Link>
        <Link to="/shop" className="btn-primary">Continue shopping</Link>
      </div>
    </div>
  )
}
