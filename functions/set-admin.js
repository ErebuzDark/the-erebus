// Usage: node set-admin.js you@example.com
// Needs functions/serviceAccountKey.json (Firebase console > Project settings > Service accounts > Generate new private key)
const admin = require('firebase-admin')
admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')) })

const email = process.argv[2]
if (!email) { console.error('Usage: node set-admin.js <email>'); process.exit(1) }

admin.auth().getUserByEmail(email)
  .then((u) => admin.auth().setCustomUserClaims(u.uid, { admin: true }))
  .then(() => { console.log(`${email} is now an admin. Sign out and back in to apply.`); process.exit(0) })
  .catch((e) => { console.error(e.message); process.exit(1) })
