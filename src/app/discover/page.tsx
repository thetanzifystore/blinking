import React from "react";
export const dynamic = "force-dynamic";
import Link from "next/link";

type Shot = {
  id: string;
  mediaUrl?: string;
  caption?: string;
  category?: string;
};

export default async function DiscoverPage() {
  const mod = await import("../../lib/firebase");
  // Use the real Firestore getter for server-side/server-component usage so
  // the modular `collection()` helper receives a true Firestore instance.
  const db = mod.getDb ? mod.getDb() : mod.db;
  const { collection, query, orderBy, limit, getDocs } = await import("firebase/firestore");

  const shotsCol = collection(db, "shots");
  const q = query(shotsCol, orderBy("createdAt", "desc"), limit(24));
  const snap = await getDocs(q);

  const shots: Shot[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) }));

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Discover</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {shots.map((shot) => (
          <Link key={shot.id} href={`/shots/${shot.id}`} className="block border rounded overflow-hidden">
            <div className="h-48 bg-slate-100 flex items-center justify-center text-slate-400">
              {shot.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shot.mediaUrl} alt={shot.caption || "shot"} className="object-cover w-full h-full" />
              ) : (
                <span className="text-sm">No image</span>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium">{shot.caption || "Untitled"}</h3>
              <p className="text-xs text-slate-500 mt-1">{shot.category || "Uncategorized"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
