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

export function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(DETECTIONS)) fs.writeFileSync(DETECTIONS, "");
  if (!fs.existsSync(METRICS)) writeMetrics({ detected: 0, remediated: 0, updatedAt: new Date().toISOString() });
}

export function appendDetection(d: Detection) {
  ensure();
  fs.appendFileSync(DETECTIONS, JSON.stringify(d) + "\n");
  const m = readMetrics();
  m.detected += 1;
  m.updatedAt = new Date().toISOString();
  writeMetrics(m);
}

export function readRecent(limit = 100): Detection[] {
  ensure();
  const lines = fs.readFileSync(DETECTIONS, "utf8").trim().split(/\n+/).filter(Boolean);
  return lines.slice(-limit).map(l => JSON.parse(l));
}

export function readMetrics(): Metrics {
  ensure();
  return JSON.parse(fs.readFileSync(METRICS, "utf8"));
}

export function writeMetrics(m: Metrics) {
  ensure();
  fs.writeFileSync(METRICS, JSON.stringify(m, null, 2));
}

export function incrementRemediated() {
  const m = readMetrics();
  m.remediated += 1;
  m.updatedAt = new Date().toISOString();
  writeMetrics(m);
}

