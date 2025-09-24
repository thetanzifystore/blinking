"use client";
import React, { useState } from 'react';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <button onClick={handle} disabled={loading} className="px-3 py-1 bg-red-600 text-white rounded">
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
