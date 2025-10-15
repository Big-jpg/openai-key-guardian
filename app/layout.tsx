// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenAI-Key-Guardian",
  description: "Polite GitHub scanner for leaked OpenAI keys",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; }
          .p-6 { padding: 1.5rem; }
          .p-4 { padding: 1rem; }
          .p-2 { padding: 0.5rem; }
          .max-w-5xl { max-width: 64rem; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mb-4 { margin-bottom: 1rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .text-2xl { font-size: 1.5rem; line-height: 2rem; }
          .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
          .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .font-bold { font-weight: 700; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .gap-4 { gap: 1rem; }
          .border { border: 1px solid #e5e7eb; }
          .border-t { border-top: 1px solid #e5e7eb; }
          .rounded { border-radius: 0.25rem; }
          .bg-gray-50 { background-color: #f9fafb; }
          .text-gray-500 { color: #6b7280; }
          .w-full { width: 100%; }
          .text-left { text-align: left; }
          .underline { text-decoration: underline; }
          .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .font-mono { font-family: ui-monospace, monospace; }
          table { border-collapse: collapse; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}

