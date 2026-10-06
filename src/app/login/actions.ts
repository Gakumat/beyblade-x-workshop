"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export type LoginState = { step: "email" | "sent"; email?: string; error?: string };

function isAllowed(email: string) {
  const allowed = (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase();
  return allowed !== "" && email === allowed;
}

export async function sendLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!hasSupabase()) return { step: "email", email, error: "Supabase isn't configured yet." };
  if (!isAllowed(email)) return { step: "email", email, error: "That email isn't the admin." };
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
