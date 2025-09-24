"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

// A minimal user type, same as in Navbar
type MinimalUser = {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email?: string | null;
} | null;

export default function SettingsPage() {
  const [user, setUser] = useState<MinimalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined = undefined;
    let mounted = true;

    import("../../lib/firebase")
      .then(async (mod) => {
        const { onAuthStateChanged } = await import("firebase/auth");
        if (!mounted) return;
        unsub = onAuthStateChanged(mod.auth, (u) => {
          if (!mounted) return;
          setUser(
            u
              ? { uid: u.uid, displayName: u.displayName, photoURL: u.photoURL, email: u.email }
              : null
          );
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error("Settings page auth listener failed:", err);
        setLoading(false);
      });

    return () => {
      mounted = false;
      try {
        if (typeof unsub === "function") unsub();
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  if (loading) {
    return <div className="text-center text-slate-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-slate-700">Please sign in to view your settings.</p>
        <Link href="/login" className="mt-2 inline-block text-blue-600 hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-slate-600">Manage your account and profile settings.</p>

      <div className="mt-8 space-y-8">
        {/* Profile Section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800">Profile</h2>
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  id="email"
                  disabled
                  value={user.email ?? "No email provided"}
                  className="mt-1 block w-full rounded-md border-slate-300 bg-slate-50 shadow-sm sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  defaultValue={user.displayName ?? ""}
                  placeholder="Your name"
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Save Profile
              </button>
            </div>
          </div>
        </section>

        {/* Password Section */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800">Change Password</h2>
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Update Password
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
