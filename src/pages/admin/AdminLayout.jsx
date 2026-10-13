import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

function AdminLogin() {
  const { login } = useAuth()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    try { await login(f.email, f.password) } catch { setErr('Check your email and password.') }
  }
  return (
    <div className="mx-auto max-w-sm px-5 pt-28">
      <h1 className="text-center text-3xl font-semibold tracking-tight">Admin sign in</h1>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <input required type="email" className="input" placeholder="Email" onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input required type="password" className="input" placeholder="Password" onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full">Sign in</button>
      </form>
    </div>
  )
}

export default function AdminLayout() {
  const { user, isAdmin, loading, logout } = useAuth()
  if (loading) return null
  if (!user) return <AdminLogin />
  if (!isAdmin) return (
    <div className="mx-auto max-w-md px-5 pt-28 text-center">
      <h1 className="text-2xl font-semibold">This account is not an admin.</h1>
      <p className="mt-2 text-muted">Ask the store owner to grant admin access, then sign out and back in.</p>
      <button onClick={logout} className="btn-ghost mt-6">Sign out</button>
    </div>
  )
  const link = ({ isActive }) => `block rounded-xl px-4 py-2 text-[15px] ${isActive ? 'bg-ink text-white' : 'text-ink hover:bg-surface'}`
  return (
    <div className="min-h-screen bg-white md:flex">
      <aside className="border-b border-line/60 p-4 md:min-h-screen md:w-56 md:border-b-0 md:border-r">
        <Link to="/admin" className="mb-4 block px-4 text-lg font-semibold">Admin</Link>
        <nav className="flex gap-1 overflow-x-auto md:block md:space-y-1">
          <NavLink end to="/admin" className={link}>Dashboard</NavLink>
          <NavLink to="/admin/orders" className={link}>Orders</NavLink>
          <NavLink to="/admin/products" className={link}>Products</NavLink>
          <NavLink to="/admin/settings" className={link}>Settings</NavLink>
        </nav>
        <div className="mt-6 hidden space-y-1 px-4 text-sm md:block">
          <Link to="/" className="block text-accent">View store</Link>
          <button onClick={logout} className="text-muted hover:text-ink">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 bg-surface/50 p-5 md:p-10"><Outlet /></main>
    </div>
  )
}
