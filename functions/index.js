const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { setGlobalOptions } = require('firebase-functions/v2')
const { defineSecret, defineString } = require('firebase-functions/params')
const admin = require('firebase-admin')
const crypto = require('crypto')
const { paymongoCreateCheckout } = require('./payments')
const { sendEmail, orderConfirmation, adminAlert, statusEmail } = require('./emails')

admin.initializeApp()
const db = admin.firestore()
const { FieldValue, Timestamp } = admin.firestore

// Use the same region as your Firestore database (Singapore recommended for the Philippines)
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 })

const RESEND_API_KEY = defineSecret('RESEND_API_KEY')
const PAYMONGO_SECRET_KEY = defineSecret('PAYMONGO_SECRET_KEY')
const PAYMONGO_WEBHOOK_SECRET = defineSecret('PAYMONGO_WEBHOOK_SECRET')
const STORE_NAME = defineString('STORE_NAME', { default: 'Your Brand' })
const SITE_URL = defineString('SITE_URL', { default: '' })
const FROM_EMAIL = defineString('FROM_EMAIL', { default: 'onboarding@resend.dev' })
const ADMIN_EMAIL = defineString('ADMIN_EMAIL', { default: '' })

const REGIONS = ['metro', 'luzon', 'visayas', 'mindanao']
const STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']
const DEFAULT_RATES = { metro: 100, luzon: 150, visayas: 180, mindanao: 200 }

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max)

