// app/api/scan/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { runScanOnce } from "@/src/scan";
import { readMetrics } from "@/src/store/fsStore";

// Use the same base dir as fsStore
const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.VERCEL ? "/tmp/openai-key-guardian" : path.join(process.cwd(), ".data"));

const LOCK_PATH = path.join(DATA_DIR, "scan.lock");
const LOCK_TTL_MS = Number(process.env.SCAN_LOCK_TTL_MS || 15 * 60_000); // 15 min default

function nowISO() { return new Date().toISOString(); }

function readLock(): { startedAt: string } | null {
  try {
    const txt = fs.readFileSync(LOCK_PATH, "utf8");
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function lockIsStale(): boolean {
  try {
    const stat = fs.statSync(LOCK_PATH);
    const age = Date.now() - stat.mtimeMs;
    if (age > LOCK_TTL_MS) return true;
    // also check JSON body if present
    const meta = readLock();
    if (meta?.startedAt) {
      const t = Date.parse(meta.startedAt);
      if (!Number.isNaN(t) && Date.now() - t > LOCK_TTL_MS) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function writeLock() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LOCK_PATH, JSON.stringify({ startedAt: nowISO() }), { flag: "wx" });
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_PATH); } catch { /* ignore */ }
}

export async function GET() {
  const running = fs.existsSync(LOCK_PATH) && !lockIsStale();
  const metrics = readMetrics();
  return new Response(JSON.stringify({ running, metrics }), {
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.GH_TOKEN) {
    return new Response(JSON.stringify({ ok: false, message: "GH_TOKEN is not set" }),
      { status: 400, headers: { "content-type": "application/json" } });
  }

  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  // Handle stale or force
  if (fs.existsSync(LOCK_PATH)) {
    if (force || lockIsStale()) {
      releaseLock(); // clear stale/forced
    }
  }

  try {
    writeLock(); // atomic via 'wx'; throws if already exists
  } catch (e: any) {
    if (e?.code === "EEXIST") {
      return new Response(JSON.stringify({ ok: false, message: "Scan already running" }),
        { status: 409, headers: { "content-type": "application/json" } });
    }
    // Maybe DATA_DIR race, try once more
    fs.mkdirSync(DATA_DIR, { recursive: true });
    try {
      writeLock();
    } catch (e2: any) {
      if (e2?.code === "EEXIST") {
        return new Response(JSON.stringify({ ok: false, message: "Scan already running" }),
          { status: 409, headers: { "content-type": "application/json" } });
      }
      throw e2;
    }
  }

  const startedAt = nowISO();
  try {
    await runScanOnce();
    const metrics = readMetrics();
    return new Response(JSON.stringify({ ok: true, startedAt, finishedAt: nowISO(), metrics }),
      { status: 200, headers: { "content-type": "application/json" } });
  } catch (err: any) {
    console.error("scan failed:", err?.message || err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: { "content-type": "application/json" } });
  } finally {
    releaseLock();
  }
}
