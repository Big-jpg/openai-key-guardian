// app/api/config/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";
import { readConfig, writeConfig } from "@/src/store/configStore";
import { readMetrics } from "@/src/store/fsStore";

export async function GET() {
  return new Response(JSON.stringify({ ok: true, config: readConfig(), metrics: readMetrics() }), {
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as any;
  const allowed = ["RUN_MODE", "ALLOW_WRITES", "SEARCH_QUERY", "RESULTS_PER_PAGE", "MIN_LINE_LENGTH", "COOLDOWN_DAYS", "EXCLUSIONS"];
  const next: any = {};
  for (const k of allowed) if (k in body) next[k] = body[k];

  const merged = writeConfig(next);
  return new Response(JSON.stringify({ ok: true, config: merged }), {
    headers: { "content-type": "application/json" },
  });
}
