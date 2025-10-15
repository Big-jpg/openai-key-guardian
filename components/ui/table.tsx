export function Table({ children }: { children: React.ReactNode }) {
  return <table className="table">{children}</table>;
}
export function THead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}
export function TRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>;
}
export function TH({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-sm font-medium">{children}</th>;
}
export function TD({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`${mono ? "font-mono" : ""}`}>{children}</td>;
}
