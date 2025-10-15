// src/store/fsStore.ts
import fs from "fs";
import path from "path";

const isVercel = !!process.env.VERCEL;

// Prefer an explicit env var; fall back to /tmp on Vercel, ./.data locally
const DATA_DIR =
  process.env.DATA_DIR ||
  (isVercel ? "/tmp/openai-key-guardian" : path.join(process.cwd(), ".data"));

const DETECTIONS = path.join(DATA_DIR, "detections.jsonl");
const METRICS = path.join(DATA_DIR, "metrics.json");

export type Detection = {
  repo: string;           // owner/name
  path: string;           // file path
  url: string;            // html_url for the match
  lineNumber: number;
  redacted: string;       // redacted line
  detectedAt: string;     // ISO
};

export type Metrics = {
  detected: number;
  remediated: number;
  updatedAt: string;
};

/**
 * Ensure that the writable data directory and initial files exist.
 * Never call writeMetrics() here to avoid recursion.
 */
function ensureDirs() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    // If another concurrent invocation created it, ignore EEXIST
  }

  if (!fs.existsSync(DETECTIONS)) {
    fs.writeFileSync(DETECTIONS, "");
  }
  if (!fs.existsSync(METRICS)) {
    const initial: Metrics = {
      detected: 0,
      remediated: 0,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(METRICS, JSON.stringify(initial, null, 2));
  }
}

export function appendDetection(d: Detection) {
  ensureDirs();
  fs.appendFileSync(DETECTIONS, JSON.stringify(d) + "\n");
  const m = readMetrics();
  m.detected += 1;
  m.updatedAt = new Date().toISOString();
  writeMetrics(m);
}

export function readRecent(limit = 100): Detection[] {
  ensureDirs();
  const fileContent = (fs.existsSync(DETECTIONS) ? fs.readFileSync(DETECTIONS, "utf8") : "").trim();
  if (!fileContent) return [];
  const lines = fileContent.split(/\n+/);
  return lines.slice(-limit).map((l) => JSON.parse(l));
}

export function readMetrics(): Metrics {
  ensureDirs();
  const content = fs.existsSync(METRICS) ? fs.readFileSync(METRICS, "utf8") : "{}";
  try {
    const parsed = JSON.parse(content);
    // backfill if partial
    return {
      detected: parsed.detected ?? 0,
      remediated: parsed.remediated ?? 0,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    // corrupt file fallback
    return { detected: 0, remediated: 0, updatedAt: new Date().toISOString() };
  }
}

export function writeMetrics(m: Metrics) {
  ensureDirs(); // only ensures dirs/files; no recursion
  fs.writeFileSync(METRICS, JSON.stringify(m, null, 2));
}

export function incrementRemediated() {
  const m = readMetrics();
  m.remediated += 1;
  m.updatedAt = new Date().toISOString();
  writeMetrics(m);
}