// ---------- createOrder ----------
exports.createOrder = onCall({ secrets: [PAYMONGO_SECRET_KEY], cors: true }, async (request) => {
  const d = request.data || {}
  const customer = {
    name: str(d.customer?.name, 100), email: str(d.customer?.email, 150).toLowerCase(), phone: str(d.customer?.phone, 20),
  }
  const address = {
    line1: str(d.address?.line1), barangay: str(d.address?.barangay, 100), city: str(d.address?.city, 100),
    province: str(d.address?.province, 100), zip: str(d.address?.zip, 10), region: str(d.address?.region, 20),
  }
  if (!customer.name || !/^\S+@\S+\.\S+$/.test(customer.email)) throw new HttpsError('invalid-argument', 'Enter your name and a valid email.')
  if (!/^(09|\+639)\d{9}$/.test(customer.phone.replace(/[\s-]/g, ''))) throw new HttpsError('invalid-argument', 'Enter a valid Philippine mobile number.')
  if (!address.line1 || !address.city || !address.province || !address.barangay) throw new HttpsError('invalid-argument', 'Complete your delivery address.')
  if (!REGIONS.includes(address.region)) throw new HttpsError('invalid-argument', 'Choose a shipping region.')

  // Merge duplicate lines
  const lines = new Map()
  for (const it of Array.isArray(d.items) ? d.items : []) {
    const qty = Math.floor(Number(it.qty))
    if (!it.productId || !it.sku || !(qty > 0 && qty <= 20)) throw new HttpsError('invalid-argument', 'Your bag has an invalid item.')
    const k = `${it.productId}__${it.sku}`
    lines.set(k, { productId: String(it.productId), sku: String(it.sku), qty: (lines.get(k)?.qty || 0) + qty })
  }
  if (!lines.size) throw new HttpsError('invalid-argument', 'Your bag is empty.')

  const paymentMethod = d.paymentMethod === 'paymongo' ? 'paymongo' : 'cod'
  const promoCode = str(d.promoCode, 30).toUpperCase()
  const orderRef = db.collection('orders').doc()
  const counterRef = db.collection('counters').doc('orders')
  const settingsRef = db.collection('settings').doc('store')
  const productIds = [...new Set([...lines.values()].map((l) => l.productId))]

  const order = await db.runTransaction(async (tx) => {
    // All reads first
    const [counterSnap, settingsSnap] = await Promise.all([tx.get(counterRef), tx.get(settingsRef)])
    const productSnaps = await Promise.all(productIds.map((id) => tx.get(db.collection('products').doc(id))))
    const promoRef = promoCode ? db.collection('promoCodes').doc(promoCode) : null
    const promoSnap = promoRef ? await tx.get(promoRef) : null

    const settings = settingsSnap.exists ? settingsSnap.data() : {}
    if (paymentMethod === 'paymongo' && !settings.paymongoEnabled) throw new HttpsError('failed-precondition', 'Online payment is not available yet.')

    const products = new Map(productSnaps.map((s) => [s.id, s]))
    const variantsByProduct = new Map()
    const items = []
    let subtotal = 0

    for (const l of lines.values()) {
      const snap = products.get(l.productId)
      if (!snap.exists || snap.data().status !== 'published') throw new HttpsError('failed-precondition', 'An item in your bag is no longer available.')
      const p = snap.data()
      const variants = variantsByProduct.get(l.productId) || p.variants.map((v) => ({ ...v }))
      const v = variants.find((x) => x.sku === l.sku)
      if (!v) throw new HttpsError('failed-precondition', `${p.name} is no longer available in that option.`)
      if (v.stock < l.qty) throw new HttpsError('failed-precondition', `Only ${v.stock} left of ${p.name} (${v.size}, ${v.color}). Update your bag and try again.`)
      v.stock -= l.qty
      variantsByProduct.set(l.productId, variants)
      const price = Number(v.price) > 0 ? Number(v.price) : Number(p.basePrice)
      subtotal += price * l.qty
      items.push({ productId: l.productId, sku: v.sku, name: p.name, size: v.size, color: v.color, image: p.images?.[0] || '', price, qty: l.qty })
    }

    // Shipping
    const rates = { ...DEFAULT_RATES, ...(settings.shippingRates || {}) }
    const freeAt = settings.freeShippingThreshold ?? 2500
    const shipping = subtotal >= freeAt ? 0 : Number(rates[address.region]) || 0

    // Promo
    let discount = 0
    let appliedPromo = ''
    if (promoRef) {
      const pr = promoSnap.exists ? promoSnap.data() : null
      const valid = pr && pr.active !== false && subtotal >= (pr.minSpend || 0) &&
        (!pr.expiry || pr.expiry.toMillis() > Date.now()) && (!pr.usageLimit || (pr.used || 0) < pr.usageLimit)
      if (!valid) throw new HttpsError('failed-precondition', 'That promo code is not valid.')
      discount = pr.type === 'percent' ? Math.round((subtotal * pr.value) / 100) : Number(pr.value) || 0
      discount = Math.min(discount, subtotal)
      appliedPromo = promoCode
      tx.update(promoRef, { used: FieldValue.increment(1) })
    }

    const next = (counterSnap.exists ? counterSnap.data().next : 1001)
    const orderNumber = `ORD-${next}`
    const total = subtotal - discount + shipping

    for (const [id, variants] of variantsByProduct) tx.update(db.collection('products').doc(id), { variants })
    tx.set(counterRef, { next: next + 1 })

    const doc = {
      orderNumber, uid: request.auth?.uid || null, customer, address, notes: str(d.notes, 500), items,
      subtotal, shipping, discount, promoCode: appliedPromo, total,
      paymentMethod, paymentStatus: 'unpaid', status: 'pending', trackingNumber: '',
      statusHistory: [{ status: 'pending', at: Timestamp.now() }],
      createdAt: FieldValue.serverTimestamp(),
    }
    tx.set(orderRef, doc)
    return doc
  })

  let redirectUrl = null
  if (paymentMethod === 'paymongo') {
    try {
      const session = await paymongoCreateCheckout({ secretKey: PAYMONGO_SECRET_KEY.value(), order, orderId: orderRef.id, siteUrl: SITE_URL.value() })
      redirectUrl = session.url
      await orderRef.update({ paymentRef: session.ref })
    } catch (e) {
      await applyOrderUpdate(orderRef.id, { status: 'cancelled' }).catch(() => {})
      throw new HttpsError('unavailable', 'We could not start the online payment. Please try again or choose cash on delivery.')
    }
  }
  return { orderId: orderRef.id, orderNumber: order.orderNumber, total: order.total, redirectUrl }
})

// ---------- shared order update (status, payment, stock restore on cancel) ----------
async function applyOrderUpdate(orderId, { status, trackingNumber, paymentStatus }) {
  const ref = db.collection('orders').doc(orderId)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new HttpsError('not-found', 'Order not found.')
    const o = snap.data()
    const update = {}

    if (status && status !== o.status) {
      if (!STATUSES.includes(status)) throw new HttpsError('invalid-argument', 'Invalid status.')
      if (o.status === 'cancelled') throw new HttpsError('failed-precondition', 'A cancelled order cannot be reopened. Create a new order instead.')
      update.status = status
      update.statusHistory = FieldValue.arrayUnion({ status, at: Timestamp.now() })
      if (status === 'delivered' && o.paymentMethod === 'cod' && o.paymentStatus !== 'paid') update.paymentStatus = 'paid'

      if (status === 'cancelled') {
        const ids = [...new Set(o.items.map((i) => i.productId))]
        const snaps = await Promise.all(ids.map((id) => tx.get(db.collection('products').doc(id))))
        for (const ps of snaps) {
          if (!ps.exists) continue
          const variants = ps.data().variants.map((v) => ({ ...v }))
          for (const it of o.items.filter((i) => i.productId === ps.id)) {
            const v = variants.find((x) => x.sku === it.sku)
            if (v) v.stock += it.qty
          }
          tx.update(ps.ref, { variants })
        }
      }
    }
    if (typeof trackingNumber === 'string' && trackingNumber !== o.trackingNumber) update.trackingNumber = str(trackingNumber, 60)
    if (paymentStatus && paymentStatus !== o.paymentStatus && ['unpaid', 'paid'].includes(paymentStatus)) update.paymentStatus = paymentStatus
    if (Object.keys(update).length) tx.update(ref, update)
  })
}

