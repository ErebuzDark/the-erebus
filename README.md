# Clothing store (React + Vite + Firebase + Cloudinary)

Storefront, checkout (COD now, PayMongo-ready), guest + account customers, and an admin for products and orders.

## 1. Firebase
1. Create a project at console.firebase.google.com.
2. Build > **Firestore Database**: create it in **asia-southeast1 (Singapore)** (must match the functions region).
3. Build > **Authentication** > enable **Email/Password**.
4. Upgrade to the **Blaze** plan (needed for Cloud Functions; usage at your size is typically within the free quota).
5. Project settings > Your apps > add a **Web app**, copy the config into `.env` (see `.env.example`).
6. Install the CLI and log in: `npm i -g firebase-tools && firebase login && firebase use --add`

## 2. Cloudinary
1. Create a free account and copy your **cloud name**.
2. Settings > Upload > **Add upload preset** > Signing mode: **Unsigned**. Copy its name.
3. Put both in `.env` as `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`.

## 3. Email (Resend)
1. Create an account at resend.com, verify your sending domain (add the DNS records), create an API key.
2. `cp functions/.env.example functions/.env` and fill in store name, site URL, from email, and your admin alert email.
3. `firebase functions:secrets:set RESEND_API_KEY` (paste the key).

## 4. PayMongo (optional for now)
The functions need these two secrets to deploy. Set them to `unset` until you use PayMongo:
```
firebase functions:secrets:set PAYMONGO_SECRET_KEY        # value: unset
firebase functions:secrets:set PAYMONGO_WEBHOOK_SECRET    # value: unset
```
When you are ready: set the real keys, register the webhook
`https://asia-southeast1-<project-id>.cloudfunctions.net/paymongoWebhook`
for the event `checkout_session.payment.paid`, then tick "Offer GCash, Maya, and card payments" in Admin > Settings.
Unpaid online orders are cancelled and their stock released after 2 hours.

## 5. Deploy
```
npm install
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,functions
npm run build && firebase deploy --only hosting
```

## 6. Create your admin
1. Open the site, go to Sign in > Create an account with your email.
2. Firebase console > Project settings > Service accounts > **Generate new private key**. Save as `functions/serviceAccountKey.json` (never commit it).
3. `cd functions && node set-admin.js you@example.com`
4. Sign out and back in, then open `/admin`.

## 7. First steps in admin
Settings: store name, shipping rates, banner images. Products: add items with images and size/color stock, tick Published.

## Promo codes
Create documents in the `promoCodes` collection (Firebase console). Document ID = the code, e.g. `WELCOME10`:
`type` ("percent" or "fixed"), `value` (number), `minSpend` (number), `active` (true), optional `expiry` (timestamp), `usageLimit` (number).

## Local development
`cp .env.example .env`, fill it in, then `npm run dev`. The store talks to your real Firebase project (use a separate test project while developing).

## Before launch
Edit the text in `src/pages/Info.jsx` (shipping, returns, privacy, terms, contact) and set the page title in `index.html`.
