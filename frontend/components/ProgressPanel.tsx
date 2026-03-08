"use client";

type Props = {
  active: boolean;
  phaseLabel: string;
  elapsedSec: number;
  estimatedSec: number;
  device?: string | null;
  extraInfo?: string;
};

export default function ProgressPanel({
  active,
  phaseLabel,
  elapsedSec,
  estimatedSec,
  device,
  extraInfo,
}: Props) {
  if (!active) return null;

  const safeEstimate = Math.max(1, estimatedSec);
  const progressPct = Math.min((elapsedSec / safeEstimate) * 100, 97);
  const remainingSec = Math.max(safeEstimate - elapsedSec, 0);
  const isCpu = (device || "").toLowerCase().includes("cpu");

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 truncate font-medium">{phaseLabel}</div>
        <div className="shrink-0 font-semibold">{progressPct.toFixed(0)}%</div>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <span>Elapsed: {elapsedSec.toFixed(1)}s</span>
        <span>ETA: {remainingSec.toFixed(1)}s</span>
        <span>Estimate: ~{safeEstimate.toFixed(1)}s</span>
        {device ? <span>Device: {device}</span> : null}
      </div>

      <p className="mt-2 text-[11px] text-amber-700">
        {isCpu
          ? "Why slow: running Stable Diffusion generation/inversion on CPU. 30-step diffusion + inversion can take several minutes."
          : "Why slow: diffusion generation and inversion are iterative (many denoising steps), even on GPU."}
      </p>

      {extraInfo ? <p className="mt-1 text-[11px] text-amber-700">{extraInfo}</p> : null}
    </div>
  );
}
