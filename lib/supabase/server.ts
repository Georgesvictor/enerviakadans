import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * Supabase client met Clerk session JWT zodat RLS policies werken.
 * Clerk moet geconfigureerd zijn met een 'supabase' JWT template.
 *
 * NB: we typeen de client untyped (`any`) omdat strict typing via een
 * handgemaakte Database interface het ontwikkelen blokkeert. Vervang
 * dit door auto-gegenereerde types via `supabase gen types typescript`
 * na de live-setup.
 */
export async function createServerSupabaseClient() {
  const cookieStore = cookies();
  const { getToken } = await auth();
  const token = await getToken({ template: "supabase" });

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server component kan geen cookies setten
          }
        },
      },
      global: token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : undefined,
    },
  );
}

/**
 * Admin client met service role key — bypass RLS.
 * ENKEL server-side gebruiken, nooit aan client blootstellen.
 */
export function createAdminSupabaseClient() {
  return createAdminClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
