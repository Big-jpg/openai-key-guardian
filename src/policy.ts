// src/policy.ts
import { readConfig } from "./store/configStore";

// hard defaults (env remains supported)
const D = {
  MIN_LINE_LENGTH: Number(process.env.MIN_LINE_LENGTH ?? 80),
  RESULTS_PER_PAGE: Number(process.env.RESULTS_PER_PAGE ?? 50),
  SEARCH_QUERY: process.env.SEARCH_QUERY ?? "OPENAI_API_KEY=sk-proj",
  RUN_MODE: (process.env.RUN_MODE ?? "safe") as "safe" | "notify" | "remediate",
  ALLOW_WRITES: (process.env.ALLOW_WRITES ?? "false").toLowerCase() === "true",
  COOLDOWN_DAYS: Number(process.env.COOLDOWN_DAYS ?? 7),
  EXCLUSIONS: (process.env.EXCLUSIONS ?? "")
};

export function getPolicy() {
  const c = readConfig();
  const RUN_MODE = (c.RUN_MODE ?? D.RUN_MODE) as "safe" | "notify" | "remediate";
  const ALLOW_WRITES = (c.ALLOW_WRITES ?? D.ALLOW_WRITES) === true;
  const MIN_LINE_LENGTH = Number(c.MIN_LINE_LENGTH ?? D.MIN_LINE_LENGTH);
  const RESULTS_PER_PAGE = Number(c.RESULTS_PER_PAGE ?? D.RESULTS_PER_PAGE);
  const SEARCH_QUERY = String(c.SEARCH_QUERY ?? D.SEARCH_QUERY);
  const COOLDOWN_DAYS = Number(c.COOLDOWN_DAYS ?? D.COOLDOWN_DAYS);
  const EXCLUSIONS = new Set(
    String(c.EXCLUSIONS ?? D.EXCLUSIONS)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  );

  // regex tuned for sk- and sk-proj- variants
  const KEY_LINE_REGEX = /OPENAI_API_KEY\s*[=:]\s*sk-(?:proj-)?[A-Za-z0-9_\-]{20,}/;
  const IGNORE_LINE_REGEXES = [/example/i, /your-?api-?key/i, /dummy/i, /test/i, /local/i];

  return {
    RUN_MODE, ALLOW_WRITES, MIN_LINE_LENGTH, RESULTS_PER_PAGE, SEARCH_QUERY,
    COOLDOWN_DAYS, EXCLUSIONS, KEY_LINE_REGEX, IGNORE_LINE_REGEXES
  };
}
