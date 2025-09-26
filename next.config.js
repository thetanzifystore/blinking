/**
 * Next.js configuration for static export
 * This sets the app to use exported output so `next build` produces a static site
 * consistent with the removed `next export` command.
 */
/** @type {import('next').NextConfig} */
// NOTE: `output: 'export'` was removed to avoid static-export requirements
// while the app still contains dynamic server-side pages (cookies, admin UI, etc.).
// If you later convert all dynamic pages to static-friendly patterns, you can
// re-enable `output: 'export'`.
const nextConfig = {
  // keep default server-capable output so `next build` can prerender server components
};

module.exports = nextConfig;
