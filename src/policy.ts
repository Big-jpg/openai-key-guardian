// src/policy.ts
import { readConfig } from "./store/configStore";

/** Shape of the policy used by the scanner */
export type Policy = {
  RUN_MODE: "safe" | "notify" | "remediate";
  ALLOW_WRITES: boolean;
  MIN_LINE_LENGTH: number;
  RESULTS_PER_PAGE: number;
  SEARCH_QUERY: string;
  COOLDOWN_DAYS: number;
  EXCLUSIONS: Set<string>;
  KEY_LINE_REGEX: RegExp;
  IGNORE_LINE_REGEXES: RegExp[];
};

/**
 * Runtime policy getter. Merges dashboard config (.data/config.json)
 * over sane env defaults so the scanner can read live settings.
 */
export function getPolicy(): Policy {
  const c = readConfig();

  const RUN_MODE = (c.RUN_MODE ?? (process.env.RUN_MODE ?? "safe")) as Policy["RUN_MODE"];
  const ALLOW_WRITES =
    (typeof c.ALLOW_WRITES === "boolean" ? c.ALLOW_WRITES : undefined) ??
    ((process.env.ALLOW_WRITES ?? "false").toLowerCase() === "true");

  const MIN_LINE_LENGTH = Number(
    c.MIN_LINE_LENGTH ?? Number(process.env.MIN_LINE_LENGTH ?? 80)
  );

  const RESULTS_PER_PAGE = Number(
    c.RESULTS_PER_PAGE ?? Number(process.env.RESULTS_PER_PAGE ?? 50)
  );

  const SEARCH_QUERY = String(
    c.SEARCH_QUERY ?? process.env.SEARCH_QUERY ?? "OPENAI_API_KEY=sk-proj"
  );

  const COOLDOWN_DAYS = Number(
    c.COOLDOWN_DAYS ?? Number(process.env.COOLDOWN_DAYS ?? 7)
  );

  const EXCLUSIONS = new Set(
    String(c.EXCLUSIONS ?? process.env.EXCLUSIONS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

  // Heuristic: real-looking OPENAI_API_KEY on one line
  const KEY_LINE_REGEX = /OPENAI_API_KEY\s*[=:]\s*sk-(?:proj-)?[A-Za-z0-9_\-]{20,}/;
  const IGNORE_LINE_REGEXES = [/example/i, /your-?api-?key/i, /dummy/i, /test/i, /local/i];

  return {
    RUN_MODE,
    ALLOW_WRITES,
    MIN_LINE_LENGTH,
    RESULTS_PER_PAGE,
    SEARCH_QUERY,
    COOLDOWN_DAYS,
    EXCLUSIONS,
    KEY_LINE_REGEX,
    IGNORE_LINE_REGEXES,
  };
}
