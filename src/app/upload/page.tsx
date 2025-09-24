"use client";
import React, { useEffect, useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  // auth listener (dynamic import to avoid build-time env checks)
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;
    (async () => {
      try {
        const mod = await import("../../lib/firebase");
        const { onAuthStateChanged } = await import("firebase/auth");
        unsub = onAuthStateChanged(mod.auth, (u) => {
          if (!mounted) return;
          setUser(u ?? null);
        });
      } catch (e) {
        console.warn("auth listener failed", e);
      }
    })();
    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!user) return setMessage("Please sign in to upload");
    if (!file) return setMessage("Please choose an image to upload");
    if (file.size > 5 * 1024 * 1024) return setMessage("File too large (max 5MB)");

    setSubmitting(true);
    try {
      const { storage, db } = await import("../../lib/firebase");
      const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

      const uid = user.uid;
      const storageRef = ref(storage, `shots/${uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "shots"), {
        authorId: uid,
        mediaUrl: url,
        caption,
        category,
        tags: [],
        createdAt: serverTimestamp(),
      });

      setMessage("Uploaded successfully");
      setFile(null);
      setCaption("");
      setCategory("");
    } catch (err: any) {
      console.error(err);
      setMessage("Upload failed: " + (err?.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-2xl font-semibold mb-4">Upload</h2>

      {!user ? (
        <div className="p-6 border rounded">
          <p className="mb-2">Please sign in to upload.</p>
          <div className="flex gap-3">
            <a href="/login" className="text-sm text-sky-600 hover:underline">Sign in</a>
            <a href="/signup" className="text-sm text-sky-600 hover:underline">Sign up</a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Image</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Caption</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" />
          </div>

          <div>
            <button disabled={submitting || !user} className="inline-flex items-center gap-2 rounded bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50">
              {submitting ? "Uploading…" : "Upload"}
            </button>
          </div>

          {message && <div className="text-sm mt-2">{message}</div>}
        </form>
      )}
    </div>
  );
}
