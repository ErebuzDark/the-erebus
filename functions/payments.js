// Payment providers. COD needs nothing extra; PayMongo creates a hosted checkout session.
// To go live with PayMongo: set the secrets, set paymongoEnabled in Admin > Settings, register the webhook.

async function paymongoCreateCheckout({ secretKey, order, orderId, siteUrl }) {
  if (!secretKey || secretKey === 'unset') throw new Error('PayMongo is not configured.')
  const res = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [{
            currency: 'PHP',
            amount: Math.round(order.total * 100), // centavos
            name: `Order ${order.orderNumber}`,
            quantity: 1,
          }],
          payment_method_types: ['gcash', 'paymaya', 'card'],
          reference_number: order.orderNumber,
          description: `Order ${order.orderNumber}`,
          success_url: `${siteUrl}/order-success/${order.orderNumber}`,
          cancel_url: `${siteUrl}/cart`,
          metadata: { orderId },
        },
      },
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.errors?.[0]?.detail || 'PayMongo checkout failed.')
  return { url: json.data.attributes.checkout_url, ref: json.data.id }
}

module.exports = { paymongoCreateCheckout }
