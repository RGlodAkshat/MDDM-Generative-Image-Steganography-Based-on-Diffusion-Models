"use client";

import { useEffect, useMemo, useState } from "react";

import { api, imageUrl } from "@/lib/api";
import type { DecodeResponse, GenerateResponse } from "@/lib/types";
import ImageCard from "@/components/ImageCard";
import MetricsPanel from "@/components/MetricsPanel";
import ProgressPanel from "@/components/ProgressPanel";

type Props = {
  onNewImageId: (id: string) => void;
};

export default function EncodeDecodeTab({ onNewImageId }: Props) {
  const [prompt, setPrompt] = useState("a photo of an astronaut riding a horse, high quality");
  const [message, setMessage] = useState("MDDM demo: hidden message");
  const [seed, setSeed] = useState("1234");
  const [eccMode, setEccMode] = useState<"none" | "rep3">("none");

  const [gen, setGen] = useState<GenerateResponse | null>(null);
  const [dec, setDec] = useState<DecodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<"idle" | "generating" | "decoding">("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [genRuntimeHistory, setGenRuntimeHistory] = useState<number[]>([]);
  const [decRuntimeHistory, setDecRuntimeHistory] = useState<number[]>([]);
  const [health, setHealth] = useState<{ status: string; device: string; model_loaded: boolean; model_id: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .health()
      .then((h) => {
        if (mounted) setHealth(h);
      })
      .catch(() => {
        if (mounted) setHealth(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => {
      setElapsedSec((Date.now() - start) / 1000);
    }, 250);
    return () => clearInterval(t);
  }, [loading, loadingPhase]);

  const estimatedGenSec = useMemo(() => {
    if (genRuntimeHistory.length > 0) {
      return genRuntimeHistory.reduce((a, b) => a + b, 0) / genRuntimeHistory.length;
    }
    if (health?.device?.toLowerCase().includes("cuda")) {
      return 18;
    }
    // CPU fallback can be significantly slower for SD1.5 generation.
    return 180;
  }, [genRuntimeHistory, health]);

  const estimatedDecSec = useMemo(() => {
    if (decRuntimeHistory.length > 0) {
      return decRuntimeHistory.reduce((a, b) => a + b, 0) / decRuntimeHistory.length;
    }
    if (health?.device?.toLowerCase().includes("cuda")) {
      return 20;
    }
    return 210;
  }, [decRuntimeHistory, health]);

  const expectedWaitLabel = useMemo(() => {
    const low = Math.max(1, Math.floor(estimatedGenSec * 0.8));
    const high = Math.max(low + 1, Math.ceil(estimatedGenSec * 1.2));
    if (high >= 60) {
      return `${Math.max(1, Math.floor(low / 60))}-${Math.max(1, Math.ceil(high / 60))} min`;
    }
    return `${low}-${high} s`;
  }, [estimatedGenSec]);

  const expectedDecodeWaitLabel = useMemo(() => {
    const low = Math.max(1, Math.floor(estimatedDecSec * 0.8));
    const high = Math.max(low + 1, Math.ceil(estimatedDecSec * 1.2));
    if (high >= 60) {
      return `${Math.max(1, Math.floor(low / 60))}-${Math.max(1, Math.ceil(high / 60))} min`;
    }
    return `${low}-${high} s`;
  }, [estimatedDecSec]);

  const runGenerate = async () => {
    setErr(null);
    setLoading(true);
    setLoadingPhase("generating");
    setDec(null);
    try {
      const out = await api.generate({
        prompt,
        hidden_message: message,
        seed: seed ? Number(seed) : null,
        ecc_mode: eccMode,
      });
      setGen(out);
      setGenRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
      onNewImageId(out.image_id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
      setLoadingPhase("idle");
    }
  };

  const runDecode = async () => {
    if (!gen) return;
    setErr(null);
    setLoading(true);
    setLoadingPhase("decoding");
    try {
      const out = await api.decode({ image_id: gen.image_id, prompt });
      setDec(out);
      setDecRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Decode failed");
    } finally {
      setLoading(false);
      setLoadingPhase("idle");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
      <div className="card p-4">
        <h2 className="mb-3 text-base font-semibold">Encode & Decode</h2>
        <p className="mb-3 text-sm text-slate-600">
          This section embeds a hidden message into diffusion-based image generation and then recovers it through DDIM inversion. Use BER and bit
          accuracy to verify end-to-end recovery quality.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Prompt</label>
            <textarea className="input min-h-[80px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Hidden Message</label>
            <textarea className="input min-h-[80px]" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Seed</label>
              <input className="input" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="optional" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">ECC</label>
              <select className="input" value={eccMode} onChange={(e) => setEccMode(e.target.value as "none" | "rep3")}>
                <option value="none">none</option>
                <option value="rep3">rep3</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={loading} onClick={runGenerate}>
              {loadingPhase === "generating" ? "Generating..." : "Generate"}
            </button>
            <button className="btn-secondary" disabled={loading || !gen} onClick={runDecode}>
              {loadingPhase === "decoding" ? "Decoding..." : "Decode"}
            </button>
          </div>
          <ProgressPanel
            active={loading}
            phaseLabel={
              loadingPhase === "generating"
                ? "Generating stego image (DDIM denoising steps)"
                : "Running DDIM inversion + payload recovery"
            }
            elapsedSec={elapsedSec}
            estimatedSec={loadingPhase === "generating" ? estimatedGenSec : estimatedDecSec}
            device={health?.device}
            extraInfo={loadingPhase === "generating" ? `Seed=${seed || "auto"}, ECC=${eccMode}` : `Image ID=${gen?.image_id ?? "N/A"}`}
          />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
      </div>

      <div className="space-y-4">
        <ImageCard
          title="Generated Stego Image"
          src={gen ? imageUrl(gen.image_url) : undefined}
          subtitle={gen ? `image_id: ${gen.image_id}` : undefined}
          loading={loadingPhase === "generating"}
          loadingText="Image is being generated..."
        />
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Execution Info</h3>
          <div className="flex flex-wrap gap-2">
            <span className="badge">Backend: {health ? health.status : "unknown"}</span>
            <span className="badge">Device: {health?.device ?? "unknown"}</span>
            <span className="badge">
              Model: {health?.model_id ? health.model_id.replace("runwayml/", "") : "unknown"}
            </span>
            <span className="badge">Est. Generate Time: ~{estimatedGenSec.toFixed(1)}s</span>
            <span className="badge">Expected Wait: {expectedWaitLabel}</span>
            <span className="badge">Est. Decode Time: ~{estimatedDecSec.toFixed(1)}s</span>
            <span className="badge">Decode Wait: {expectedDecodeWaitLabel}</span>
            {gen ? <span className="badge">Last Generate: {gen.runtime_s.toFixed(2)}s</span> : null}
            {dec ? <span className="badge">Last Decode: {dec.runtime_s.toFixed(2)}s</span> : null}
          </div>
        </div>
        {dec ? <MetricsPanel metrics={dec.metrics} /> : null}
      </div>
    </div>
  );
}
