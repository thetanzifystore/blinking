import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '../../../../lib/firebaseAdmin';

export async function POST(req: Request) {
  const sessionCookieNameBase = process.env.ADMIN_SESSION_COOKIE_NAME || 'session';
  const useHostPrefix = process.env.ADMIN_SESSION_COOKIE_USE_HOST_PREFIX === '1';
  const sessionCookieName = useHostPrefix ? `__Host-${sessionCookieNameBase}` : sessionCookieNameBase;
  const cookieDomain = process.env.ADMIN_SESSION_COOKIE_DOMAIN || null;
  const cookieHeader = req.headers.get('cookie') || '';
  const sessionMatch = cookieHeader.match(new RegExp(`${sessionCookieName}=([^;]+)`));
  const sessionCookie = sessionMatch ? sessionMatch[1] : null;

  let actorUid: string | null = null;
  let actorEmail: string | null = null;

  if (sessionCookie) {
    try {
      const auth = getAdminAuth();
      const decoded: any = await auth.verifySessionCookie(sessionCookie, true as any);
      actorUid = decoded.uid || null;
      actorEmail = decoded.email || null;
    } catch (err) {
      // proceed — we still clear cookie even if verification fails
      console.error('failed to decode session cookie for logout audit', err);
    }
  }

  // Best-effort audit write
  try {
    const db = getAdminFirestore();
    await db.collection('adminActions').add({
      actorUid,
      actorEmail,
      action: 'logout',
      targetType: 'ui',
      metadata: null,
      requestId: (req.headers.get('x-request-id') || null),
      requestIp: (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null),
      requestUserAgent: req.headers.get('user-agent') || null,
      createdAt: (await (await import('firebase-admin')).firestore.FieldValue.serverTimestamp()),
    });
  } catch (err) {
    console.error('failed to write logout audit', err);
  }

  const cookieParts = [`${sessionCookieName}=deleted`, 'Path=/', 'HttpOnly', 'Secure', `SameSite=Strict`, 'Max-Age=0', `Expires=${new Date(0).toUTCString()}`];
  if (!useHostPrefix && cookieDomain) {
    cookieParts.push(`Domain=${cookieDomain}`);
  }
  const res = NextResponse.json({ ok: true });
  // Clear cookie
  res.headers.append('Set-Cookie', cookieParts.join('; '));
  return res;
}

