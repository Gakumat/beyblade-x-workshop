import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const hasSupabase = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Cookie-less client for public reads (cacheable). */
export function createPublicClient() {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

/** True when the signed-in user is the allowed admin. Without Supabase (local dev on the snapshot) everyone is. */
export async function isAdmin(): Promise<boolean> {
  if (!hasSupabase()) return process.env.NODE_ENV !== "production";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase();
  return !!user?.email && allowed !== "" && user.email.toLowerCase() === allowed;
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Admins only");
}
