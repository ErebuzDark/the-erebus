import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login, register, resetPassword } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    try {
      if (mode === 'login') await login(f.email, f.password)
      else await register(f.name, f.email, f.password)
      nav('/account')
    } catch (e2) {
      const code = e2.code || ''
      setErr(code.includes('email-already') ? 'That email already has an account. Try signing in.'
        : code.includes('weak-password') ? 'Use a password with at least 6 characters.'
        : 'Check your email and password and try again.')
    }
    setBusy(false)
  }

  const forgot = async () => {
    if (!f.email) return setErr('Enter your email first.')
    await resetPassword(f.email).catch(() => {})
    setMsg('If that email has an account, a reset link is on its way.')
  }

  return (
    <div className="container-x max-w-sm pt-20">
      <h1 className="text-center text-3xl font-semibold tracking-tight">{mode === 'login' ? 'Sign in.' : 'Create your account.'}</h1>
      <form onSubmit={submit} className="mt-8 space-y-3">
        {mode === 'register' && <input required className="input" placeholder="Full name" value={f.name} onChange={set('name')} />}
        <input required type="email" className="input" placeholder="Email" value={f.email} onChange={set('email')} />
        <input required type="password" minLength={6} className="input" placeholder="Password" value={f.password} onChange={set('password')} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <button disabled={busy} className="btn-primary w-full">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <div className="mt-5 text-center text-sm text-muted">
        {mode === 'login' ? (
          <>
            <button onClick={forgot} className="text-accent">Forgot password?</button>
            <p className="mt-2">New here? <button onClick={() => setMode('register')} className="text-accent">Create an account</button></p>
          </>
        ) : <p>Already have an account? <button onClick={() => setMode('login')} className="text-accent">Sign in</button></p>}
      </div>
    </div>
  )
}
