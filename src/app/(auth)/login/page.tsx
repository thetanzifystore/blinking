"use client";
import React, { useState } from "react";
import { z } from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";

const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = LoginSchema.safeParse(form);
    if (!parsed.success) {
      const msgs = parsed.error.errors.map((err: z.ZodIssue) => err.message);
      setError(msgs.join(" — "));
      return;
    }

    setSubmitting(true);
    try {
      const mod = await import("../../../lib/firebase");
      const auth = mod.auth;
      await signInWithEmailAndPassword(auth, parsed.data.email, parsed.data.password);
    } catch (err: any) {
      console.error(err);
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-2xl font-semibold mb-4">Sign in</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </div>
  );
}

function mapAuthError(err: any): string {
  const code = err?.code || err?.message || String(err);
  if (typeof code !== "string") return "An unknown error occurred";
  if (code.includes("auth/wrong-password")) return "Incorrect password";
  if (code.includes("auth/user-not-found")) return "No account found with that email";
  return code;
}
