// Transactional email through Resend (https://resend.com). Swap sendEmail() to use another provider.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH')

async function sendEmail({ apiKey, from, to, subject, html }) {
  if (!to || !apiKey || apiKey === 'unset') return
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) console.error('Email failed', res.status, await res.text())
}

const wrap = (store, body) => `
<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;color:#1d1d1f">
  <p style="font-size:20px;font-weight:600;margin:0 0 24px">${esc(store)}</p>${body}
  <p style="color:#6e6e73;font-size:12px;margin-top:32px">Questions? Just reply to this email.</p>
</div>`

const itemsTable = (o) => `
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
${o.items.map((i) => `<tr><td style="padding:8px 0;border-top:1px solid #eee">${esc(i.name)}<br><span style="color:#6e6e73">${esc(i.size)} · ${esc(i.color)} × ${i.qty}</span></td><td style="text-align:right;border-top:1px solid #eee">${peso(i.price * i.qty)}</td></tr>`).join('')}
<tr><td style="padding-top:12px;color:#6e6e73">Shipping</td><td style="text-align:right;padding-top:12px">${o.shipping ? peso(o.shipping) : 'Free'}</td></tr>
${o.discount ? `<tr><td style="color:#6e6e73">Discount</td><td style="text-align:right">−${peso(o.discount)}</td></tr>` : ''}
<tr><td style="padding-top:8px;font-weight:600">Total</td><td style="text-align:right;padding-top:8px;font-weight:600">${peso(o.total)}</td></tr>
</table>`

const addr = (o) => `${esc(o.address.line1)}, ${esc(o.address.barangay)}, ${esc(o.address.city)}, ${esc(o.address.province)} ${esc(o.address.zip)}`

function orderConfirmation(store, o, siteUrl) {
  const pay = o.paymentMethod === 'cod'
    ? 'Payment: cash on delivery. We will message you to confirm your order before shipping.'
    : 'Payment: online. We will email you once payment is received.'
  return {
    subject: `Order ${o.orderNumber} received`,
    html: wrap(store, `<h1 style="font-size:26px;margin:0 0 8px">Thanks, ${esc(o.customer.name.split(' ')[0])}.</h1>
      <p>We received your order <b>${esc(o.orderNumber)}</b>.</p>${itemsTable(o)}
      <p style="font-size:14px">Ship to: ${addr(o)}</p><p style="font-size:14px">${pay}</p>
      ${siteUrl ? `<p><a href="${esc(siteUrl)}/track?order=${esc(o.orderNumber)}&email=${encodeURIComponent(o.customer.email)}" style="color:#0071e3">Track your order</a></p>` : ''}`),
  }
}

function adminAlert(store, o, siteUrl, orderId) {
  return {
    subject: `New order ${o.orderNumber} · ${peso(o.total)}`,
    html: wrap(store, `<h1 style="font-size:22px">New order ${esc(o.orderNumber)}</h1>
      <p>${esc(o.customer.name)} · ${esc(o.customer.phone)} · ${esc(o.customer.email)}</p>${itemsTable(o)}
      <p style="font-size:14px">Ship to: ${addr(o)}</p><p style="font-size:14px">Payment: ${esc(o.paymentMethod)}</p>
      ${siteUrl ? `<p><a href="${esc(siteUrl)}/admin/orders/${esc(orderId)}" style="color:#0071e3">Open in admin</a></p>` : ''}`),
  }
}

function statusEmail(store, o, siteUrl) {
  const msg = {
    confirmed: ['Your order is confirmed', 'We confirmed your order and will start packing it soon.'],
    shipped: ['Your order is on the way', `Your order has shipped.${o.trackingNumber ? ` Tracking number: <b>${esc(o.trackingNumber)}</b>.` : ''}`],
    delivered: ['Your order was delivered', 'Thank you for shopping with us. If anything is not right, reply to this email.'],
    cancelled: ['Your order was cancelled', 'Your order has been cancelled. If you did not ask for this, reply to this email.'],
  }[o.status]
  if (!msg) return null
  return {
    subject: `${msg[0]} · ${o.orderNumber}`,
    html: wrap(store, `<h1 style="font-size:24px;margin:0 0 8px">${msg[0]}.</h1><p>Order <b>${esc(o.orderNumber)}</b></p><p>${msg[1]}</p>
      ${siteUrl ? `<p><a href="${esc(siteUrl)}/track?order=${esc(o.orderNumber)}&email=${encodeURIComponent(o.customer.email)}" style="color:#0071e3">Track your order</a></p>` : ''}`),
  }
}

module.exports = { sendEmail, orderConfirmation, adminAlert, statusEmail }
