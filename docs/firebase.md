# Firebase setup (Blinking)

This project uses Firebase (Auth, Firestore, Storage). The client-side code expects the following environment variables to be available. In Next.js they must be prefixed with `NEXT_PUBLIC_`.

Required env vars (add to `.env.local` during development):

- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

Example `.env.local` (do NOT commit this file):

NEXT_PUBLIC_FIREBASE_API_KEY=AIza...your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456

How to import in the app:

```ts
import { auth, db, storage } from "@/lib/firebase";
```

Notes:
- The Firebase app is initialized once and stored on `globalThis` to survive HMR during development.
- This module validates the required env vars at startup and will throw if any are missing.
- Keep any server-only Firebase secrets (if you use them) out of NEXT_PUBLIC_ env vars and access them only on the server.

Troubleshooting:
- If you see "Missing required env var" when starting the dev server, confirm your `.env.local` contains the keys with the `NEXT_PUBLIC_` prefix and restart the dev server.
- Make sure `firebase` SDK is installed in the project (`npm install firebase`).
