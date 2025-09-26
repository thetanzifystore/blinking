"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Toast from "../components/Toast";
import { useRouter } from "next/navigation";

type MinimalUser = {
	uid: string;
	displayName: string | null;
	photoURL: string | null;
	email?: string | null;
} | null;

function getInitials(input: string) {
    if (!input) return "U";
    const parts = input.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar() {
	const router = useRouter();
	const [user, setUser] = useState<MinimalUser | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = React.useRef<HTMLDivElement | null>(null);
	const firstItemRef = React.useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
	const toggleRef = React.useRef<HTMLButtonElement | null>(null);

	// close menu on outside click or Escape
	useEffect(() => {
		function onDocClick(e: MouseEvent) {
			if (!menuRef.current) return;
			if (e.target && menuRef.current.contains(e.target as Node)) return;
			setMenuOpen(false);
		}

		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setMenuOpen(false);
		}

		document.addEventListener("click", onDocClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("click", onDocClick);
			document.removeEventListener("keydown", onKey);
		};
	}, []);

	useEffect(() => {
		let unsub: (() => void) | undefined = undefined;
		let mounted = true;

		import("../lib/firebase")
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
				});
			})
			.catch((err) => {
				// non-fatal; keep Navbar usable without auth
				// console.error("Navbar auth listener failed:", err);
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

	// move focus into menu when opened
	useEffect(() => {
		if (menuOpen) {
			// focus the first menu item (profile link)
			setTimeout(() => {
				try {
					if (firstItemRef.current) {
						(firstItemRef.current as HTMLElement).focus();
					} else if (menuRef.current) {
						const el = menuRef.current.querySelector<HTMLElement>("[role=menuitem]");
						el?.focus();
					}
				} catch (e) {
					// ignore
				}
			}, 0);
		} else {
			// when menu closes, return focus to the toggle button
			setTimeout(() => {
				try {
					toggleRef.current?.focus();
				} catch (e) {
					// ignore
				}
			}, 0);
		}
	}, [menuOpen]);

	const handleSignOut = async () => {
		try {
			const mod = await import("../lib/firebase");
			const { signOut } = await import("firebase/auth");
			await signOut(mod.auth);
			setUser(null);
			// show toast to confirm sign out
			setShowToast(true);
			// redirect to login after sign out
			router.push('/login');
		} catch (err) {
			console.error("Sign out failed", err);
		}
	};

	const [showToast, setShowToast] = useState(false);
	const loginRef = React.useRef<HTMLAnchorElement | null>(null);

	return (
		<header className="border-b bg-white/50">
			<Toast
				message="Signed out"
				open={showToast}
				onClose={() => {
					setShowToast(false);
					setTimeout(() => {
						loginRef.current?.focus();
					}, 0);
				}}
			/>
			<div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
				<Link href="/" className="text-lg font-semibold">Blinking</Link>

				<nav className="hidden md:flex items-center gap-6">
					<Link href="/discover" className="text-sm text-slate-700 hover:text-slate-900">Discover</Link>
					<Link href="/upload" className="text-sm text-slate-700 hover:text-slate-900">Upload</Link>

					{user ? (
						<button onClick={handleSignOut} className="text-sm text-slate-700 hover:text-slate-900">Sign out</button>
					) : (
						<Link href="/login" ref={loginRef} className="text-sm text-slate-700 hover:text-slate-900">Login</Link>
					)}
				</nav>

				<div className="md:hidden">
					{user ? (
						<button onClick={handleSignOut} className="text-sm text-slate-700">Sign out</button>
					) : (
						<Link href="/login" className="text-sm text-slate-700">Login</Link>
					)}
				</div>
			</div>
		</header>
	);
}

