"use client";

import { useEffect, useMemo, useState } from "react";

import ExecutionModeSelector from "@/components/ExecutionModeSelector";
import ImageCard from "@/components/ImageCard";
import MetricsPanel from "@/components/MetricsPanel";
import ModeBanner from "@/components/ModeBanner";
import PresetSelector from "@/components/PresetSelector";
import ProgressPanel from "@/components/ProgressPanel";
import { api, imageUrl } from "@/lib/api";
import type { DecodeProvenanceResponse, DemoPreset, ExecutionMode, ProvenanceResponse } from "@/lib/types";

type Props = {
  onNewImageId: (id: string) => void;
};

export default function ProvenanceTab({ onNewImageId }: Props) {
  const [mode, setMode] = useState<ExecutionMode>("demo");
  const [presets, setPresets] = useState<DemoPreset[]>([]);
  const [presetId, setPresetId] = useState("prov_ie663_project");

  const [prompt, setPrompt] = useState("a cinematic photograph of a horse in fog");
  const [experimentId, setExperimentId] = useState("IE663-MT-01");
  const [teamName, setTeamName] = useState("Team MDDM");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [modelName, setModelName] = useState("runwayml/stable-diffusion-v1-5");
  const [notes, setNotes] = useState("midterm provenance demo");

  const [gen, setGen] = useState<ProvenanceResponse | null>(null);
  const [dec, setDec] = useState<DecodeProvenanceResponse | null>(null);
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
      .demoPresets("provenance")
      .then((resp) => {
        if (!mounted) return;
        const items = Array.isArray(resp.presets) ? resp.presets : [];
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
    const meta = (inputs.metadata ?? {}) as Record<string, unknown>;
    setPrompt(String(inputs.prompt ?? ""));
    setExperimentId(String(inputs.experiment_id ?? meta.experiment_id ?? ""));
    setTeamName(String(inputs.team_name ?? meta.team_name ?? ""));
    setDate(String(inputs.date ?? meta.date ?? ""));
    setModelName(String(inputs.model_name ?? meta.model_name ?? ""));
    setNotes(String(inputs.notes ?? meta.notes ?? ""));
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
    return 190;
  }, [genRuntimeHistory, health]);

  const estimatedDecSec = useMemo(() => {
    if (decRuntimeHistory.length > 0) {
      return decRuntimeHistory.reduce((a, b) => a + b, 0) / decRuntimeHistory.length;
    }
    if (health?.device?.toLowerCase().includes("cuda")) {
      return 20;
    }
    return 220;
  }, [decRuntimeHistory, health]);

  const runGenerate = async () => {
    setLoading(true);
    setLoadingPhase("generating");
    setErr(null);
    setDec(null);
    try {
      const out =
        mode === "demo"
          ? await api.generateProvenance({
              mode: "demo",
              preset_id: presetId,
            })
          : await api.generateProvenance({
              mode: "custom",
              prompt,
              experiment_id: experimentId,
              team_name: teamName,
              date,
              model_name: modelName,
              notes,
            });
      setGen(out);
      if (mode === "custom") {
        setGenRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
      }
      if (mode === "custom") {
        onNewImageId(out.image_id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generate provenance failed");
    } finally {
      setLoading(false);
      setLoadingPhase("idle");
    }
  };

  const runDecode = async () => {
    if (!gen && mode === "custom") return;
    setLoading(true);
    setLoadingPhase("decoding");
    setErr(null);
    try {
      const out =
        mode === "demo"
          ? await api.decodeProvenance({
              mode: "demo",
              preset_id: presetId,
              image_id: gen?.image_id,
            })
          : await api.decodeProvenance({
              mode: "custom",
              image_id: gen?.image_id,
              prompt,
            });
      setDec(out);
      if (mode === "custom") {
        setDecRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Decode provenance failed");
    } finally {
      setLoading(false);
      setLoadingPhase("idle");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr,1.2fr]">
      <div className="card p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-100">Metadata / Provenance Embedding</h2>
        <div className="section-intro">
          <p className="font-medium text-slate-100">This mode embeds structured metadata instead of plain secret text.</p>
          <p className="mt-1">
            Use this for model traceability, experiment identification, image authentication, and ownership watermarking.
          </p>
        </div>

        <div className="space-y-3">
          <ExecutionModeSelector value={mode} onChange={setMode} />
          <ModeBanner mode={mode} />

          {mode === "demo" ? (
            <>
              <PresetSelector presets={presets} value={presetId} onChange={setPresetId} label="Provenance Demo Preset" />
              <div className="badge-success">Loaded from preset asset: {presetId}</div>
              <div className="grid gap-2">
                <div className="table-chip">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Prompt</p>
                  <p className="mt-1 text-sm text-slate-100">{prompt || "-"}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="table-chip">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Experiment ID</p>
                    <p className="mt-1 text-sm text-slate-100">{experimentId || "-"}</p>
                  </div>
                  <div className="table-chip">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Team</p>
                    <p className="mt-1 text-sm text-slate-100">{teamName || "-"}</p>
                  </div>
                  <div className="table-chip">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Date</p>
                    <p className="mt-1 text-sm text-slate-100">{date || "-"}</p>
                  </div>
                  <div className="table-chip">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Model</p>
                    <p className="mt-1 text-sm text-slate-100">{modelName || "-"}</p>
                  </div>
                </div>
                <div className="table-chip">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Description</p>
                  <p className="mt-1 text-sm text-slate-100">{notes || "-"}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <label className="mb-1 block text-xs font-medium text-slate-300">Prompt</label>
              <textarea className="input min-h-[70px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <label className="mb-1 block text-xs font-medium text-slate-300">Experiment ID</label>
              <input className="input" value={experimentId} onChange={(e) => setExperimentId(e.target.value)} placeholder="Experiment ID" />
              <label className="mb-1 block text-xs font-medium text-slate-300">Team</label>
              <input className="input" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Date</label>
                  <input className="input" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Model</label>
                  <input className="input" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Model" />
                </div>
              </div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Description</label>
              <textarea className="input min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
            </>
          )}

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
              {loadingPhase === "generating" ? <div className="badge-warn">Generating provenance image...</div> : null}
              {loadingPhase === "decoding" ? <div className="badge-warn">Decoding provenance metadata...</div> : null}
              <ProgressPanel
                active={loading}
                phaseLabel={loadingPhase === "generating" ? "Generating provenance stego image" : "Decoding provenance metadata"}
                elapsedSec={elapsedSec}
                estimatedSec={loadingPhase === "generating" ? estimatedGenSec : estimatedDecSec}
                device={health?.device}
                extraInfo={`experiment_id=${experimentId}`}
              />
            </>
          ) : (
            loading ? <div className="badge-success">Loading precomputed provenance result...</div> : null
          )}

          <div className="flex flex-wrap gap-2">
            <span className="badge">Mode: {mode}</span>
            <span className="badge">Device: {health?.device ?? "unknown"}</span>
            {mode === "custom" ? (
              <>
                <span className="badge">Est. Generate Time: ~{estimatedGenSec.toFixed(1)}s</span>
                <span className="badge">Est. Decode Time: ~{estimatedDecSec.toFixed(1)}s</span>
              </>
            ) : (
              <span className="badge-success">Instant demo response target: &lt; 200ms</span>
            )}
            {gen ? <span className="badge">Last Generate: {gen.runtime_s.toFixed(2)}s</span> : null}
            {dec ? <span className="badge">Last Decode: {dec.runtime_s.toFixed(2)}s</span> : null}
          </div>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
        </div>
      </div>

      <div className="space-y-4">
        <ImageCard
          title="Provenance Stego Image"
          src={gen ? imageUrl(gen.image_url) : undefined}
          subtitle={gen ? `id: ${gen.image_id}` : undefined}
          loading={mode === "custom" && loadingPhase === "generating"}
          loadingText="Image is being generated..."
        />
        {dec ? (
          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-100">Recovered Metadata</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(dec.recovered_metadata).map(([k, v]) => (
                <div key={k} className="table-chip">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{k.replaceAll("_", " ")}</div>
                  <div className="mt-1 text-sm text-slate-100">{typeof v === "string" ? v : JSON.stringify(v)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {dec ? <MetricsPanel metrics={dec.metrics} /> : null}
      </div>
    </div>
  );
}
