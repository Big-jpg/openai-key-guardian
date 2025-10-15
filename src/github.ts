// src/github.ts
import { Octokit } from "@octokit/core";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";

const MyOctokit = Octokit.plugin(throttling, retry);

export function getOctokit() {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("GH_TOKEN is not set");

  return new MyOctokit({
    auth: token,
    throttle: {
      onRateLimit: () => true,
      onSecondaryRateLimit: () => true
    }
  });
}
