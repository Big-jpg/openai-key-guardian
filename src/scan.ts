// src/scan.ts
import { getOctokit } from "./github";
import { getPolicy } from "./policy";
import { appendDetection } from "./store/fsStore";

function looksLikeValidKeyLine(line: string, minLen: number, keyRx: RegExp, ignore: RegExp[]) {
  if (!line || line.length < minLen) return false;
  if (!keyRx.test(line)) return false;
  return !ignore.some(rx => rx.test(line));
}

async function fetchRawFile(octokit: ReturnType<typeof getOctokit>, owner: string, repo: string, path: string): Promise<string> {
  const res = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
    owner, repo, path, mediaType: { format: "raw" }
  });
  // Octokit types say data is any; on raw it is string
  return res.data as unknown as string;
}

export async function runScanOnce() {
  const { RESULTS_PER_PAGE, SEARCH_QUERY, MIN_LINE_LENGTH, KEY_LINE_REGEX, IGNORE_LINE_REGEXES, EXCLUSIONS } = getPolicy();
  const octokit = getOctokit();
  let page = 1;

  while (true) {
    const rsp = await octokit.request("GET /search/code", {
      q: `${SEARCH_QUERY} in:file`,
      per_page: RESULTS_PER_PAGE,
      page
    });

    const items = rsp.data.items ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      const full = item.repository.full_name as string;
      if (EXCLUSIONS.has(full)) continue;
      try {
        const content = await fetchRawFile(octokit, item.repository.owner.login, item.repository.name, item.path);
        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes("OPENAI_API_KEY") && looksLikeValidKeyLine(line, MIN_LINE_LENGTH, KEY_LINE_REGEX, IGNORE_LINE_REGEXES)) {
            const redacted = line.replace(/(OPENAI_API_KEY\s*[=:]\s*)sk-(?:proj-)?[A-Za-z0-9_\-]{8,}/, "$1[REDACTED-EXPOSED-KEY]");
            appendDetection({ repo: full, path: item.path, url: item.html_url, lineNumber: i + 1, redacted, detectedAt: new Date().toISOString() });
            break;
          }
        }
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        console.warn("fetch failed", item.html_url, err?.status ?? err?.message);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (page * RESULTS_PER_PAGE >= Math.min(1000, rsp.data.total_count ?? 0)) break;
    page++;
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("scan complete");
}

if (process.argv[1]?.endsWith("scan.ts")) {
  runScanOnce().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

