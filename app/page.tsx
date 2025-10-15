"use client";
import useSWR, { mutate } from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Home() {
  const { data, isLoading } = useSWR("/api/metrics", fetcher, { refreshInterval: 5000 });
  const detected = data?.metrics?.detected ?? 0;
  const remediated = data?.metrics?.remediated ?? 0;
  const recent = data?.recent ?? [];
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function runScan() {
    setMsg(null);
    setRunning(true);
    try {

      const res = await fetch("/api/scan", { method: "POST" });
      if (res.status === 409) {
        // retry once with force
        const res2 = await fetch("/api/scan?force=true", { method: "POST" });
        const body2 = await res2.json();
        setMsg(res2.ok ? "Scan started (forced)" : (body2?.message || "Scan busy"));
        if (res2.ok) mutate("/api/metrics");
        setRunning(false);
        return;
      }
      const body = await res.json();
      if (!res.ok) {
        setMsg(body?.message || body?.error || "Scan failed");
      } else {
        setMsg("Scan completed.");
        // refresh metrics immediately
        mutate("/api/metrics");
      }
    } catch (e: any) {
      setMsg(e?.message || "Network error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-semibold">OpenAI-Key-Guardian</h1>
        <button
          onClick={runScan}
          disabled={running}
          className={
            "px-4 py-2 rounded border " +
            (running ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50")
          }
          title="Runs a one-off scan on the server"
        >
          {running ? "Scanning…" : "Run scan"}
        </button>
      </div>

      {msg && (
        <div className="mb-4 text-sm p-2 border rounded bg-gray-50">{msg}</div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Detected Open Environment Keys</div>
          <div className="text-4xl font-bold">{detected}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Notifications/PRs Performed</div>
          <div className="text-4xl font-bold">{remediated}</div>
        </div>
      </div>

      <h2 className="text-xl font-medium mb-2">Recent Detections (redacted)</h2>
      <div className="w-full overflow-auto">
        <table className="w-full text-sm border rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Repo</th>
              <th className="p-2 text-left">Path</th>
              <th className="p-2 text-left">Line</th>
              <th className="p-2 text-left">Snippet</th>
              <th className="p-2 text-left">Link</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && recent.length === 0 && (
              <tr className="border-t">
                <td className="p-4 text-gray-500" colSpan={5}>
                  No detections yet. Click “Run scan” to start.
                </td>
              </tr>
            )}
            {recent.map((r: any, i: number) => (
              <tr key={i} className="border-t">
                <td className="p-2">{r.repo}</td>
                <td className="p-2">{r.path}</td>
                <td className="p-2">{r.lineNumber}</td>
                <td className="p-2 font-mono truncate">{r.redacted}</td>
                <td className="p-2">
                  <a className="underline" href={r.url} target="_blank" rel="noreferrer">
                    view
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
