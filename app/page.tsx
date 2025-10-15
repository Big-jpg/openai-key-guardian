// app/page.tsx
"use client";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Detection {
  repo: string;
  path: string;
  url: string;
  lineNumber: number;
  redacted: string;
  detectedAt: string;
}

interface Metrics {
  detected: number;
  remediated: number;
  updatedAt: string;
}

interface ApiResponse {
  metrics: Metrics;
  recent: Detection[];
}

export default function Home() {
  const { data } = useSWR<ApiResponse>("/api/metrics", fetcher, { refreshInterval: 5000 });
  const detected = data?.metrics?.detected ?? 0;
  const remediated = data?.metrics?.remediated ?? 0;
  const recent = data?.recent ?? [];

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">OpenAI‑Key‑Guardian</h1>
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
          {recent.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{r.repo}</td>
              <td className="p-2">{r.path}</td>
              <td className="p-2">{r.lineNumber}</td>
              <td className="p-2 font-mono truncate">{r.redacted}</td>
              <td className="p-2">
                <a className="underline" href={r.url} target="_blank" rel="noopener noreferrer">view</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

