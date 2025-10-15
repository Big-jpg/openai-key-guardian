"use client";
import useSWR, { mutate } from "swr";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel, CardValue } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, THead, TRow, TH, TD } from "@/components/ui/table";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Config = {
  RUN_MODE?: "safe" | "notify" | "remediate";
  ALLOW_WRITES?: boolean;
  SEARCH_QUERY?: string;
  RESULTS_PER_PAGE?: number;
  MIN_LINE_LENGTH?: number;
  COOLDOWN_DAYS?: number;
  EXCLUSIONS?: string;
};

export default function Home() {
  const { data: metricsData } = useSWR("/api/metrics", fetcher, { refreshInterval: 4000 });
  const { data: cfgData, mutate: refreshCfg } = useSWR("/api/config", fetcher);
  const detected = metricsData?.metrics?.detected ?? 0;
  const remediated = metricsData?.metrics?.remediated ?? 0;
  const allRecent: any[] = metricsData?.recent ?? [];

  // Pagination (client-side over recent detections)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const totalPages = Math.max(1, Math.ceil(allRecent.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const recent = useMemo(() => allRecent.slice((page - 1) * pageSize, page * pageSize), [allRecent, page, pageSize]);

  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const config: Config = useMemo(() => cfgData?.config ?? {}, [cfgData]);
  const [localCfg, setLocalCfg] = useState<Config>({});
  useEffect(() => { setLocalCfg(config); }, [config]);

  async function runScan(force = false) {
    setMsg(null);
    setRunning(true);
    try {
      const url = force ? "/api/scan?force=true" : "/api/scan";
      const res = await fetch(url, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok && res.status === 409 && !force) return runScan(true);
      setMsg(res.ok ? "Scan completed." : (body?.message || body?.error || "Scan failed"));
      if (res.ok) mutate("/api/metrics");
    } catch (e: any) {
      setMsg(e?.message || "Network error");
    } finally {
      setRunning(false);
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
      const body = await res.json();
      setMsg(res.ok ? "Configuration saved." : (body?.message || "Failed to save config"));
      if (res.ok) refreshCfg();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-6 max-w-[1200px] mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">OpenAI-Key-Guardian</h1>
          <div className="mt-1 text-sm text-[var(--muted)]">Leak watchdog for OPENAI_API_KEY</div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="secondary" onClick={() => mutate("/api/metrics")}>Refresh</Button>
          <Button onClick={() => runScan()} disabled={running}>{running ? "Scanning…" : "Run scan"}</Button>
        </div>
      </header>

      {msg && <div className="text-sm p-3 card rounded-2xl">{msg}</div>}

      <section className="grid grid-cols-2 gap-4">
        <Card>
          <CardLabel>Detected Open Environment Keys</CardLabel>
          <CardValue>{detected}</CardValue>
        </Card>
        <Card>
          <CardLabel>Notifications/PRs Performed</CardLabel>
          <CardValue>{remediated}</CardValue>
        </Card>
      </section>

      {/* Settings */}
      <section className="card rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">Scanner Settings</h2>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setLocalCfg(config)}>Reset</Button>
            <Button onClick={saveConfig} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-2">
            <label className="text-sm text-[var(--muted)]">Mode</label>
            <div className="flex gap-2">
              {(["safe","notify","remediate"] as const).map(m => (
                <Button
                  key={m}
                  variant={localCfg.RUN_MODE === m ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setLocalCfg({ ...localCfg, RUN_MODE: m })}
                >{m}</Button>
              ))}
            </div>
            <Switch
              label="Allow writes"
              checked={!!localCfg.ALLOW_WRITES}
              onChange={(v) => setLocalCfg({ ...localCfg, ALLOW_WRITES: v })}
            />
            <div className="text-xs text-[var(--muted)]">
              Safe: read-only • Notify: open Issues • Remediate: guarded PR flow
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-[var(--muted)]">Search query</label>
              <input className="input w-full" value={localCfg.SEARCH_QUERY ?? ""} onChange={(e) => setLocalCfg({ ...localCfg, SEARCH_QUERY: e.target.value })} placeholder="OPENAI_API_KEY=sk-" />
            </div>
            <div>
              <label className="text-sm text-[var(--muted)]">Exclusions (owner/repo, comma)</label>
              <input className="input w-full" value={localCfg.EXCLUSIONS ?? ""} onChange={(e) => setLocalCfg({ ...localCfg, EXCLUSIONS: e.target.value })} placeholder="ownerA/repo1,ownerB/repo2" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-[var(--muted)]">Results per page</label>
              <input type="number" className="input w-full" value={localCfg.RESULTS_PER_PAGE ?? 50} onChange={(e) => setLocalCfg({ ...localCfg, RESULTS_PER_PAGE: Number(e.target.value) })} min={10} max={100} />
            </div>
            <div>
              <label className="text-sm text-[var(--muted)]">Min line length</label>
              <input type="number" className="input w-full" value={localCfg.MIN_LINE_LENGTH ?? 80} onChange={(e) => setLocalCfg({ ...localCfg, MIN_LINE_LENGTH: Number(e.target.value) })} min={20} max={400} />
            </div>
            <div>
              <label className="text-sm text-[var(--muted)]">Cooldown (days)</label>
              <input type="number" className="input w-full" value={localCfg.COOLDOWN_DAYS ?? 7} onChange={(e) => setLocalCfg({ ...localCfg, COOLDOWN_DAYS: Number(e.target.value) })} min={1} max={60} />
            </div>
          </div>
        </div>
      </section>

      {/* Detections */}
      <section className="card rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-medium">Recent Detections (redacted)</h2>
          <div className="flex items-center gap-2">
            <span className="badge">Rows: {allRecent.length}</span>
            <select className="input" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[25,50,100,200].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
              <div className="text-sm text-[var(--muted)]">Page {page} / {totalPages}</div>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next</Button>
            </div>
          </div>
        </div>

        {/* Scrollable table */}
        <div className="max-h-[60vh] overflow-auto rounded-2xl border border-[var(--border)]">
          <Table>
            <THead>
              <TRow>
                <TH>Repo</TH><TH>Path</TH><TH>Line</TH><TH>Snippet</TH><TH>Link</TH>
              </TRow>
            </THead>
            <tbody>
              {recent.length === 0 ? (
                <TRow><TD>No detections yet. Click “Run scan”.</TD></TRow>
              ) : recent.map((r, i) => (
                <TRow key={i}>
                  <TD>{r.repo}</TD>
                  <TD>{r.path}</TD>
                  <TD>{r.lineNumber}</TD>
                  <TD mono>{r.redacted}</TD>
                  <TD><a className="underline" href={r.url} target="_blank" rel="noreferrer">view</a></TD>
                </TRow>
              ))}
            </tbody>
          </Table>
        </div>
      </section>
    </main>
  );
}
