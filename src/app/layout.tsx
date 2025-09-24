import React from "react";
import "./globals.css";
import Navbar from "../components/Navbar";

// Initialize dev metrics reporter on server bootstrap (no-op in production)
if (typeof window === 'undefined') {
  try {
    require('../lib/devMetrics');
  } catch (e) {
    // ignore failures to keep layout resilient
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
