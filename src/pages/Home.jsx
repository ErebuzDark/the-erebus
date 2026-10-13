import { Link } from 'react-router-dom'
import Banner from '../components/Banner.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useProducts } from '../lib/useProducts.js'

export default function Home() {
  const { settings } = useSettings()
  const { products, loading } = useProducts()
  const featured = products.filter((p) => p.featured).slice(0, 4)
  const list = featured.length ? featured : products.slice(0, 4)

  return (
    <>
      <Banner data={settings.banners.hero} to="/shop" tall />

      <section className="container-x pt-20">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">New arrivals</h2>
        <p className="mt-1 text-muted">Fresh from the latest drop.</p>
        {loading ? <p className="mt-10 text-muted">Loading…</p> : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {list.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
        {!loading && list.length === 0 && <p className="mt-10 text-muted">Products will appear here once you add them in the admin.</p>}
        <div className="mt-10 text-center"><Link to="/shop" className="btn-ghost">View all products</Link></div>
      </section>

      <div className="mt-20 grid gap-3 px-3 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl"><Banner data={settings.banners.shirts} to="/shop?category=Shirts" cta="Shop shirts" /></div>
        <div className="overflow-hidden rounded-3xl"><Banner data={settings.banners.pants} to="/shop?category=Pants" cta="Shop pants" /></div>
      </div>

      <section className="container-x mt-20 grid gap-8 text-center md:grid-cols-3">
        {[
          ['Nationwide delivery', 'We ship anywhere in the Philippines.'],
          ['Cash on delivery', 'Pay when your order arrives.'],
          ['Easy exchanges', 'Wrong size? We will swap it.'],
        ].map(([t, d]) => (
          <div key={t}><h3 className="text-lg font-semibold">{t}</h3><p className="mt-1 text-muted">{d}</p></div>
        ))}
      </section>
    </>
  )
}
