import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard.jsx'
import { useProducts } from '../lib/useProducts.js'
import { CATEGORIES } from '../lib/constants.js'

export default function Shop() {
  const { products, loading } = useProducts()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || 'All'
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('new')

  const list = useMemo(() => {
    let l = products.filter((p) => (category === 'All' || p.category === category) &&
      p.name.toLowerCase().includes(q.toLowerCase()))
    if (sort === 'low') l = [...l].sort((a, b) => a.basePrice - b.basePrice)
    if (sort === 'high') l = [...l].sort((a, b) => b.basePrice - a.basePrice)
    return l
  }, [products, category, q, sort])

  const setCat = (c) => (c === 'All' ? setParams({}) : setParams({ category: c }))

  return (
    <div className="container-x pt-12">
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{category === 'All' ? 'Shop all' : category}</h1>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {['All', ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${category === c ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-line/60'}`}>{c}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <input className="input w-44! py-1.5!" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input w-40! py-1.5!" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="new">Newest</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>
      </div>

      {loading ? <p className="mt-16 text-muted">Loading…</p> : list.length === 0 ? (
        <p className="mt-16 text-muted">No products found. Try another category or search.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}
