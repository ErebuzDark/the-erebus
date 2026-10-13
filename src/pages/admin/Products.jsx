import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase.js'
import { img } from '../../lib/cloudinary.js'
import { peso } from '../../lib/format.js'
import { totalStock, resetProductsCache } from '../../lib/useProducts.js'

export default function AdminProducts() {
  const [list, setList] = useState(null)
  const load = () => getDocs(collection(db, 'products'))
    .then((s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
  useEffect(() => { load() }, [])

  const toggle = async (p) => {
    await updateDoc(doc(db, 'products', p.id), { status: p.status === 'published' ? 'draft' : 'published' })
    resetProductsCache(); load()
  }
  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    await deleteDoc(doc(db, 'products', p.id))
    resetProductsCache(); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
        <Link to="/admin/products/new" className="btn-primary">Add product</Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-3xl bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-4">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list === null && <tr><td className="p-4 text-muted">Loading…</td></tr>}
            {list?.map((p) => (
              <tr key={p.id} className="border-t border-line/50">
                <td className="flex items-center gap-3 p-4">
                  <div className="h-12 w-10 overflow-hidden rounded-lg bg-surface">{p.images?.[0] && <img src={img(p.images[0], 120)} alt="" className="h-full w-full object-cover" />}</div>
                  <span className="font-medium">{p.name}</span>
                </td>
                <td>{p.category}</td>
                <td>{peso(p.basePrice)}</td>
                <td className={totalStock(p) === 0 ? 'text-red-600' : ''}>{totalStock(p)}</td>
                <td><button onClick={() => toggle(p)} className={`rounded-full px-3 py-1 text-xs ${p.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-surface text-muted'}`}>{p.status}</button></td>
                <td className="space-x-3 pr-4 text-right">
                  <Link to={`/admin/products/${p.id}`} className="text-accent">Edit</Link>
                  <button onClick={() => remove(p)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {list?.length === 0 && <tr><td className="p-6 text-muted" colSpan={6}>No products yet. Add your first one.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
