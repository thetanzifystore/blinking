"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import AuthFormLayout from "../../../components/AuthFormLayout";
import Spinner from "../../../components/Spinner";
import { normalizeAuthError, useAutoFocus } from "../../../lib/authUtils";
import { useRedirectIfAuthenticated } from "src/lib/hooks";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const setAutoFocus = useAutoFocus();

  const checking = useRedirectIfAuthenticated();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const mod = await import("../../../lib/firebase");
      const auth = mod.auth;
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/discover');
    } catch (err: any) {
      setError(normalizeAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
  const mod = await import("../../../lib/firebase");
  const auth = mod.auth;
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
      router.push('/discover');
    } catch (err: any) {
      setError(normalizeAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) return setError('Please enter your email to reset');
    try {
  const mod = await import("../../../lib/firebase");
  const auth = mod.auth;
  await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent');
    } catch (err: any) {
      setError(normalizeAuthError(err));
    }
  };

  if (checking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <AuthFormLayout title="Sign in">
      <div className={`transition-opacity duration-300 ease-in-out ${checking ? 'opacity-0' : 'opacity-100 delay-100'}`}>
        <div aria-live="polite" className="min-h-[1.25rem]">
          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <label className="block">
            <span className="text-sm">Email</span>
            <input ref={(el) => { emailRef.current = el; setAutoFocus(el); }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full rounded border px-3 py-2" />
          </label>

          <label className="block">
            <span className="text-sm">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full rounded border px-3 py-2" />
          </label>

          <div className="flex items-center justify-between">
            <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded disabled:opacity-60 flex items-center gap-2" disabled={loading}>
              {loading && <Spinner className="h-4 w-4 text-white" />} Sign in
            </button>
            <button type="button" className="text-sm text-slate-600" onClick={handleForgot}>Forgot password?</button>
          </div>
        </form>

        <div className="mt-4 border-t pt-4">
          <button onClick={handleGoogle} className="w-full px-4 py-2 border rounded flex items-center justify-center gap-2 disabled:opacity-60" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : null} Continue with Google
          </button>
        </div>

        <div className="mt-4 text-center text-sm">
          Don’t have an account? <a href="/signup" className="text-sky-600">Sign up</a>
        </div>
      </div>
    </AuthFormLayout>
  );
}
