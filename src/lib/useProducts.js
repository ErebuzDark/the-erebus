import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase'

let cache = null

export function useProducts() {
  const [products, setProducts] = useState(cache || [])
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) return
    getDocs(query(collection(db, 'products'), where('status', '==', 'published')))
      .then((snap) => {
        cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setProducts(cache)
      })
      .finally(() => setLoading(false))
  }, [])

  return { products, loading }
}

export const totalStock = (p) => (p.variants || []).reduce((s, v) => s + (Number(v.stock) || 0), 0)

export const resetProductsCache = () => { cache = null }
