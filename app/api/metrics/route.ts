// app/api/metrics/route.ts
import { NextRequest } from "next/server";
import { readMetrics, readRecent } from "@/src/store/fsStore";

export async function GET(_req: NextRequest) {
  const metrics = readMetrics();
  const recent = readRecent(25);
  return new Response(JSON.stringify({ metrics, recent }), { headers: { "content-type": "application/json" } });
}

