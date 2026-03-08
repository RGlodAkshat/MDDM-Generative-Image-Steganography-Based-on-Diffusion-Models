export default function AboutTab() {
  return (
    <div className="card p-5">
      <h2 className="mb-3 text-lg font-semibold">Method Overview</h2>
      <p className="mb-3 text-sm text-slate-600">
        This section gives a concise explanation of the MDDM pipeline, how payload embedding and recovery work, and why BER/accuracy are used as core
        evaluation metrics.
      </p>
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          MDDM hides a payload inside diffusion latent noise before image generation.
          The payload is mapped into selected latent positions (Cardan grille) using tail-separated Gaussian values.
        </p>
        <p>
          During decoding, DDIM inversion approximately recovers the initial latent. Bits are recovered from the sign at shared grille indices.
          Recovery quality is measured with bit accuracy and BER.
        </p>
        <p>
          This demo includes clean recovery, prompt/seed diversity, attack-based tamper checks, and structured provenance payload recovery.
        </p>
      </div>
    </div>
  );
}
