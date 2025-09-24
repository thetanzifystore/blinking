import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Defer env var access until the client is requested so imports don't throw during builds
function missingEnv(name: string) {
  return new Error(
    `Missing required env var ${name}. Add it to your .env.local (NEXT_PUBLIC_ prefix) and restart the dev server.`
  )
}

// Use a global to preserve the client across HMR in development (client-side only)
declare global {
  // eslint-disable-next-line no-var
  var __supabase_client: SupabaseClient | undefined
}

export const getSupabase = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw missingEnv('NEXT_PUBLIC_SUPABASE_URL')
  if (!key) throw missingEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (typeof window === 'undefined') {
    // Server: create a new client for each request (stateless)
    return createClient(url, key)
  }

  // Client: reuse a single client instance across the app
  const g = globalThis as unknown as { __supabase_client?: SupabaseClient }
  if (!g.__supabase_client) {
    g.__supabase_client = createClient(url, key)
  }
  return g.__supabase_client
}

export default getSupabase
