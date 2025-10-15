export function Card({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card rounded-3xl p-5 ${className}`}>{children}</div>;
}
export function CardLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-[var(--muted)] mb-1">{children}</div>;
}
export function CardValue({ children }: { children: React.ReactNode }) {
  return <div className="text-5xl font-bold">{children}</div>;
}
