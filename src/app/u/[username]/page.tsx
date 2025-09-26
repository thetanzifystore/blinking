import React from "react";
import { notFound } from "next/navigation";
import { promises as fs } from "fs";
import path from "path";

type Params = { params: { username: string } };

// generateStaticParams allows Next to statically export dynamic user pages when
// `output: 'export'` is enabled. It reads `static-usernames.json` at the repo root
// (if present) and uses those usernames as the pages to export. If the file
// is missing, it returns an empty array (no dynamic pages will be exported).
export async function generateStaticParams() {
  try {
    const p = path.join(process.cwd(), 'static-usernames.json');
    const text = await fs.readFile(p, 'utf8');
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) return [];
    return arr.map((u: any) => ({ username: String(u) }));
  } catch (e) {
    // No file or parse error — export no dynamic user pages to keep builds deterministic.
    // This is safe and avoids requiring live DB access during build.
    // You can add usernames to static-usernames.json to export specific user pages.
    // eslint-disable-next-line no-console
    console.warn('generateStaticParams: static-usernames.json not found or invalid — exporting no dynamic user pages.');
    return [];
  }
}

export default async function UserPage({ params }: Params) {
  const { username } = params;

  // dynamic import so build/prerender doesn't require env vars at import-time
  const mod = await import("../../../lib/firebase");
  // Use the real Firestore getter for server-side/server-component usage so
  // the modular `collection()` helper receives a true Firestore instance.
  const db = mod.getDb ? mod.getDb() : mod.db;
  const { collection, query, where, getDocs } = await import("firebase/firestore");

  const usersCol = collection(db, "users");
  // Build a query to find user by username
  const q = query(usersCol, where("username", "==", username));
  const snap = await getDocs(q);

  if (snap.empty) {
    notFound();
  }

  const doc = snap.docs[0];
  const data = doc.data() as Record<string, any>;

  const displayName = data.displayName || data.name || data.username || data.email || "Unknown";
  const bio = data.bio || "";
  const portfolio = data.portfolio || data.portfolioUrl || null;

  const initials = (displayName || "").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="flex items-center gap-6">
        <div className="h-28 w-28 rounded-full bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-700">
          {initials}
        </div>

        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          {bio && <p className="text-sm text-slate-600 mt-2">{bio}</p>}
          {portfolio && (
            <p className="mt-3">
              <a
                href={portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sky-600 hover:underline"
              >
                Portfolio
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
