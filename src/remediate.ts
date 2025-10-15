// src/remediate.ts
import { getOctokit } from "./github";
import { RUN_MODE, ALLOW_WRITES, COOLDOWN_DAYS } from "./policy";
import { readRecent, incrementRemediated, Detection } from "./store/fsStore";

const ISSUE_TITLE = "Security: Exposed API key detected — please rotate immediately";

function bodyForIssue(d: Detection) {
  return `Hi — automated security scanner (non-malicious) detected an exposed API key pattern in this repository.\n\n` +
    `**File:** ${d.path} (line ${d.lineNumber})\n` +
    `**Snippet (redacted):** \`${d.redacted}\`\n` +
    `**Link:** ${d.url}\n\n` +
    `**Recommended actions:**\n` +
    `1. Rotate/revoke the key in your OpenAI dashboard.\n` +
    `2. Remove the key from this repository.\n` +
    `3. Purge from Git history (git filter-repo / BFG).\n` +
    `4. Use a secrets manager; enable GitHub Secret Scanning + push protection.\n\n` +
    `This is an automated, non-malicious notice. Reply to opt-out and we'll exclude this repo.`;
}

async function cooldownOkay(octokit: ReturnType<typeof getOctokit>, owner: string, repo: string) {
  const sinceISO = new Date(Date.now() - COOLDOWN_DAYS * 86400_000).toISOString();
  const list = await octokit.request("GET /repos/{owner}/{repo}/issues", { owner, repo, state: "all", per_page: 50, since: sinceISO });
  return !list.data.some((i: { title: string }) => i.title === ISSUE_TITLE);
}

export async function runRemediator() {
  const octokit = getOctokit();
  const detections = readRecent(50);

  if (RUN_MODE === "safe") {
    console.log("RUN_MODE=safe — no writes");
    return;
  }
  if (!ALLOW_WRITES) {
    console.log("ALLOW_WRITES=false — refusing to write");
    return;
  }

  for (const d of detections) {
    const [owner, repo] = d.repo.split("/");
    if (!(await cooldownOkay(octokit, owner, repo))) {
      console.log(`cooldown active for ${d.repo}`);
      continue;
    }

    if (RUN_MODE === "notify") {
      // open an Issue
      const res = await octokit.request("POST /repos/{owner}/{repo}/issues", {
        owner, repo,
        title: ISSUE_TITLE,
        body: bodyForIssue(d)
      });
      console.log("issue #", res.data.number, "created for", d.repo);
      incrementRemediated();
      await new Promise(r => setTimeout(r, 1500));
      continue;
    }

    if (RUN_MODE === "remediate") {
      // (Optional) implement fork+PR flow here if desired; default disabled for v0.1
      console.log("remediate mode: implement fork+PR in a later version");
    }
  }
}

if (process.argv[1]?.endsWith("remediate.ts")) {
  runRemediator().catch(err => { console.error(err); process.exit(1); });
}

