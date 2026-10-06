"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/pixelact-ui/button";
import { runScrapeAction } from "./actions";

export function RunScrape() {
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-2">
      <Button size="lg" variant="warning" disabled={pending} onClick={() => start(async () => setMsg(await runScrapeAction()))}>
        {pending ? "Starting…" : "▶ Run scrape"}
      </Button>
      {msg && <p className={`mt-2 ${msg.ok ? "" : "text-destructive"}`}>{msg.message}</p>}
    </div>
  );
}
