import type { MetricsPayload } from "@/lib/types";

type Props = {
  title?: string;
  metrics: MetricsPayload;
};

export default function MetricsPanel({ title = "Recovery Metrics", metrics }: Props) {
  const pct = (metrics.bit_accuracy * 100).toFixed(2);
  const ber = metrics.ber.toFixed(6);

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="badge">Accuracy: {pct}%</span>
        <span className="badge">BER: {ber}</span>
        <span className="badge">Errors: {metrics.bit_errors}</span>
        <span className="badge">Exact Match: {metrics.exact_match ? "Yes" : "No"}</span>
        <span className="badge">Payload: {metrics.payload_bits} bits</span>
        <span className="badge">Encoded: {metrics.encoded_bits} bits</span>
        <span className="badge">ECC: {metrics.ecc_mode}</span>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Recovered Message</p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          {metrics.recovered_message || "(empty)"}
        </div>
      </div>
    </div>
  );
}
