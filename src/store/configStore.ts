import fs from "fs";
import path from "path";

const BASE =
  process.env.DATA_DIR ||
  (process.env.VERCEL ? "/tmp/openai-key-guardian" : path.join(process.cwd(), ".data"));
const CONFIG = path.join(BASE, "config.json");

export type RuntimeConfig = {
  RUN_MODE?: "safe" | "notify" | "remediate";
  ALLOW_WRITES?: boolean;
  SEARCH_QUERY?: string;
  RESULTS_PER_PAGE?: number;
  MIN_LINE_LENGTH?: number;
  COOLDOWN_DAYS?: number;
  EXCLUSIONS?: string; // comma list
};

function ensureDir() {
  if (!fs.existsSync(BASE)) fs.mkdirSync(BASE, { recursive: true });
}

export function readConfig(): RuntimeConfig {
  try {
    ensureDir();
    if (!fs.existsSync(CONFIG)) return {};
    return JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  } catch {
    return {};
  }
}

export function writeConfig(next: RuntimeConfig) {
  ensureDir();
  const merged = { ...readConfig(), ...next };
  fs.writeFileSync(CONFIG, JSON.stringify(merged, null, 2));
  return merged;
}
