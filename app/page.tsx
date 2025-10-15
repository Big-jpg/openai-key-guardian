"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { useEffect, useMemo, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Config = {
  RUN_MODE?: "safe" | "notify" | "remediate";
  ALLOW_WRITES?: boolean;
  SEARCH_QUERY?: string;
  RESULTS_PER_PAGE?: number;
  MIN_LINE_LENGTH?: number;
  COOLDOWN_DAYS?: number;
  EXCLUSIONS?: string;
};

type Banner = { kind: "success" | "info" | "warn"; text: string } | null;

export default function Home() {
  /** -------------------------
   * Pagination-aware metrics fetch
   * -------------------------- */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // ask the backend for enough rows to render this page stably
  const neededRows = Math.max(1, page * pageSize);
  const metricsKey = `/api/metrics?limit=${neededRows}`;

  const { data: metricsData } = useSWR(metricsKey, fetcher, {
    refreshInterval: 4000,
  });
  const { data: cfgData, mutate: refreshCfg } = useSWR("/api/config", fetcher);

  const detected = metricsData?.metrics?.detected ?? 0;
  const remediated = metricsData?.metrics?.remediated ?? 0;
  const allRecent: any[] = metricsData?.recent ?? [];

  const totalPages = Math.max(1, Math.ceil(allRecent.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const recent = useMemo(
    () => allRecent.slice((page - 1) * pageSize, page * pageSize),
    [allRecent, page, pageSize]
  );

  /** -------------------------
   * Local UI state
   * -------------------------- */
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  /** -------------------------
   * Config editing
   * -------------------------- */
  const serverCfg: Config = useMemo(() => cfgData?.config ?? {}, [cfgData]);
  const [localCfg, setLocalCfg] = useState<Config>({});
  useEffect(() => setLocalCfg(serverCfg), [serverCfg]);

  /** -------------------------
   * Actions
   * -------------------------- */
  async function runScan(force = false) {
    // clear banner, we’re (re)starting
    setBanner(null);
    setRunning(true);

    try {
      const url = force ? "/api/scan?force=true" : "/api/scan";
      const res = await fetch(url, { method: "POST" });

      // Common “already running” status from server — treat as OK/in-progress
      if (res.status === 409) {
        setBanner({ kind: "info", text: "Scan is already running — streaming results." });
        // keep polling
        return;
      }

      // Background worker accepted — results will come via metrics polling
      if (res.status === 202) {
        setBanner({ kind: "success", text: "Scan started. Results will appear as they’re found." });
        return;
      }

      // Regular success
      if (res.ok) {
        setBanner({ kind: "success", text: "Scan started. Watching for results…" });
        // nudge SWR once right away
        globalMutate(metricsKey);
        return;
      }

      // Other non-OK cases -> show message but don’t panic if a scan is already running
      let body: any = {};
      try {
        body = await res.json();
      } catch {}
      setBanner({
        kind: "warn",
        text: body?.message || body?.error || "Could not start scan. If a prior scan is running, results will continue to update.",
      });
    } catch (e: any) {
      setBanner({
        kind: "warn",
        text: e?.message || "Network error. If a scan is already in progress, results will continue to update.",
      });
    } finally {
      // We don’t know true backend state; keep UI responsive by clearing spinner shortly after.
      // Results continue streaming via metrics polling.
      setTimeout(() => setRunning(false), 800);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(localCfg),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setBanner({ kind: "success", text: "Configuration saved." });
        refreshCfg();
      } else {
        setBanner({ kind: "warn", text: body?.message || "Failed to save config" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold tracking-tight">OpenAI-Key-Guardian</div>
            <div className="hidden md:block rounded-full px-3 py-1 text-xs bg-zinc-900 border border-zinc-800 text-zinc-300">
              Leak watchdog for <span className="font-mono">OPENAI_API_KEY</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => globalMutate(metricsKey)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800 active:scale-[0.98] transition"
            >
              Refresh
            </button>
            <button
              onClick={() => runScan()}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500 bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 active:scale-[0.98] transition disabled:opacity-60"
            >
              {running && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
              )}
              {running ? "Scanning…" : "Run scan"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Inline banner */}
        {banner && (
          <div
            className={[
              "rounded-xl border px-4 py-3 text-sm",
              banner.kind === "success" && "border-emerald-700 bg-emerald-900/40",
              banner.kind === "info" && "border-sky-700 bg-sky-900/40",
              banner.kind === "warn" && "border-amber-700 bg-amber-900/40",
            ].join(" ")}
          >
            {banner.text}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-6 shadow-lg shadow-black/20">
            <div className="text-sm text-zinc-400">Detected Open Environment Keys</div>
            <div className="mt-1 text-5xl font-bold">{detected}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-6 shadow-lg shadow-black/20">
            <div className="text-sm text-zinc-400">Notifications/PRs Performed</div>
            <div className="mt-1 text-5xl font-bold">{remediated}</div>
          </div>
        </div>

        {/* Settings */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-6 shadow-lg shadow-black/20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Scanner Settings</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocalCfg(serverCfg)}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800 active:scale-[0.98] transition"
              >
                Reset
              </button>
              <button
                onClick={saveConfig}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500 bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 active:scale-[0.98] transition disabled:opacity-60"
              >
                {saving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                )}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Mode + allow writes */}
            <div className="space-y-3">
              <div className="text-sm text-zinc-400">Mode</div>
              <div className="flex flex-wrap items-center gap-2">
                {(["safe", "notify", "remediate"] as const).map((m) => {
                  const active = localCfg.RUN_MODE === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setLocalCfg({ ...localCfg, RUN_MODE: m })}
                      className={[
                        "px-3 py-1.5 rounded-full text-sm border transition",
                        active
                          ? "bg-white text-zinc-900 border-white"
                          : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              <label className="mt-2 inline-flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-indigo-600"
                  checked={!!localCfg.ALLOW_WRITES}
                  onChange={(e) =>
                    setLocalCfg({ ...localCfg, ALLOW_WRITES: e.target.checked })
                  }
                />
                <span className="text-sm">Allow writes</span>
              </label>

              <p className="text-xs text-zinc-500">
                Safe: read-only • Notify: open Issues • Remediate: guarded PR flow
              </p>
            </div>

            {/* Query + exclusions */}
            <div className="space-y-4">
              <div>
                <div className="text-sm text-zinc-400">Search query</div>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={localCfg.SEARCH_QUERY ?? ""}
                  onChange={(e) =>
                    setLocalCfg({ ...localCfg, SEARCH_QUERY: e.target.value })
                  }
                  placeholder="OPENAI_API_KEY=sk-"
                />
              </div>
              <div>
                <div className="text-sm text-zinc-400">Exclusions (owner/repo, comma)</div>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={localCfg.EXCLUSIONS ?? ""}
                  onChange={(e) =>
                    setLocalCfg({ ...localCfg, EXCLUSIONS: e.target.value })
                  }
                  placeholder="ownerA/repo1,ownerB/repo2"
                />
              </div>
            </div>

            {/* Numeric options */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-zinc-400">Results per page</div>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={localCfg.RESULTS_PER_PAGE ?? 50}
                  onChange={(e) =>
                    setLocalCfg({
                      ...localCfg,
                      RESULTS_PER_PAGE: Number(e.target.value),
                    })
                  }
                  min={10}
                  max={200}
                />
              </div>
              <div>
                <div className="text-sm text-zinc-400">Min line length</div>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={localCfg.MIN_LINE_LENGTH ?? 80}
                  onChange={(e) =>
                    setLocalCfg({
                      ...localCfg,
                      MIN_LINE_LENGTH: Number(e.target.value),
                    })
                  }
                  min={20}
                  max={400}
                />
              </div>
              <div>
                <div className="text-sm text-zinc-400">Cooldown (days)</div>
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={localCfg.COOLDOWN_DAYS ?? 7}
                  onChange={(e) =>
                    setLocalCfg({
                      ...localCfg,
                      COOLDOWN_DAYS: Number(e.target.value),
                    })
                  }
                  min={1}
                  max={60}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Detections */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-6 shadow-lg shadow-black/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent Detections (redacted)</h2>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                Rows: {allRecent.length}
              </span>

              <select
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1); // reset to first page when page size changes
                }}
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n}/page
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800 active:scale-[0.98] transition disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="text-sm text-zinc-400">
                  Page {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-800 active:scale-[0.98] transition disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-auto rounded-xl border border-zinc-800 shadow-inner shadow-black/20">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 bg-zinc-900/80 backdrop-blur">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-zinc-800 text-zinc-400">Repo</th>
                  <th className="text-left px-3 py-2 border-b border-zinc-800 text-zinc-400">Path</th>
                  <th className="text-left px-3 py-2 border-b border-zinc-800 text-zinc-400">Line</th>
                  <th className="text-left px-3 py-2 border-b border-zinc-800 text-zinc-400">Snippet</th>
                  <th className="text-left px-3 py-2 border-b border-zinc-800 text-zinc-400">Link</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-zinc-400">No detections yet. Click “Run scan”.</td>
                  </tr>
                ) : (
                  recent.map((r, i) => (
                    <tr
                      key={`${r.repo}-${r.path}-${r.lineNumber}-${i}`}
                      className="border-t border-zinc-800 hover:bg-zinc-800/60 transition"
                    >
                      <td className="px-3 py-2">{r.repo}</td>
                      <td className="px-3 py-2">{r.path}</td>
                      <td className="px-3 py-2">{r.lineNumber}</td>
                      <td className="px-3 py-2 font-mono">{r.redacted}</td>
                      <td className="px-3 py-2">
                        <a
                          className="text-indigo-400 hover:underline"
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          view
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
