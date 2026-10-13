import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u)
    if (u) {
      const token = await u.getIdTokenResult()
      setIsAdmin(token.claims.admin === true)
    } else setIsAdmin(false)
    setLoading(false)
  }), [])

  const value = {
    user, isAdmin, loading,
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    register: async (name, email, password) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      return cred
    },
    logout: () => signOut(auth),
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
