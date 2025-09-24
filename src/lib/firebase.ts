/*
 * src/lib/firebase.ts
 * Firebase initialization for Next.js 14 + TypeScript using Firebase v11
 * See docs/firebase.md for required env vars and usage examples.
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Type-only imports
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

// We want to avoid throwing during module import because many pages dynamically
// import this module or import it in contexts where Firebase env vars are not
// available. Instead we lazily initialize the Firebase app on first use and
// provide helpful runtime errors if required env vars are missing when a
// caller actually needs Firebase.

// Store the Firebase app on globalThis to prevent double initialization in dev (HMR)
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var __blinking_firebase_app: FirebaseApp | undefined;
}

const g = globalThis as unknown as { __blinking_firebase_app?: FirebaseApp };

let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

function readFirebaseConfig(): FirebaseOptions | null {
  const env = process.env as Record<string, string | undefined>;
  // If any required env var is missing, return null instead of throwing.
  for (const k of REQUIRED_ENV) {
    if (!env[k]) return null;
  }
  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };
}

function initAppIfPossible(): FirebaseApp | undefined {
  if (g.__blinking_firebase_app) return g.__blinking_firebase_app;
  const cfg = readFirebaseConfig();
  if (!cfg) return undefined;
  const app = initializeApp(cfg);
  g.__blinking_firebase_app = app;
  return app;
}

function ensureApp(): FirebaseApp {
  const app = initAppIfPossible();
  if (!app) {
    throw new Error(
      `Missing required Firebase NEXT_PUBLIC_ env vars. Add them to your .env.local (NEXT_PUBLIC_ prefix) and restart the dev server.`
    );
  }
  return app;
}

function getAuthInstance(): Auth {
  if (_auth) return _auth;
  const app = ensureApp();
  _auth = getAuth(app);
  return _auth;
}

function getDbInstance(): Firestore {
  if (_db) return _db;
  const app = ensureApp();
  _db = getFirestore(app);
  return _db;
}

function getStorageInstance(): FirebaseStorage {
  if (_storage) return _storage;
  const app = ensureApp();
  _storage = getStorage(app);
  return _storage;
}

// Create lazy proxies so existing callers that do `const mod = await import('../lib/firebase');
// const auth = mod.auth;` keep working. The proxies defer initialization until
// the object is actually used.
function createLazyProxy<T>(getter: () => T): T {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_, prop) {
      const real = getter() as unknown as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (real as any)[prop];
    },
    set(_, prop, value) {
      const real = getter() as unknown as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (real as any)[prop] = value;
      return true;
    },
    has(_, prop) {
      const real = getter() as unknown as Record<string, unknown>;
      return prop in real;
    },
    ownKeys() {
      const real = getter() as unknown as Record<string, unknown>;
      return Reflect.ownKeys(real);
    },
    getOwnPropertyDescriptor(_, prop) {
      const real = getter() as unknown as Record<string, unknown>;
      const desc = Object.getOwnPropertyDescriptor(real, prop as string | symbol);
      if (desc) return desc;
      return undefined;
    },
  };
  // Proxy target is an empty object; we cast to T for the exported type.
  return new Proxy({}, handler) as unknown as T;
}

export const auth: Auth = createLazyProxy<Auth>(getAuthInstance);
export const db: Firestore = createLazyProxy<Firestore>(getDbInstance);
export const storage: FirebaseStorage = createLazyProxy<FirebaseStorage>(getStorageInstance);

export function isFirebaseInitialized(): boolean {
  return !!g.__blinking_firebase_app;
}

// Export a real Firestore getter for server-side or server-component usage where
// the Firestore instance must pass `instanceof Firestore` checks (e.g. the
// modular `collection()` helper). The proxy `db` intentionally defers
// initialization and therefore does not satisfy `instanceof` checks when used
// directly as the first argument to `collection()`.
export function getDb(): Firestore {
  return getDbInstance();
}
