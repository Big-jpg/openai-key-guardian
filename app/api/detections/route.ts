// app/api/detections/route.ts
import { NextResponse } from "next/server";
import { dropDetectionsByRepo, clearAllDetections } from "../../../src/store/fsStore";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get("repo") || undefined;

    const result = repo
      ? dropDetectionsByRepo(repo)
      : clearAllDetections(true);

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to drop detections" },
      { status: 500 }
    );
  }
}
