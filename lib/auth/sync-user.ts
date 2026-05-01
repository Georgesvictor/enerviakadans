/**
 * Auto-sync: bij eerste server-side request voor een ingelogde Clerk user,
 * maken we een row in public.users aan zodat RLS policies werken.
 *
 * Dit is een fallback voor het geval de Clerk webhook niet geconfigureerd is
 * of tijdelijk faalt. Idempotent via upsert.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const ALLOWED_DOMAINS = ["enervia.be"];

export async function ensureUserRow(): Promise<{
  userId: string | null;
  role: "verkoper" | "admin" | null;
}> {
  const { userId } = await auth();
  if (!userId) return { userId: null, role: null };

  const supabase = createAdminSupabaseClient();

  // Check if user already exists
  const { data: existing } = await supabase
    .from("users")
    .select("id, rol")
    .eq("id", userId)
    .single();

  if (existing) {
    return { userId: existing.id as string, role: existing.rol as any };
  }

  // First login: fetch full user details from Clerk
  const user = await currentUser();
  if (!user) return { userId: null, role: null };

  const email = user.emailAddresses[0]?.emailAddress;
  if (!email) return { userId: null, role: null };

  const domain = email.split("@")[1];
  if (!ALLOWED_DOMAINS.includes(domain)) {
    // Non-Enervia email — log and return null (middleware kan hen uitgooien)
    console.warn(`Non-Enervia user tried to sync: ${email}`);
    return { userId: null, role: null };
  }

  await supabase.from("users").upsert({
    id: userId,
    email,
    rol: "verkoper",
  });

  return { userId, role: "verkoper" };
}
