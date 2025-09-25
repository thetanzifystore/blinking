"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";

/**
 * Redirect logged-in users away from auth pages to /discover.
 * Client-only: only runs when window is available.
 * Returns `checking` which is true while we probe auth state.
 */
export default function useRedirectIfAuthenticated(): boolean {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setChecking(false);
      return;
    }

    try {
      const auth = getAuth();
      if (auth && auth.currentUser) {
        router.replace("/discover");
        setChecking(false);
        return;
      }
    } catch (e) {
      // ignore initialization errors
    }

    // If we didn't redirect, we're done checking
    setChecking(false);
  }, [router]);

  return checking;
}
