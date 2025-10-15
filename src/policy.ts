// src/policy.ts
export const MIN_LINE_LENGTH = Number(process.env.MIN_LINE_LENGTH ?? 80);
export const RESULTS_PER_PAGE = Number(process.env.RESULTS_PER_PAGE ?? 50);
export const SEARCH_QUERY = process.env.SEARCH_QUERY ?? "OPENAI_API_KEY=sk-proj";
export const RUN_MODE = (process.env.RUN_MODE ?? "safe") as "safe" | "notify" | "remediate";
export const ALLOW_WRITES = (process.env.ALLOW_WRITES ?? "false").toLowerCase() === "true";
export const COOLDOWN_DAYS = Number(process.env.COOLDOWN_DAYS ?? 7);
export const EXCLUSIONS = new Set((process.env.EXCLUSIONS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean));

// regex tuned for sk-, sk-proj- variants without capturing the full key in logs
export const KEY_LINE_REGEX = /OPENAI_API_KEY\s*[=:]\s*sk-(?:proj-)?[A-Za-z0-9_\-]{20,}/;
export const IGNORE_LINE_REGEXES = [
  /example/i,
  /your-?api-?key-?here/i,
  /dummy/i,
  /test/i,
  /local/i
];

