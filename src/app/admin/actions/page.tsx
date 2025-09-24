import React from 'react';
import { getAdminFirestore, getAdminAuth } from '../../../lib/firebaseAdmin';
import { cookies } from 'next/headers';
import dynamicImport from 'next/dynamic';

const LogoutButton = dynamicImport(() => import('../LogoutButton'), { ssr: false });

export const dynamic = 'force-dynamic';

type Action = {
  id: string;
  actorUid?: string | null;
  actorEmail?: string | null;
  action?: string;
  targetId?: string;
  targetType?: string;
  metadata?: any;
  requestId?: string | null;
  requestIp?: string | null;
  requestUserAgent?: string | null;
  createdAt?: any;
};

export default async function AdminActionsPage({ searchParams }: { searchParams?: { secret?: string } }) {
  // Read session cookie
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(process.env.ADMIN_SESSION_COOKIE_NAME || 'session')?.value || null;

  if (!sessionCookie) {
    return (
      <div style={{ padding: 20 }}>
        Unauthorized. Please sign in and exchange an ID token for a session cookie by POSTing to <code>/api/admin/session</code>.
      </div>
    );
  }

  // Verify session cookie if present
  let actorEmail: string | null = null;
  let actorUid: string | null = null;
  if (sessionCookie) {
    try {
      const auth = getAdminAuth();
      // verifySessionCookie with checkRevoked = true
      const decoded = await auth.verifySessionCookie(sessionCookie, true as any);
      actorEmail = decoded.email || null;
      actorUid = decoded.uid || null;
      const isAdminClaim = !!decoded.isAdmin;
      if (!isAdminClaim) {
        const db = getAdminFirestore();
        const userDoc = await db.collection('users').doc(decoded.uid).get();
        const role = userDoc.exists ? userDoc.data()?.role : null;
        if (role !== 'admin') {
          return <div style={{ padding: 20 }}>Unauthorized. Admin role required.</div>;
        }
      }
      // authorized
    } catch (err) {
      console.error('Admin UI session verification failed:', err);
      return <div style={{ padding: 20 }}>Unauthorized. Session verification failed.</div>;
    }
  }

  const db = getAdminFirestore();
  const snap = await db.collection('adminActions').orderBy('createdAt', 'desc').limit(100).get();
  const actions: Action[] = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() || {}) }));

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Actions</h1>
          <p className="text-sm text-slate-600">Recent administrative actions. Server-only page.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-700">{actorEmail ?? actorUid ?? 'Admin'}</div>
          <LogoutButton />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b">Time</th>
              <th className="text-left p-2 border-b">Actor</th>
              <th className="text-left p-2 border-b">Action</th>
              <th className="text-left p-2 border-b">Target</th>
              <th className="text-left p-2 border-b">Request</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="odd:bg-white even:bg-slate-50">
                <td className="p-2 align-top">{a.createdAt?.toDate ? a.createdAt.toDate().toISOString() : String(a.createdAt)}</td>
                <td className="p-2 align-top">{a.actorEmail ?? a.actorUid}</td>
                <td className="p-2 align-top">{a.action}</td>
                <td className="p-2 align-top">{a.targetType} / {a.targetId}</td>
                <td className="p-2 align-top">
                  <div className="text-xs text-slate-600">id: {a.requestId}</div>
                  <div className="text-xs text-slate-600">ip: {a.requestIp}</div>
                  <div className="text-xs text-slate-600">ua: {a.requestUserAgent}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
