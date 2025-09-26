"use client";
import React, { useState } from "react";
import { z } from "zod";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const SignupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username too long")
    .regex(/^[a-zA-Z0-9_]+$/i, "Username can only contain letters, numbers and _"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function SignupPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = SignupSchema.safeParse(form);
    if (!parsed.success) {
      const msgs = parsed.error.errors.map((x: z.ZodIssue) => x.message);
      setError(msgs.join(" — "));
      return;
    }

    setSubmitting(true);
    try {
  const { email, password, username } = parsed.data;
  // optimistic feedback
  setSuccess("Creating account…");

  // dynamic import to avoid server-side env checks during build
  const mod = await import("../../../lib/firebase");
  const auth = mod.auth;
  const db = mod.db;

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

      // update displayName
      try {
        await updateProfile(user, { displayName: username });
      } catch (e) {
        // non-fatal
        console.warn("updateProfile failed", e);
      }

      // create user doc in Firestore
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        email: user.email ?? null,
        username,
        createdAt: serverTimestamp(),
      });

      setSuccess("Account created successfully!");
      setForm({ username: "", email: "", password: "" });
    } catch (err: any) {
      console.error(err);
      setError(mapAuthError(err));
      setSuccess(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-2xl font-semibold mb-4">Sign up</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Username</label>
          <input
            value={form.username}
            onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
            className="mt-1 block w-full rounded border px-3 py-2"
            placeholder="your_username"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            className="mt-1 block w-full rounded border px-3 py-2"
            placeholder="you@example.com"
            type="email"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            className="mt-1 block w-full rounded border px-3 py-2"
            placeholder="••••••••"
            type="password"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create account"}
          </button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-700">{success}</div>}
      </form>
    </div>
  );
}

function mapAuthError(err: any): string {
  const code = err?.code || err?.message || String(err);
  if (typeof code !== "string") return "An unknown error occurred";
  if (code.includes("auth/email-already-in-use")) return "Email already in use";
  if (code.includes("auth/weak-password")) return "Password is too weak";
  if (code.includes("auth/invalid-email")) return "Invalid email";
  return code;
}
