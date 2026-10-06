"use client";

import { useActionState } from "react";
import { sendLink, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLink, { step: "email" });
  return (
    <div className="max-w-md mx-auto px-box p-6 mt-8">
      <h1 className="font-display text-base">ADMIN LOGIN</h1>
      {state.step === "sent" ? (
        <p className="mt-4">
          Check <b>{state.email}</b> for a sign-in link. You can close this tab.
        </p>
      ) : (
        <form action={action} className="mt-4 flex flex-col gap-3">
          <label className="font-pixel" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={state.email}
            className="font-pixel px-2 py-2 bg-card border-4 border-foreground"
          />
          <button disabled={pending} className="font-display text-xs px-4 py-3 bg-primary text-primary-foreground border-4 border-foreground px-press">
            {pending ? "SENDING…" : "SEND MAGIC LINK"}
          </button>
          {state.error && <p className="text-destructive">{state.error}</p>}
          <p className="text-sm text-muted-foreground">Only the site owner can sign in. Everyone else can browse without an account.</p>
        </form>
      )}
    </div>
  );
}
