import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const Ctx = createContext(null)
export const useCart = () => useContext(Ctx)
const KEY = 'cart:v1'
export const lineKey = (i) => `${i.productId}__${i.sku}`

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
  })
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items])

  const add = (item) => {
    setItems((prev) => {
      const k = lineKey(item)
      const found = prev.find((i) => lineKey(i) === k)
      if (found) {
        return prev.map((i) => lineKey(i) === k ? { ...i, qty: Math.min(i.qty + item.qty, item.maxQty || 99) } : i)
      }
      return [...prev, item]
    })
    setOpen(true)
  }
  const setQty = (k, qty) =>
    setItems((prev) => prev.map((i) => lineKey(i) === k ? { ...i, qty: Math.max(1, Math.min(qty, i.maxQty || 99)) } : i))
  const remove = (k) => setItems((prev) => prev.filter((i) => lineKey(i) !== k))
  const clear = () => setItems([])

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items])
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items])

  return (
    <Ctx.Provider value={{ items, add, setQty, remove, clear, subtotal, count, open, setOpen }}>
      {children}
    </Ctx.Provider>
  )
}
