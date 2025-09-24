import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/firebaseAdmin';
import { isRateLimited as redisIsRateLimited, incrementAttempt as redisIncrementAttempt } from '../../../../lib/adminRateLimiter';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idToken = body?.idToken;
    const attemptedEmail = body?.email || null;
    if (!idToken) {
      return NextResponse.json({ error: 'idToken required' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('x-remote-ip') || 'unknown';
    if (ip !== 'unknown') {
      try {
        const limited = await redisIsRateLimited(ip);
        if (limited) {
          // Fetch current state to compute Retry-After; our redis limiter stores blockedUntil in ms
          const state = await redisIncrementAttempt(ip); // incrementAttempt will still return current state
          const now = Date.now();
          const retryAfterSec = state.blockedUntil && state.blockedUntil > now ? Math.ceil((state.blockedUntil - now) / 1000) : 1;
          const res429 = NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
          res429.headers.append('Retry-After', String(retryAfterSec));
          return res429;
        }
      } catch (e) {
        // If Redis is unavailable, fall back to allowing attempts (best-effort). Log error.
        console.error('rate limiter error', e);
      }
    }

    const auth = getAdminAuth();
    // verify ID token
    let decoded: any = null;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch (verifyErr) {
      // failed verification: increment and audit (via Redis)
      if (ip !== 'unknown') {
        try {
          await redisIncrementAttempt(ip);
        } catch (e) {
          console.error('rate limiter increment error', e);
        }
      }
      try {
        const db = getAdminFirestore();
        await db.collection('adminActions').add({
          actorUid: null,
          actorEmail: attemptedEmail,
          action: 'failed-login',
          targetType: 'ui',
          metadata: { reason: 'invalid_token' },
          requestId: (req.headers.get('x-request-id') || null),
          requestIp: ip,
          requestUserAgent: req.headers.get('user-agent') || null,
          createdAt: (await (await import('firebase-admin')).firestore.FieldValue.serverTimestamp()),
        });
      } catch (auditErr) {
        console.error('failed to write failed-login audit', auditErr);
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const isAdminClaim = !!decoded.isAdmin;
    if (!isAdminClaim) {
      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      const role = userDoc.exists ? userDoc.data()?.role : null;
      if (role !== 'admin') {
        // unauthorized role: increment attempt and log (via Redis)
        if (ip !== 'unknown') {
          try {
            await redisIncrementAttempt(ip);
          } catch (e) {
            console.error('rate limiter increment error', e);
          }
        }
        try {
          const db2 = getAdminFirestore();
          await db2.collection('adminActions').add({
            actorUid: decoded.uid || null,
            actorEmail: decoded.email || null,
            action: 'failed-login',
            targetType: 'ui',
            metadata: { reason: 'not_admin' },
            requestId: (req.headers.get('x-request-id') || null),
            requestIp: ip,
            requestUserAgent: req.headers.get('user-agent') || null,
            createdAt: (await (await import('firebase-admin')).firestore.FieldValue.serverTimestamp()),
          });
        } catch (auditErr) {
          console.error('failed to write failed-login audit', auditErr);
        }
        return NextResponse.json({ error: 'admin role required' }, { status: 403 });
      }
    }

  const sessionCookieNameBase = process.env.ADMIN_SESSION_COOKIE_NAME || 'session';
  const useHostPrefix = process.env.ADMIN_SESSION_COOKIE_USE_HOST_PREFIX === '1';
  const sessionCookieName = useHostPrefix ? `__Host-${sessionCookieNameBase}` : sessionCookieNameBase;
  const cookieDomain = process.env.ADMIN_SESSION_COOKIE_DOMAIN || null; // optional
  const expiresIn = Number(process.env.ADMIN_SESSION_COOKIE_EXPIRES_IN_MS) || 60 * 60 * 24 * 5 * 1000; // 5 days default

  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    // Best-effort audit log for login
    try {
      const db = getAdminFirestore();
      await db.collection('adminActions').add({
        actorUid: decoded.uid || null,
        actorEmail: decoded.email || null,
        action: 'login',
        targetType: 'ui',
        metadata: null,
        requestId: (req.headers.get('x-request-id') || null),
        requestIp: (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null),
        requestUserAgent: req.headers.get('user-agent') || null,
        createdAt: (await (await import('firebase-admin')).firestore.FieldValue.serverTimestamp()),
      });
    } catch (err) {
      console.error('failed to write login audit', err);
    }

    const maxAge = Math.floor(expiresIn / 1000);
    const expires = new Date(Date.now() + expiresIn).toUTCString();
    const sameSite = process.env.ADMIN_SESSION_COOKIE_SAMESITE || 'Strict';

    const cookieParts = [`${sessionCookieName}=${sessionCookie}`, 'Path=/', 'HttpOnly', 'Secure', `SameSite=${sameSite}`, `Max-Age=${maxAge}`, `Expires=${expires}`];
    // When using __Host- prefix we MUST NOT set Domain; otherwise allow explicit domain via env
    if (!useHostPrefix && cookieDomain) {
      cookieParts.push(`Domain=${cookieDomain}`);
    }

    const res = NextResponse.json({ ok: true });
    res.headers.append('Set-Cookie', cookieParts.join('; '));
    return res;
  } catch (err: any) {
    console.error('session create error', err);
    return NextResponse.json({ error: 'session create failed' }, { status: 500 });
  }
}
