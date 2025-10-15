// src/store/fsStore.ts
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
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
 * Ensure that the .data directory and initial files exist.
 * This function does not call writeMetrics to avoid recursion.
 */
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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
  const fileContent = fs.readFileSync(DETECTIONS, "utf8").trim();
  if (!fileContent) return [];
  const lines = fileContent.split(/\n+/);
  return lines.slice(-limit).map((l) => JSON.parse(l));
}

export function readMetrics(): Metrics {
  ensureDirs();
  const content = fs.readFileSync(METRICS, "utf8");
  return JSON.parse(content);
}

export function writeMetrics(m: Metrics) {
  ensureDirs(); // only ensures directory and files, no recursion
  fs.writeFileSync(METRICS, JSON.stringify(m, null, 2));
}

export function incrementRemediated() {
  const m = readMetrics();
  m.remediated += 1;
  m.updatedAt = new Date().toISOString();
  writeMetrics(m);
}
