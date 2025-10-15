type Props = { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string };
export function Switch({ checked, onChange, disabled, label }: Props) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        onClick={() => !disabled && onChange(!checked)}
        className={`w-11 h-6 rounded-full transition relative ${checked ? "bg-black" : "bg-gray-300"} ${disabled ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition ${checked ? "translate-x-5" : ""}`}
        />
      </span>
    </label>
  );
}
