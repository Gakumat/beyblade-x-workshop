"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { allowedEmails, isAllowedEmail } from "@/lib/admin-email";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export type LoginState = { step: "email" | "sent"; email?: string; error?: string };

export async function sendLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!hasSupabase()) return { step: "email", email, error: "Supabase isn't configured yet." };
  if (!allowedEmails().length)
    return { step: "email", email, error: "ALLOWED_EMAIL isn't set on the server. Add it in Vercel → Settings → Environment Variables, then redeploy." };
  if (!isAllowedEmail(email)) return { step: "email", email, error: "That email isn't the admin." };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { step: "email", email, error: error.message };
  return { step: "sent", email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
