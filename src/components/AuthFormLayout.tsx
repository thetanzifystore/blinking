"use client";

import React from 'react'

export default function AuthFormLayout({ title, children, footer }: { title: string, children: React.ReactNode, footer?: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold mb-4">{title}</h1>
        <div role="status" aria-live="polite" className="sr-only" />
        {children}
        {footer}
      </div>
    </div>
  )
}
