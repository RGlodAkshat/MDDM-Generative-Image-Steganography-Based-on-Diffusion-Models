"use client";

import type { DemoPreset } from "@/lib/types";

type Props = {
  label?: string;
  presets: DemoPreset[];
  value: string;
  onChange: (presetId: string) => void;
  disabled?: boolean;
};

export default function PresetSelector({
  label = "Demo Preset",
  presets,
  value,
  onChange,
  disabled = false,
}: Props) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-slate-300">{label}</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || presets.length === 0}
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
      {presets.length > 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
          <p className="font-medium text-slate-100">{presets.find((p) => p.id === value)?.subtitle ?? presets[0].subtitle}</p>
          <p className="mt-1">{presets.find((p) => p.id === value)?.description ?? presets[0].description}</p>
        </div>
      ) : null}
    </div>
  );
}
