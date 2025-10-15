// app/api/scan/route.ts
// Node runtime is required (we do fs + network)
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { runScanOnce } from "@/src/scan";
import { readMetrics } from "@/src/store/fsStore";

// naive in-process lock to avoid concurrent scans
const g = globalThis as any;
if (!g.__guardian_scan_lock__) g.__guardian_scan_lock__ = { running: false };

export async function POST(_req: NextRequest) {
  if (g.__guardian_scan_lock__.running) {
    return new Response(
      JSON.stringify({ ok: false, message: "Scan already running" }),
      { status: 409, headers: { "content-type": "application/json" } }
    );
  }

  // sanity: token present?
  if (!process.env.GH_TOKEN) {
    return new Response(
      JSON.stringify({ ok: false, message: "GH_TOKEN is not set on the server" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  g.__guardian_scan_lock__.running = true;
  const startedAt = new Date().toISOString();

  try {
    await runScanOnce();
    const metrics = readMetrics();
    return new Response(
      JSON.stringify({ ok: true, startedAt, finishedAt: new Date().toISOString(), metrics }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err: any) {
    console.error("scan failed:", err?.message || err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  } finally {
    g.__guardian_scan_lock__.running = false;
  }
}
