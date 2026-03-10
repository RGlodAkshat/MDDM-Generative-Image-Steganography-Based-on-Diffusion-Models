"use client";

import type { ExecutionMode } from "@/lib/types";

type Props = {
  value: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
};

export default function ExecutionModeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-300">Execution Mode</label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          className={value === "demo" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => onChange("demo")}
        >
          Demo Mode (Instant Precomputed Example)
        </button>
        <button
          type="button"
          className={value === "custom" ? "tab-btn tab-btn-active" : "tab-btn"}
          onClick={() => onChange("custom")}
        >
          Custom Run (Live Pipeline)
        </button>
      </div>
    </div>
  );
}
