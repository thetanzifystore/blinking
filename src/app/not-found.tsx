import React from "react";

export default function NotFound() {
  return (
    <div className="grid place-items-center min-h-[60vh]">
      <div className="flex items-center gap-12">
        <h1 className="text-[6rem] font-bold">404</h1>
        <div className="h-40 w-px bg-slate-300" />
        <p className="text-3xl">This page could not be found.</p>
      </div>
    </div>
  );
}
