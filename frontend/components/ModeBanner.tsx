"use client";

import type { ExecutionMode } from "@/lib/types";

type Props = {
  mode: ExecutionMode;
};

export default function ModeBanner({ mode }: Props) {
  if (mode === "demo") {
    return (
      <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        <p className="font-medium">Demo Mode - Instant Precomputed Example</p>
        <p className="mt-1 text-emerald-100/90">
          This mode loads pre-generated results for fast presentation. Inputs are limited to preset examples.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-500/35 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
      <p className="font-medium">Custom Run - Live Generation</p>
      <p className="mt-1 text-blue-100/90">This mode runs the full Stable Diffusion generation and DDIM inversion pipeline.</p>
    </div>
  );
}
