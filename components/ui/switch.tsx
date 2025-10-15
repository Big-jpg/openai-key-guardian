type Props = { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string };
export function Switch({ checked, onChange, disabled, label }: Props) {
  return (
    <label className="inline-flex items-center gap-2 select-none">
      {label && <span className="text-sm text-[var(--muted)]">{label}</span>}
      <span
        onClick={() => !disabled && onChange(!checked)}
        className={`w-11 h-6 rounded-full transition relative ${checked ? "bg-[var(--primary)]" : "bg-gray-500/40"} ${disabled ? "opacity-50" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition ${checked ? "translate-x-5" : ""}`}
        />
      </span>
    </label>
  );
}
