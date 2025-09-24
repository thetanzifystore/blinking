/**
 * src/lib/firebaseAdmin.ts
 * Server-side Firebase Admin bootstrap. This file MUST only be imported from
 * server-side code (Route Handlers, server components, or API routes).
 *
 * It supports two ways to provide credentials:
 *  - FIREBASE_SERVICE_ACCOUNT (JSON string)
 *  - FIREBASE_SERVICE_ACCOUNT_PATH (path to JSON file)
 */

// Minimal ServiceAccount type to avoid requiring firebase-admin types in dev
type ServiceAccount = {
  project_id?: string;
  private_key?: string;
  client_email?: string;
  [k: string]: unknown;
};

// Don't import 'firebase-admin' at module top-level in case this file is
// imported into client code by mistake; instead require it lazily below.

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  var __blinking_firebase_admin_app: any | undefined;
}

function parseServiceAccountFromEnv(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch (err) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is set but contains invalid JSON");
  }
}

function readServiceAccountFromPath(): ServiceAccount | null {
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!p) return null;
  // read synchronously since this runs during server startup / request handling
  // and must be available immediately.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  if (!fs.existsSync(p)) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH set but file not found: ${p}`);
  }
  const data = fs.readFileSync(p, { encoding: "utf8" });
  try {
    return JSON.parse(data) as ServiceAccount;
  } catch (err) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH points to a file with invalid JSON");
  }
}

function getServiceAccount(): ServiceAccount {
  const fromEnv = parseServiceAccountFromEnv();
  if (fromEnv) return fromEnv;
  const fromPath = readServiceAccountFromPath();
  if (fromPath) return fromPath;
  throw new Error(
    "Missing Firebase service account. Set FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_SERVICE_ACCOUNT_PATH."
  );
}

export function getAdminApp() {
  if (typeof window !== "undefined") {
    throw new Error("firebaseAdmin must not be imported on the client");
  }

  const g = globalThis as unknown as { __blinking_firebase_admin_app?: any };
  if (g.__blinking_firebase_admin_app) return g.__blinking_firebase_admin_app;

  // Lazy require to avoid bundling admin into client bundles
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const admin = require("firebase-admin");

  const cred = getServiceAccount();

  const app = admin.initializeApp({
    credential: admin.credential.cert(cred),
    // Optionally allow overriding storageBucket/projectId via env
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
  });

  g.__blinking_firebase_admin_app = app;
  return app;
}

export function getAdminFirestore() {
  const app = getAdminApp();
  return app.firestore();
}

export function getAdminStorage() {
  const app = getAdminApp();
  return app.storage();
}

export function getAdminAuth() {
  if (typeof window !== "undefined") {
    throw new Error("firebaseAdmin must not be imported on the client");
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const admin = require("firebase-admin");
  const app = getAdminApp();
  return admin.auth(app);
}

export default getAdminApp;
