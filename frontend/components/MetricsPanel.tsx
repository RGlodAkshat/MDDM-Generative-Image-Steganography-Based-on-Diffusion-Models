import type { MetricsPayload } from "@/lib/types";

type Props = {
  title?: string;
  metrics: MetricsPayload;
};

export default function MetricsPanel({ title = "Recovery Metrics", metrics }: Props) {
  const pct = (metrics.bit_accuracy * 100).toFixed(2);
  const ber = metrics.ber.toFixed(6);
  const matchClass = metrics.exact_match ? "badge-success" : "badge-danger";

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">{title}</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="badge">Accuracy: {pct}%</span>
        <span className="badge">BER: {ber}</span>
        <span className="badge">Errors: {metrics.bit_errors}</span>
        <span className={matchClass}>Exact Match: {metrics.exact_match ? "Yes" : "No"}</span>
        <span className="badge">Payload: {metrics.payload_bits} bits</span>
        <span className="badge">Encoded: {metrics.encoded_bits} bits</span>
        <span className="badge">ECC: {metrics.ecc_mode}</span>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-slate-400">Recovered Message</p>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100">
          {metrics.recovered_message || "(empty)"}
        </div>
      </div>
    </div>
  );
}
