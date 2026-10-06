// The admin email(s) from ALLOWED_EMAIL. Tolerates quotes and spaces pasted into Vercel, and allows a comma-separated list.
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().replace(/^["']|["']$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && allowedEmails().includes(email.trim().toLowerCase());
}
