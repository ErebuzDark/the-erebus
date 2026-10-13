import { Link, NavLink, Outlet } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { CATEGORIES } from '../lib/constants.js'
import { peso, } from '../lib/format.js'
import { img } from '../lib/cloudinary.js'
import { lineKey } from '../context/CartContext.jsx'

function CartDrawer() {
  const { items, open, setOpen, subtotal, setQty, remove } = useCart()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-xl font-semibold">Bag</h2>
          <button onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="Close bag">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 && <p className="py-10 text-center text-muted">Your bag is empty.</p>}
          {items.map((i) => (
            <div key={lineKey(i)} className="flex gap-4 border-t border-line/60 py-4">
              <img src={img(i.image, 200)} alt="" className="h-24 w-20 rounded-xl bg-surface object-cover" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{i.name}</p>
                <p className="text-muted">{i.size} · {i.color}</p>
                <div className="mt-2 flex items-center gap-3">
                  <button className="h-7 w-7 rounded-full border border-line" onClick={() => setQty(lineKey(i), i.qty - 1)}>−</button>
                  <span>{i.qty}</span>
                  <button className="h-7 w-7 rounded-full border border-line" onClick={() => setQty(lineKey(i), i.qty + 1)}>+</button>
                  <button className="ml-auto text-muted hover:text-ink" onClick={() => remove(lineKey(i))}>Remove</button>
                </div>
              </div>
              <p className="text-sm font-medium">{peso(i.price * i.qty)}</p>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="border-t border-line/60 p-6">
            <div className="mb-4 flex justify-between text-[15px]"><span>Subtotal</span><span className="font-semibold">{peso(subtotal)}</span></div>
            <Link to="/checkout" onClick={() => setOpen(false)} className="btn-primary w-full">Check out</Link>
            <Link to="/cart" onClick={() => setOpen(false)} className="mt-2 block text-center text-sm text-accent">View bag</Link>
          </div>
        )}
      </aside>
    </div>
  )
}

export default function Layout() {
  const { count, setOpen } = useCart()
  const { user, isAdmin } = useAuth()
  const { settings } = useSettings()
  const link = ({ isActive }) => `text-[13px] transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-ink'}`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line/50 bg-white/80 backdrop-blur-xl">
        <div className="container-x flex h-12 items-center justify-between">
          <Link to="/" className="text-[17px] font-semibold tracking-tight">{settings.storeName}</Link>
          <nav className="hidden gap-7 md:flex">
            <NavLink to="/shop" end className={link}>All</NavLink>
            {CATEGORIES.slice(0, 4).map((c) => (
              <NavLink key={c} to={`/shop?category=${c}`} className={() => 'text-[13px] text-muted transition-colors hover:text-ink'}>{c}</NavLink>
            ))}
            <NavLink to="/track" className={link}>Track order</NavLink>
          </nav>
          <div className="flex items-center gap-5 text-[13px]">
            {isAdmin && <Link to="/admin" className="text-accent">Admin</Link>}
            <Link to={user ? '/account' : '/login'} className="text-muted hover:text-ink">{user ? 'Account' : 'Sign in'}</Link>
            <button onClick={() => setOpen(true)} className="relative text-muted hover:text-ink" aria-label="Open bag">
              Bag{count > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[11px] text-white">{count}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-24 bg-surface text-[12px] text-muted">
        <div className="container-x grid gap-8 py-10 sm:grid-cols-3">
          <div>
            <p className="mb-2 font-semibold text-ink">Shop</p>
            {CATEGORIES.slice(0, 4).map((c) => <Link key={c} className="block py-0.5 hover:text-ink" to={`/shop?category=${c}`}>{c}</Link>)}
          </div>
          <div>
            <p className="mb-2 font-semibold text-ink">Help</p>
            <Link className="block py-0.5 hover:text-ink" to="/track">Track your order</Link>
            <Link className="block py-0.5 hover:text-ink" to="/page/shipping">Shipping and payment</Link>
            <Link className="block py-0.5 hover:text-ink" to="/page/returns">Returns and exchanges</Link>
          </div>
          <div>
            <p className="mb-2 font-semibold text-ink">About</p>
            <Link className="block py-0.5 hover:text-ink" to="/page/privacy">Privacy policy</Link>
            <Link className="block py-0.5 hover:text-ink" to="/page/terms">Terms of sale</Link>
            <Link className="block py-0.5 hover:text-ink" to="/page/contact">Contact</Link>
          </div>
        </div>
        <div className="container-x border-t border-line/70 py-4">© {new Date().getFullYear()} {settings.storeName}. Shipping within the Philippines only.</div>
      </footer>
      <CartDrawer />
    </div>
  )
}