exports.adminUpdateOrder = onCall({ cors: true }, async (request) => {
  if (request.auth?.token?.admin !== true) throw new HttpsError('permission-denied', 'Admins only.')
  const { orderId, status, trackingNumber, paymentStatus } = request.data || {}
  if (!orderId) throw new HttpsError('invalid-argument', 'Missing order.')
  await applyOrderUpdate(String(orderId), { status, trackingNumber, paymentStatus })
  return { ok: true }
})

// ---------- guest order tracking ----------
exports.trackOrder = onCall({ cors: true }, async (request) => {
  const orderNumber = str(request.data?.orderNumber, 30).toUpperCase()
  const email = str(request.data?.email, 150).toLowerCase()
  const snap = await db.collection('orders').where('orderNumber', '==', orderNumber).limit(1).get()
  const o = snap.docs[0]?.data()
  if (!o || o.customer.email !== email) throw new HttpsError('not-found', 'Order not found.')
  return {
    orderNumber: o.orderNumber, status: o.status, trackingNumber: o.trackingNumber, total: o.total,
    items: o.items.map((i) => ({ name: i.name, size: i.size, color: i.color, qty: i.qty, price: i.price })),
  }
})

// ---------- PayMongo webhook (register: https://<region>-<project>.cloudfunctions.net/paymongoWebhook) ----------
exports.paymongoWebhook = onRequest({ secrets: [PAYMONGO_WEBHOOK_SECRET] }, async (req, res) => {
  const secret = PAYMONGO_WEBHOOK_SECRET.value()
  if (!secret || secret === 'unset') return res.status(503).send('Not configured')
  const header = String(req.get('Paymongo-Signature') || '')
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')))
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${req.rawBody.toString('utf8')}`).digest('hex')
  const given = parts.li || parts.te || ''
  const ok = given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) return res.status(401).send('Bad signature')

  const event = req.body?.data?.attributes
  if (event?.type === 'checkout_session.payment.paid') {
    const attrs = event.data?.attributes || {}
    let orderId = attrs.metadata?.orderId
    if (!orderId && attrs.reference_number) {
      const q = await db.collection('orders').where('orderNumber', '==', attrs.reference_number).limit(1).get()
      orderId = q.docs[0]?.id
    }
    if (orderId) await applyOrderUpdate(orderId, { paymentStatus: 'paid' })
  }
  res.status(200).send('ok')
})

// Release stock for online orders that were never paid
exports.expireUnpaidOnlineOrders = onSchedule('every 60 minutes', async () => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000
  const snap = await db.collection('orders')
    .where('paymentMethod', '==', 'paymongo').where('paymentStatus', '==', 'unpaid').where('status', '==', 'pending').get()
  for (const d of snap.docs) {
    if (d.data().createdAt?.toMillis() < cutoff) await applyOrderUpdate(d.id, { status: 'cancelled' }).catch(console.error)
  }
})

// ---------- emails ----------
const mail = (to, tpl) => sendEmail({
  apiKey: RESEND_API_KEY.value(), from: `${STORE_NAME.value()} <${FROM_EMAIL.value()}>`, to, subject: tpl.subject, html: tpl.html,
})

exports.onOrderCreated = onDocumentCreated({ document: 'orders/{orderId}', secrets: [RESEND_API_KEY] }, async (event) => {
  const o = event.data?.data()
  if (!o) return
  await mail(o.customer.email, orderConfirmation(STORE_NAME.value(), o, SITE_URL.value()))
  if (ADMIN_EMAIL.value()) await mail(ADMIN_EMAIL.value(), adminAlert(STORE_NAME.value(), o, SITE_URL.value(), event.params.orderId))
})

exports.onOrderUpdated = onDocumentUpdated({ document: 'orders/{orderId}', secrets: [RESEND_API_KEY] }, async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!before || !after || before.status === after.status) return
  const tpl = statusEmail(STORE_NAME.value(), after, SITE_URL.value())
  if (tpl) await mail(after.customer.email, tpl)
})
