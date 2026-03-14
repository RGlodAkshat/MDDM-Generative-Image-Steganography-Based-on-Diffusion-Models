"use client";

import { useEffect, useMemo, useState } from "react";

import ExecutionModeSelector from "@/components/ExecutionModeSelector";
import ImageCard from "@/components/ImageCard";
import MetricsPanel from "@/components/MetricsPanel";
import ModeBanner from "@/components/ModeBanner";
import PresetSelector from "@/components/PresetSelector";
import ProgressPanel from "@/components/ProgressPanel";
import { api, imageUrl } from "@/lib/api";
import type { DecodeResponse, DemoPreset, ExecutionMode, GenerateResponse } from "@/lib/types";

type Props = {
  onNewImageId: (id: string) => void;
};

export default function EncodeDecodeTab({ onNewImageId }: Props) {
  const [mode, setMode] = useState<ExecutionMode>("demo");
  const [presets, setPresets] = useState<DemoPreset[]>([]);
  const [presetId, setPresetId] = useState("ed_base_astronaut_none");

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

  const selectedPreset = useMemo(() => presets.find((p) => p.id === presetId) ?? null, [presets, presetId]);

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
    api
      .demoPresets("encode_decode")
      .then((res) => {
        if (!mounted) return;
        const items = Array.isArray(res.presets) ? res.presets : [];
        setPresets(items);
        if (items.length > 0) {
          setPresetId(items[0].id);
        }
      })
      .catch(() => {
        if (mounted) setPresets([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "demo" || !selectedPreset) return;
    const inputs = selectedPreset.inputs || {};
    setPrompt(String(inputs.prompt ?? ""));
    setMessage(String(inputs.hidden_message ?? ""));
    setSeed(String(inputs.seed ?? ""));
    const demoEcc = String(inputs.ecc_mode ?? "none");
    setEccMode(demoEcc === "rep3" ? "rep3" : "none");
    setErr(null);
  }, [mode, selectedPreset]);

  useEffect(() => {
    if (mode !== "demo") return;
    setGen(null);
    setDec(null);
  }, [mode, presetId]);

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
    setDec(null);
    setLoading(true);
    setLoadingPhase("generating");
    try {
      const out =
        mode === "demo"
          ? await api.generate({
              mode: "demo",
              preset_id: presetId,
            })
          : await api.generate({
              mode: "custom",
              prompt,
              hidden_message: message,
              seed: seed ? Number(seed) : null,
              ecc_mode: eccMode,
            });
      setGen(out);
      if (mode === "custom") {
        setGenRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
      }
      if (mode === "custom") {
        onNewImageId(out.image_id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
      setLoadingPhase("idle");
    }
  };

  const runDecode = async () => {
    if (!gen && mode === "custom") return;
    setErr(null);
    setLoading(true);
    setLoadingPhase("decoding");
    try {
      const out =
        mode === "demo"
          ? await api.decode({
              mode: "demo",
              preset_id: presetId,
              image_id: gen?.image_id,
            })
          : await api.decode({
              mode: "custom",
              image_id: gen?.image_id,
              prompt,
            });
      setDec(out);
      if (mode === "custom") {
        setDecRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
      }
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
        <h2 className="mb-3 text-base font-semibold text-slate-100">Encode Hidden Message</h2>
        <div className="section-intro">
          <p className="font-medium text-slate-100">This section embeds a hidden payload inside diffusion-generated images using MDDM.</p>
          <p className="mt-1">
            The hidden message is converted to bits and injected into latent noise before generation. During decode, DDIM inversion reconstructs latent
            structure and recovers bits. Quality is reported with Bit Accuracy and BER.
          </p>
        </div>
        <div className="space-y-3">
          <ExecutionModeSelector value={mode} onChange={setMode} />
          <ModeBanner mode={mode} />

          {mode === "demo" ? (
            <>
              <PresetSelector presets={presets} value={presetId} onChange={setPresetId} label="Encode/Decode Demo Preset" />
              <div className="badge-success">Loaded from preset asset: {presetId}</div>
              <div className="grid gap-2">
                <div className="table-chip">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Prompt</p>
                  <p className="mt-1 text-sm text-slate-100">{prompt || "-"}</p>
                </div>
                <div className="table-chip">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Hidden Message (Preset)</p>
                  <p className="mt-1 text-sm text-slate-100">{message || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="table-chip">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Seed</p>
                    <p className="mt-1 text-sm text-slate-100">{seed || "-"}</p>
                  </div>
                  <div className="table-chip">
                    <p className="text-xs uppercase tracking-wide text-slate-400">ECC</p>
                    <p className="mt-1 text-sm text-slate-100">{String(selectedPreset?.inputs?.ecc_mode ?? eccMode)}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Prompt</label>
                <textarea className="input min-h-[80px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Hidden Message</label>
                <textarea className="input min-h-[80px]" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Seed</label>
                  <input className="input" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="optional" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">ECC</label>
                  <select className="input" value={eccMode} onChange={(e) => setEccMode(e.target.value as "none" | "rep3")}>
                    <option value="none">none</option>
                    <option value="rep3">rep3</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <details className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
            <summary className="cursor-pointer font-medium text-blue-200">Error Correcting Codes (ECC)</summary>
            <div className="mt-2 space-y-2">
              <p>ECC introduces redundancy so small decoding errors caused by distortions can be corrected at decode time.</p>
              <p>
                When ECC is enabled, parity/redundancy is added before embedding, and decoding can correct small bit flips caused by compression, blur, or
                noise.
              </p>
              <p>
                Tradeoff: higher overhead and lower payload capacity.
                <br />
                Available modes in this demo: None, Repetition, Hamming(7,4) (preset).
              </p>
            </div>
          </details>

          <div className="flex gap-2">
            <button className="btn-primary" disabled={loading || (mode === "demo" && !presetId)} onClick={runGenerate}>
              {loadingPhase === "generating" ? "Generating..." : mode === "demo" ? "Load Preset" : "Generate"}
            </button>
            <button className="btn-secondary" disabled={loading || (mode === "custom" && !gen) || (mode === "demo" && !presetId)} onClick={runDecode}>
              {loadingPhase === "decoding" ? "Decoding..." : mode === "demo" ? "Load Decode" : "Decode"}
            </button>
          </div>

          {mode === "custom" ? (
            <>
              {loadingPhase === "generating" ? <div className="badge-warn">Generating image...</div> : null}
              {loadingPhase === "decoding" ? <div className="badge-warn">Decoding payload...</div> : null}
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
            </>
          ) : null}

          {err ? <p className="text-sm text-red-400">{err}</p> : null}
        </div>
      </div>

      <div className="space-y-4">
        <ImageCard
          title="Generated Stego Image"
          src={gen ? imageUrl(gen.image_url) : undefined}
          subtitle={gen ? `image_id: ${gen.image_id}` : undefined}
          loading={mode === "custom" && loadingPhase === "generating"}
          loadingText="Image is being generated..."
        />
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">Execution Info</h3>
          <div className="flex flex-wrap gap-2">
            <span className="badge">Mode: {mode}</span>
            <span className="badge">Backend: {health ? health.status : "unknown"}</span>
            <span className="badge">Device: {health?.device ?? "unknown"}</span>
            <span className="badge">Model: {health?.model_id ? health.model_id.replace("runwayml/", "") : "unknown"}</span>
            {mode === "custom" ? (
              <>
                <span className="badge">Est. Generate Time: ~{estimatedGenSec.toFixed(1)}s</span>
                <span className="badge">Expected Wait: {expectedWaitLabel}</span>
                <span className="badge">Est. Decode Time: ~{estimatedDecSec.toFixed(1)}s</span>
                <span className="badge">Decode Wait: {expectedDecodeWaitLabel}</span>
              </>
            ) : (
              <span className="badge-success">Instant demo response target: &lt; 200ms</span>
            )}
            {gen ? <span className="badge">Last Generate: {gen.runtime_s.toFixed(2)}s</span> : null}
            {dec ? <span className="badge">Last Decode: {dec.runtime_s.toFixed(2)}s</span> : null}
          </div>
        </div>
        {dec ? <MetricsPanel metrics={dec.metrics} /> : null}
      </div>
    </div>
  );
}
