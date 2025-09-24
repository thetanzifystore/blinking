import React from 'react';
import SignInForm from './SignInForm';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h1 className="text-xl font-semibold mb-4">Admin sign in</h1>
        <p className="text-sm text-slate-600 mb-4">Sign in with your admin account. After signing in you'll be redirected to the admin actions page.</p>
        <SignInForm />
      </div>
    </div>
  );
}
