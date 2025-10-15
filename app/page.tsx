"use client";
import useSWR, { mutate } from "swr";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel, CardValue } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, THead, TRow, TH, TD } from "@/components/ui/table";

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
  const recent = metricsData?.recent ?? [];
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const config: Config = useMemo(() => cfgData?.config ?? {}, [cfgData]);
  const [localCfg, setLocalCfg] = useState<Config>({});
  useEffect(() => { setLocalCfg(config); }, [config]);

  async function runScan() {
    setMsg(null);
    setRunning(true);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      if (res.status === 409) {
        const res2 = await fetch("/api/scan?force=true", { method: "POST" });
        const body2 = await res2.json();
        setMsg(res2.ok ? "Scan started (forced)" : (body2?.message || "Scan busy"));
        if (res2.ok) mutate("/api/metrics");
        return;
      }
      const body = await res.json();
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
    <main className="p-6 max-w-6xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">OpenAI-Key-Guardian</h1>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => mutate("/api/metrics")}>Refresh</Button>
          <Button onClick={runScan} disabled={running}>{running ? "Scanning…" : "Run scan"}</Button>
        </div>
      </header>

      {msg && <div className="text-sm p-3 border rounded-2xl bg-gray-50">{msg}</div>}

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

      {/* Config panel */}
      <section className="rounded-3xl border p-5 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">Scanner Settings</h2>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setLocalCfg(config)}>Reset</Button>
            <Button onClick={saveConfig} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Mode</label>
            <div className="flex gap-2">
              {["safe","notify","remediate"].map(m => (
                <Button
                  key={m}
                  variant={localCfg.RUN_MODE === m ? "default" : "secondary"}
                  onClick={() => setLocalCfg({ ...localCfg, RUN_MODE: m as any })}
                  size="sm"
                >
                  {m}
                </Button>
              ))}
            </div>
            <Switch
              label="Allow writes"
              checked={!!localCfg.ALLOW_WRITES}
              onChange={(v) => setLocalCfg({ ...localCfg, ALLOW_WRITES: v })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-600">Search query</label>
            <input
              className="w-full border rounded-2xl p-2"
              value={localCfg.SEARCH_QUERY ?? ""}
              onChange={(e) => setLocalCfg({ ...localCfg, SEARCH_QUERY: e.target.value })}
              placeholder="OPENAI_API_KEY=sk-"
            />
            <label className="text-sm text-gray-600">Exclusions (owner/repo, comma)</label>
            <input
              className="w-full border rounded-2xl p-2"
              value={localCfg.EXCLUSIONS ?? ""}
              onChange={(e) => setLocalCfg({ ...localCfg, EXCLUSIONS: e.target.value })}
              placeholder="ownerA/repo1,ownerB/repo2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-600">Results per page</label>
            <input
              type="number"
              className="w-full border rounded-2xl p-2"
              value={localCfg.RESULTS_PER_PAGE ?? 50}
              onChange={(e) => setLocalCfg({ ...localCfg, RESULTS_PER_PAGE: Number(e.target.value) })}
              min={10} max={100}
            />
            <label className="text-sm text-gray-600">Min line length</label>
            <input
              type="number"
              className="w-full border rounded-2xl p-2"
              value={localCfg.MIN_LINE_LENGTH ?? 80}
              onChange={(e) => setLocalCfg({ ...localCfg, MIN_LINE_LENGTH: Number(e.target.value) })}
              min={20} max={400}
            />
            <label className="text-sm text-gray-600">Cooldown (days)</label>
            <input
              type="number"
              className="w-full border rounded-2xl p-2"
              value={localCfg.COOLDOWN_DAYS ?? 7}
              onChange={(e) => setLocalCfg({ ...localCfg, COOLDOWN_DAYS: Number(e.target.value) })}
              min={1} max={60}
            />
          </div>
        </div>
      </section>

      {/* Detections table */}
      <section className="rounded-3xl border p-5 bg-white shadow-sm">
        <h2 className="text-xl font-medium mb-3">Recent Detections (redacted)</h2>
        <div className="w-full overflow-auto">
          <Table>
            <THead>
              <TRow>
                <TH>Repo</TH><TH>Path</TH><TH>Line</TH><TH>Snippet</TH><TH>Link</TH>
              </TRow>
            </THead>
            <tbody>
              {recent.length === 0 ? (
                <TRow><TD mono={false} ><span className="text-gray-500">No detections yet. Click “Run scan”.</span></TD></TRow>
              ) : recent.map((r: any, i: number) => (
                <TRow key={i} className="border-t">
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
