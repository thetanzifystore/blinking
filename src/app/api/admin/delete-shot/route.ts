import { NextResponse } from "next/server";
import { getAdminFirestore, getAdminStorage, getAdminAuth } from "../../../../lib/firebaseAdmin";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const admin = require('firebase-admin');

// Hardened admin route: requires Authorization: Bearer <idToken> from an admin user
export async function POST(req: Request) {
  if (typeof window !== "undefined") {
    return NextResponse.json({ error: "Client may not call this endpoint." }, { status: 400 });
  }

  const authHeader = (req.headers.get("authorization") || "").trim();

  // Verify bearer token first
  let uid: string | null = null;
  let actorEmail: string | null = null;
  try {
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Missing Bearer token");
    }
    const idToken = authHeader.replace(/^Bearer\s+/, "");
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;

    // Check custom claim isAdmin OR user doc role == 'admin'
    const isAdminClaim = !!decoded.isAdmin;
    if (!isAdminClaim) {
      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(uid).get();
      const role = userDoc.exists ? userDoc.data()?.role : null;
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    // capture actor email if available
    actorEmail = decoded.email || null;
  } catch (bearerErr) {
    // No legacy fallback: fail explicitly
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { shotId?: string; storagePath?: string } | null = null;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { shotId, storagePath } = body || {};
  if (!shotId) {
    return NextResponse.json({ error: "Missing shotId" }, { status: 400 });
  }

  try {
    const db = getAdminFirestore();
    const docRef = db.collection("shots").doc(shotId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete Firestore document
    await docRef.delete();

    // Audit log the admin action
    try {
      const auditRef = db.collection('adminActions').doc();

      // request metadata
      const requestId = req.headers.get('x-request-id') || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
      const userAgent = req.headers.get('user-agent') || null;
      const xff = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
      const requestIp = xff ? xff.split(',')[0].trim() : null;

      await auditRef.set({
        actorUid: uid || null,
        actorEmail: actorEmail || null,
        actorIdentity: uid || null,
        action: 'delete-shot',
        targetId: shotId,
        targetType: 'shot',
        metadata: { storagePath: storagePath || null },
        requestId,
        requestIp,
        requestUserAgent: userAgent,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (auditErr) {
      // Log but do not fail the main operation
      // eslint-disable-next-line no-console
      console.error('Failed to write admin audit log:', auditErr);
    }

    // Delete storage object if provided
    if (storagePath) {
      try {
        const storage = getAdminStorage();
        const bucket = storage.bucket();
        await bucket.file(storagePath).delete();
      } catch (err) {
        // Log the error server-side; don't fail the entire operation for a storage delete error
        // eslint-disable-next-line no-console
        console.error("Failed to delete storage object:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Admin delete-shot error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
