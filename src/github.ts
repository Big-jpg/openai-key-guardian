// src/github.ts
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";

const MyOctokit = Octokit.plugin(throttling, retry);

export function getOctokit() {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("GH_TOKEN is required");
  return new MyOctokit({
    auth: token,
    request: { timeout: 60_000 },
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        if (retryCount < 2) return true; // retry
        console.warn(`Rate limit hit for ${options.method} ${options.url}`);
        return false;
      },
      onSecondaryRateLimit: (retryAfter, options) => {
        console.warn(`Secondary rate limit: ${options.method} ${options.url}`);
      }
    }
  });
}

