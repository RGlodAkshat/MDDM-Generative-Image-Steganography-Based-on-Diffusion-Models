export default function AboutTab() {
  return (
    <div className="card p-5">
      <h2 className="mb-3 text-lg font-semibold text-slate-100">MDDM Method Overview</h2>
      <div className="section-intro">
        <p className="font-medium text-slate-100">
          Diffusion models generate images by gradually denoising latent noise. MDDM embeds payload bits in the initial latent before generation.
        </p>
      </div>
      <div className="space-y-3 text-sm text-slate-300">
        <p>
          Cardan grille positions determine where bits are embedded. Tail-separated Gaussian values encode bit sign information at those positions.
        </p>
        <p>
          During decoding, DDIM inversion reconstructs an estimate of the initial latent noise. Bits are recovered from the sign at shared grille
          indices.
        </p>
        <div className="divider" />
        <p className="font-medium text-slate-100">Recovery performance is measured using:</p>
        <div className="flex flex-wrap gap-2">
          <span className="badge">Bit Accuracy</span>
          <span className="badge">Bit Error Rate (BER)</span>
        </div>
        <div className="divider" />
        <p className="font-medium text-slate-100">This demo includes:</p>
        <div className="flex flex-wrap gap-2">
          <span className="badge">Payload Embedding</span>
          <span className="badge">Diversity Tests</span>
          <span className="badge">Robustness Attacks</span>
          <span className="badge">Provenance Embedding</span>
        </div>
        <p>
          Overall, this interface is designed as a research dashboard to qualitatively and quantitatively inspect payload recovery behavior.
        </p>
      </div>
    </div>
  );
}
