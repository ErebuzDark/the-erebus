import { useParams } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'

// Starter copy. Review and edit before launch, especially privacy and terms.
const PAGES = {
  shipping: ['Shipping and payment', [
    'We ship anywhere in the Philippines. Orders are packed within 1 to 3 business days after we confirm them.',
    'Delivery takes about 2 to 4 days in Metro Manila, 3 to 6 days in the rest of Luzon, and 5 to 9 days in the Visayas and Mindanao.',
    'We currently accept cash on delivery. Online payments through GCash, Maya, and cards are coming soon.',
    'We may text or call you to confirm your order before shipping it.',
  ]],
  returns: ['Returns and exchanges', [
    'Wrong size or a defect? Message us within 7 days of receiving your order and we will arrange an exchange.',
    'Items must be unworn, unwashed, and have their tags attached.',
  ]],
  privacy: ['Privacy policy', [
    'We collect your name, contact details, and delivery address to process and deliver your orders.',
    'We do not sell your personal data. We share it only with couriers and service providers that help us fulfill your order.',
    'To request a copy or deletion of your data, contact us using the details on the contact page.',
  ]],
  terms: ['Terms of sale', [
    'Prices are in Philippine pesos. We may cancel orders that cannot be fulfilled, for example because of stock errors or unreachable customers.',
    'By placing an order you confirm the details you gave us are correct.',
  ]],
  contact: ['Contact', ['Add your email, phone number, and social media links here.']],
}

export default function Info() {
  const { page } = useParams()
  const { settings } = useSettings()
  const [title, paras] = PAGES[page] || ['Page not found', []]
  return (
    <div className="container-x max-w-2xl pt-16">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 space-y-4 leading-relaxed text-[15px]">
        {paras.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <p className="mt-10 text-sm text-muted">{settings.storeName}</p>
    </div>
  )
}
