export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border shadow-sm p-5 bg-white">{children}</div>;
}
export function CardLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-gray-500 mb-1">{children}</div>;
}
export function CardValue({ children }: { children: React.ReactNode }) {
  return <div className="text-5xl font-bold">{children}</div>;
}
