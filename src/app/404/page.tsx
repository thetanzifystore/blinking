import React from "react";

export default function Custom404() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "3rem", margin: 0 }}>404</h1>
        <p style={{ marginTop: "0.5rem" }}>Page not found.</p>
      </div>
    </main>
  );
}
