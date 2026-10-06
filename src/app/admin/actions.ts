"use server";

import { requireAdmin } from "@/lib/supabase/server";

/** Starts the "scrape" GitHub Actions workflow. The scrape itself runs on GitHub, not on Vercel. */
export async function runScrapeAction(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return { ok: false, message: "GITHUB_DISPATCH_TOKEN / GITHUB_REPO aren't set in Vercel." };
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/scrape.yml/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (res.status === 204) return { ok: true, message: "Scrape started on GitHub. It takes 5–10 minutes; refresh this page after." };
  return { ok: false, message: `GitHub said ${res.status}: ${(await res.text()).slice(0, 200)}` };
}
