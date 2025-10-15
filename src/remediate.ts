// src/remediate.ts
import { getPolicy } from "./policy";
import { readRecent, incrementRemediated, Detection } from "./store/fsStore";

/**
 * Minimal GitHub REST helper using fetch.
 * Requires GH_TOKEN in env (same token you use elsewhere).
 */
async function gh(
  path: string,
  init: RequestInit & { base?: string } = {}
): Promise<Response> {
  const base = init.base ?? "https://api.github.com";
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GH_TOKEN is required for notify/remediate mode");

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "openai-key-guardian",
    Authorization: `Bearer ${token}`,
  };

  // merge headers
  init.headers = { ...headers, ...(init.headers as Record<string, string>) };
  return fetch(`${base}${path}`, init);
}

const ISSUE_TITLE =
  "Security: Exposed API key detected — please rotate immediately";

function issueBody(d: Detection) {
  return [
    `We detected a likely exposed API key in this repository.`,
    ``,
    `**File**: \`${d.path}\``,
    `**Line**: ${d.lineNumber}`,
    `**Snippet** (redacted):`,
    "```text",
    d.redacted,
    "```",
    ``,
    `### What to do`,
    `1) Rotate the exposed key immediately with your provider.`,
    `2) Remove the secret from git history (BFG / git filter-repo) and move secrets to a manager.`,
    ``,
    `If this is a false positive, reply **opt-out** and we'll exclude this repo from future scans.`,
  ].join("\n");
}

export default async function runRemediation() {
  const { RUN_MODE, ALLOW_WRITES, COOLDOWN_DAYS } = getPolicy();

  if (RUN_MODE !== "notify" && RUN_MODE !== "remediate") {
    return { ok: true, skipped: "RUN_MODE is safe; nothing to write" };
  }
  if (!ALLOW_WRITES) {
    return { ok: false, message: "ALLOW_WRITES=false; refusing to create Issues/PRs" };
  }

  const cooldownDays = Number.isFinite(COOLDOWN_DAYS) ? COOLDOWN_DAYS! : 7;
  const since = new Date();
  since.setDate(since.getDate() - cooldownDays);
  const sinceIso = since.toISOString();

  const detections: Detection[] = readRecent(200);

  let created = 0;
  for (const d of detections) {
    try {
      const [owner, repo] = d.repo.split("/");
      if (!owner || !repo) continue;

      // De-dupe: search for an Issue with same title in the cooldown window
      const q = `repo:${owner}/${repo} in:title "${ISSUE_TITLE}" created:>=${sinceIso}`;
      const searchRes = await gh(
        `/search/issues?q=${encodeURIComponent(q)}&per_page=1`,
        { method: "GET" }
      );
      if (!searchRes.ok) {
        // Soft-fail on search; continue to next repo
        continue;
      }
      const search = (await searchRes.json()) as { total_count?: number };
      if ((search.total_count ?? 0) > 0) {
        continue;
      }

      // Create the Issue
      const createRes = await gh(`/repos/${owner}/${repo}/issues`, {
        method: "POST",
        body: JSON.stringify({
          title: ISSUE_TITLE,
          body: issueBody(d),
        }),
      });
      if (createRes.ok) {
        incrementRemediated();
        created += 1;
      }
      // if not ok, ignore and continue (permissions, archived, etc.)
    } catch {
      // ignore individual repo errors; move on
      continue;
    }
  }

  return { ok: true, created };
}
