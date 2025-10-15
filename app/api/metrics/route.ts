// app/api/metrics/route.ts
import { NextResponse } from "next/server";
import { readRecent, readMetrics } from "@/src/store/fsStore";

export const dynamic = "force-dynamic"; // ensure fresh reads from file store
export const runtime = "nodejs";        // not edge

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = Number.isFinite(Number(limitParam)) ? Number(limitParam) : 100;
    // guardrails
    const effectiveLimit = Math.min(Math.max(1, limit), 5000);

    const metrics = readMetrics();
    const recent = readRecent(effectiveLimit);

    return NextResponse.json({ metrics, recent });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "metrics failed" }, { status: 500 });
  }
}
