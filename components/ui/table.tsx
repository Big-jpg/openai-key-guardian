export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full border-separate border-spacing-0">{children}</table>;
}
export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="sticky top-0 bg-gray-50 z-10">{children}</thead>;
}
export function TRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={`border-t ${className}`}>{children}</tr>;
}
export function TH({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-sm font-medium px-3 py-2 border-b">{children}</th>;
}
export function TD({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-2 align-top ${mono ? "font-mono truncate" : ""}`}>{children}</td>;
}
