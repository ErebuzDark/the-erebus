import { Link } from 'react-router-dom'
import { img } from '../lib/cloudinary.js'

// Big section banner. Works with or without an image.
export default function Banner({ data, to, cta, tall = false, dark = false }) {
  const hasImg = !!data.image
  const textColor = hasImg || dark ? 'text-white' : 'text-ink'
  return (
    <section className={`relative flex items-center justify-center overflow-hidden text-center ${tall ? 'min-h-[560px] md:min-h-[680px]' : 'min-h-[420px]'} ${hasImg ? 'bg-black' : 'bg-surface'}`}>
      {hasImg && <img src={img(data.image, 1800)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />}
      {hasImg && <div className="absolute inset-0 bg-black/20" />}
      <div className={`relative z-10 max-w-2xl px-6 ${textColor}`}>
        <h2 className={`font-semibold tracking-tight ${tall ? 'text-5xl md:text-7xl' : 'text-4xl md:text-5xl'}`}>{data.title}</h2>
        {data.subtitle && <p className={`mt-3 text-lg md:text-xl ${hasImg ? 'text-white/90' : 'text-muted'}`}>{data.subtitle}</p>}
        {to && (
          <div className="mt-7">
            <Link to={to} className={hasImg ? 'btn bg-white text-ink hover:bg-white/90' : 'btn-primary'}>{cta || data.cta || 'Shop now'}</Link>
          </div>
        )}
      </div>
    </section>
  )
}
