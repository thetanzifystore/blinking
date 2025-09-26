"use client";
import React, { useState } from "react";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";

const ResetSchema = z.object({ email: z.string().email("Please enter a valid email") });

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsed = ResetSchema.safeParse({ email });
    if (!parsed.success) {
      const msgs = parsed.error.errors.map((er: z.ZodIssue) => er.message);
      setError(msgs.join(" — "));
      return;
    }

    setSubmitting(true);
    try {
      const mod = await import("../../../lib/firebase");
      const auth = mod.auth;
      await sendPasswordResetEmail(auth, parsed.data.email);
      setSuccess("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      console.error(err);
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-2xl font-semibold mb-4">Reset password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded border px-3 py-2"
            placeholder="you@example.com"
            type="email"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send reset email"}
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
  if (code.includes("auth/user-not-found")) return "No account found with that email";
  if (code.includes("auth/invalid-email")) return "Invalid email";
  return code;
}
