import { arrayUnion, doc, getDoc, runTransaction, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import { computeShipping } from './shipping'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
const newOrderNumber = () =>
    'ORD-' + [...crypto.getRandomValues(new Uint8Array(8))].map((b) => ALPHABET[b % 32]).join('')

// Customer side: re-reads products so price and stock come from the database, not the cart
export async function createOrder({ cart, customer, address, notes, uid, settings }) {
    const items = []
    for (const line of cart) {
        const snap = await getDoc(doc(db, 'products', line.productId))
        if (!snap.exists() || snap.data().status !== 'published') throw new Error(`${line.name} is no longer available.`)
        const p = snap.data()
        const v = p.variants.find((x) => x.sku === line.sku)
        if (!v) throw new Error(`${p.name} is no longer available in that option.`)
        if (v.stock < line.qty) throw new Error(`Only ${v.stock} left of ${p.name} (${v.size}, ${v.color}). Update your bag and try again.`)
        items.push({
            productId: snap.id, sku: v.sku, name: p.name, size: v.size, color: v.color, image: p.images?.[0] || '',
            price: Number(v.price) > 0 ? Number(v.price) : Number(p.basePrice), qty: line.qty,
        })
    }
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    const shipping = computeShipping(settings, address.region, subtotal)
    const total = subtotal + shipping
    const orderNumber = newOrderNumber()

    await setDoc(doc(db, 'orders', orderNumber), {
        orderNumber, uid: uid || null, customer, address, notes: (notes || '').slice(0, 500), items,
        subtotal, shipping, discount: 0, total,
        paymentMethod: 'cod', paymentStatus: 'unpaid', status: 'pending', trackingNumber: '',
        stockDeducted: false, statusHistory: [{ status: 'pending', at: Timestamp.now() }],
        createdAt: serverTimestamp(),
    })
    return { orderNumber, total }
}

// Admin side: stock is deducted when you move an order past "pending", and restored on cancel
const DEDUCT = ['confirmed', 'packed', 'shipped', 'delivered']

export async function adminSetOrder(orderId, { status, trackingNumber, paymentStatus }) {
    const ref = doc(db, 'orders', orderId)
    let warnings = []
    await runTransaction(db, async (tx) => {
        warnings = []
        const snap = await tx.get(ref)
        const o = snap.data()
        const update = {}
        let adjust = 0 // 1 = deduct stock, -1 = restore stock

        if (status && status !== o.status) {
            if (o.status === 'cancelled') throw new Error('A cancelled order cannot be reopened.')
            update.status = status
            update.statusHistory = arrayUnion({ status, at: Timestamp.now() })
            if (status === 'delivered' && o.paymentStatus !== 'paid') update.paymentStatus = 'paid'
            if (status === 'cancelled' && o.stockDeducted) adjust = -1
            else if (DEDUCT.includes(status) && !o.stockDeducted) adjust = 1
            if (adjust) update.stockDeducted = adjust === 1
        }

        if (adjust) {
            const ids = [...new Set(o.items.map((i) => i.productId))]
            const snaps = await Promise.all(ids.map((id) => tx.get(doc(db, 'products', id))))
            for (const ps of snaps) {
                if (!ps.exists()) continue
                const p = ps.data()
                const variants = p.variants.map((v) => ({ ...v }))
                for (const it of o.items.filter((i) => i.productId === ps.id)) {
                    const v = variants.find((x) => x.sku === it.sku)
                    if (!v) continue
                    if (adjust === 1) {
                        if (v.stock < it.qty) throw new Error(`Not enough stock for ${it.name} (${it.size}, ${it.color}): ${v.stock} left.`)
                        const now = Number(v.price) > 0 ? Number(v.price) : Number(p.basePrice)
                        if (now !== it.price) warnings.push(`${it.name} was ordered at ₱${it.price} but is now ₱${now}.`)
                        v.stock -= it.qty
                    } else v.stock += it.qty
                }
                tx.update(ps.ref, { variants })
            }
        }

        if (typeof trackingNumber === 'string' && trackingNumber !== (o.trackingNumber || '')) update.trackingNumber = trackingNumber.slice(0, 60)
        if (paymentStatus && paymentStatus !== o.paymentStatus) update.paymentStatus = paymentStatus
        if (Object.keys(update).length) tx.update(ref, update)
    })
    return warnings
}