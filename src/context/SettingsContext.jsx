import { createContext, useContext, useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { DEFAULT_SETTINGS } from '../lib/constants'

const Ctx = createContext({ settings: DEFAULT_SETTINGS, reload: () => {} })
export const useSettings = () => useContext(Ctx)

const merge = (s) => ({
  ...DEFAULT_SETTINGS,
  ...s,
  shippingRates: { ...DEFAULT_SETTINGS.shippingRates, ...(s?.shippingRates || {}) },
  banners: {
    hero: { ...DEFAULT_SETTINGS.banners.hero, ...(s?.banners?.hero || {}) },
    shirts: { ...DEFAULT_SETTINGS.banners.shirts, ...(s?.banners?.shirts || {}) },
    pants: { ...DEFAULT_SETTINGS.banners.pants, ...(s?.banners?.pants || {}) },
  },
})

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const reload = () =>
    getDoc(doc(db, 'settings', 'store'))
      .then((snap) => setSettings(merge(snap.exists() ? snap.data() : {})))
      .catch(() => {})
  useEffect(() => { reload() }, [])
  return <Ctx.Provider value={{ settings, reload }}>{children}</Ctx.Provider>
}
