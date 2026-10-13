import { Link } from 'react-router-dom'
import { useCart, lineKey } from '../context/CartContext.jsx'
import { img } from '../lib/cloudinary.js'
import { peso } from '../lib/format.js'

export default function Cart() {
  const { items, setQty, remove, subtotal } = useCart()
  if (!items.length) return (
    <div className="container-x pt-24 text-center">
      <h1 className="text-3xl font-semibold">Your bag is empty.</h1>
      <Link to="/shop" className="btn-primary mt-6">Continue shopping</Link>
    </div>
  )
  return (
    <div className="container-x max-w-3xl pt-12">
      <h1 className="text-4xl font-semibold tracking-tight">Review your bag.</h1>
      <div className="mt-8">
        {items.map((i) => (
          <div key={lineKey(i)} className="flex gap-5 border-t border-line/60 py-6">
            <img src={img(i.image, 240)} alt="" className="h-32 w-24 rounded-2xl bg-surface object-cover" />
            <div className="flex-1">
              <p className="font-medium">{i.name}</p>
              <p className="text-sm text-muted">{i.size} · {i.color}</p>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <button className="h-7 w-7 rounded-full border border-line" onClick={() => setQty(lineKey(i), i.qty - 1)}>−</button>
                <span>{i.qty}</span>
                <button className="h-7 w-7 rounded-full border border-line" onClick={() => setQty(lineKey(i), i.qty + 1)}>+</button>
                <button className="ml-3 text-accent" onClick={() => remove(lineKey(i))}>Remove</button>
              </div>
            </div>
            <p className="font-medium">{peso(i.price * i.qty)}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-line/60 pt-6 text-right">
        <p className="text-lg">Subtotal <span className="ml-4 font-semibold">{peso(subtotal)}</span></p>
        <p className="mt-1 text-sm text-muted">Shipping is calculated at checkout.</p>
        <Link to="/checkout" className="btn-primary mt-6 px-10! py-3!">Check out</Link>
      </div>
    </div>
  )
}
