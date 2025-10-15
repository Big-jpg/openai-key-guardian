# OpenAI-Key-Guardian (v0.1)

Polite GitHub scanner for leaked OpenAI keys (`OPENAI_API_KEY=sk-*`, `sk-proj-*`) and similar secrets.

## Modes

The scanner operates in three distinct modes, each with different levels of interaction with target repositories:

**Safe (default):** This mode performs scanning only and writes detections to local JSONL files or artifacts. It does not create forks, open issues, or submit pull requests. This is the recommended mode for initial testing and data collection.

**Notify:** In this mode, the scanner opens GitHub Issues on repositories where exposed keys are detected. The issues contain redacted evidence and recommended remediation steps. This mode requires appropriate GitHub token permissions and must have `ALLOW_WRITES=true` configured.

**Remediate (guarded):** This advanced mode can fork repositories and open pull requests that add a `SECURITY_NOTICE.md` file. This mode is disabled by default and should only be enabled after careful consideration of the ethical and legal implications. It requires `ALLOW_WRITES=true` and appropriate GitHub permissions.

## Quick start

To get started with OpenAI-Key-Guardian, follow these steps:

First, copy the example environment file and configure your GitHub token. The token requires at minimum `code:read` and `search:read` scopes for safe mode. For notify or remediate modes, you'll also need `public_repo` scope or a GitHub App with appropriate permissions.

```bash
cp .env.example .env
# Edit .env and set GH_TOKEN
```

Next, install dependencies using your preferred package manager:

```bash
pnpm i  # or npm install / yarn install
```

To run a safe scan that only collects data locally:

```bash
pnpm scan
```

To view the dashboard showing detected keys and metrics:

```bash
pnpm dev
# Open http://localhost:3000 in your browser
```

To enable Issue notifications, set `RUN_MODE=notify` in your `.env` file. For pull request creation, set `RUN_MODE=remediate` and confirm `ALLOW_WRITES=true`.

## Environment

The scanner is configured through environment variables, which can be set in a `.env` file or passed directly:

**GH_TOKEN** – GitHub personal access token or GitHub App token with appropriate scopes. For safe mode, requires `code:read` and `search:read`. For notify/remediate modes, requires `public_repo` or equivalent permissions.

**RUN_MODE** – Operating mode of the scanner. Valid values are `safe` (default, read-only), `notify` (opens issues), or `remediate` (creates PRs). Always start with safe mode to understand the tool's behavior.

**ALLOW_WRITES** – Safety flag that must be explicitly set to `true` to enable any write operations (issues or PRs). Defaults to `false` to prevent accidental modifications.

**SEARCH_QUERY** – GitHub code search query to use for finding potential exposed keys. Default is `OPENAI_API_KEY=sk-proj` which targets the newer project-scoped OpenAI keys.

**RESULTS_PER_PAGE** – Number of search results to fetch per page. Default is 50, maximum is 100. Higher values reduce API calls but may hit rate limits faster.

**MIN_LINE_LENGTH** – Minimum line length to consider as a potential real key (helps filter out examples and documentation). Default is 80 characters.

**COOLDOWN_DAYS** – Number of days to wait between actions on the same repository. Default is 7 days. This prevents spamming maintainers with duplicate notifications.

**EXCLUSIONS** – Comma-separated list of repository full names (format: `owner/repo`) to exclude from scanning. Useful for opt-outs or known false positives.

## Ethics & ToS

This tool is designed with ethical considerations as a top priority. All detected secrets are immediately redacted in logs and notifications using the pattern `[REDACTED-EXPOSED-KEY]`. The tool prefers opening Issues over Pull Requests, as Issues are less intrusive and give repository owners full control over remediation. An opt-out mechanism is provided in every notification, allowing repository owners to exclude their projects from future scans. The tool respects GitHub's Terms of Service and API rate limits through built-in throttling and cool-down periods.

## CI

The project includes a GitHub Actions workflow (`.github/workflows/scan.yml`) that runs scheduled SAFE scans hourly. The workflow produces artifacts including `detections.jsonl` and `metrics.json` files that can be downloaded for analysis. This allows continuous monitoring without manual intervention while maintaining a read-only, non-intrusive approach.

## Architecture

The project is structured as a Next.js application with TypeScript modules for scanning and remediation. The `src/` directory contains the core scanning logic, GitHub API client, policy configuration, and file-based storage. The `app/` directory contains the Next.js dashboard with an API route that exposes metrics and recent detections. Templates for Issue and PR bodies are stored in the `templates/` directory. All detections and metrics are persisted to a `.data/` directory using JSONL format for detections and JSON for metrics.

## Future Enhancements

Version 0.2 is planned to include GraphQL search with cursors for better coverage and stable pagination. A cool-down cache keyed by repository will be added to prevent multiple issues within the cooldown window. Support for other secret types (AWS keys, Google API keys, GitHub tokens) may be added behind feature flags. The fork and PR path will only be fully implemented after legal review. Optional publishing of metrics to a GitHub Pages site is under consideration.

