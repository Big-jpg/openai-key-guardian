// app/api/scan/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { runScanOnce } from "@/src/scan";
import { readMetrics } from "@/src/store/fsStore";

// Writable base dir (matches fsStore defaults)
const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.VERCEL ? "/tmp/openai-key-guardian" : path.join(process.cwd(), ".data"));

const LOCK_PATH = path.join(DATA_DIR, "scan.lock");

// Acquire an exclusive lock by creating the file with 'wx'
async function acquireLock(): Promise<boolean> {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.openSync(LOCK_PATH, "wx"); // throws if exists
    return true;
  } catch (e: any) {
    if (e?.code === "EEXIST") return false;
    // If DATA_DIR didn't exist and mkdir races, try once more
    if (e?.code === "ENOENT") {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      try {
        fs.openSync(LOCK_PATH, "wx");
        return true;
      } catch (e2: any) {
        if (e2?.code === "EEXIST") return false;
        throw e2;
      }
    }
    throw e;
  }
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
  } catch {
    // ignore
  }
}

export async function POST(_req: NextRequest) {
  // Basic env sanity
  if (!process.env.GH_TOKEN) {
    return new Response(
      JSON.stringify({ ok: false, message: "GH_TOKEN is not set on the server" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const locked = await acquireLock();
  if (!locked) {
    return new Response(
      JSON.stringify({ ok: false, message: "Scan already running" }),
      { status: 409, headers: { "content-type": "application/json" } }
    );
  }

  const startedAt = new Date().toISOString();
  try {
    await runScanOnce(); // does the GitHub search + writes .data files
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
    releaseLock();
  }
}

// Optional: allow the UI to poll current status
export async function GET() {
  const running = fs.existsSync(LOCK_PATH);
  const metrics = readMetrics();
  return new Response(JSON.stringify({ running, metrics }), {
    headers: { "content-type": "application/json" },
  });
}
