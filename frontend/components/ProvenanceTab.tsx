"use client";

import { useEffect, useMemo, useState } from "react";

import ImageCard from "@/components/ImageCard";
import MetricsPanel from "@/components/MetricsPanel";
import ProgressPanel from "@/components/ProgressPanel";
import { api, imageUrl } from "@/lib/api";
import type { DecodeProvenanceResponse, ProvenanceResponse } from "@/lib/types";

type Props = {
  onNewImageId: (id: string) => void;
};

export default function ProvenanceTab({ onNewImageId }: Props) {
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
      const out = await api.generateProvenance({
        prompt,
        experiment_id: experimentId,
        team_name: teamName,
        date,
        model_name: modelName,
        notes,
      });
      setGen(out);
      setGenRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
      onNewImageId(out.image_id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generate provenance failed");
    } finally {
      setLoading(false);
      setLoadingPhase("idle");
    }
  };

  const runDecode = async () => {
    if (!gen) return;
    setLoading(true);
    setLoadingPhase("decoding");
    setErr(null);
    try {
      const out = await api.decodeProvenance({ image_id: gen.image_id, prompt });
      setDec(out);
      setDecRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
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
        <h2 className="mb-3 text-base font-semibold">Provenance / Metadata</h2>
        <p className="mb-3 text-sm text-slate-600">
          This section embeds structured provenance metadata (experiment ID, team, date, model details) into generated images and decodes it later for
          traceability demonstration.
        </p>
        <div className="space-y-3">
          <textarea className="input min-h-[70px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <input className="input" value={experimentId} onChange={(e) => setExperimentId(e.target.value)} placeholder="Experiment ID" />
          <input className="input" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Name" />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date" />
            <input className="input" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Model" />
          </div>
          <textarea className="input min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
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
            phaseLabel={loadingPhase === "generating" ? "Generating provenance stego image" : "Decoding provenance metadata"}
            elapsedSec={elapsedSec}
            estimatedSec={loadingPhase === "generating" ? estimatedGenSec : estimatedDecSec}
            device={health?.device}
            extraInfo={`experiment_id=${experimentId}`}
          />
          <div className="flex flex-wrap gap-2">
            <span className="badge">Est. Generate Time: ~{estimatedGenSec.toFixed(1)}s</span>
            <span className="badge">Est. Decode Time: ~{estimatedDecSec.toFixed(1)}s</span>
            <span className="badge">Device: {health?.device ?? "unknown"}</span>
            {gen ? <span className="badge">Last Generate: {gen.runtime_s.toFixed(2)}s</span> : null}
            {dec ? <span className="badge">Last Decode: {dec.runtime_s.toFixed(2)}s</span> : null}
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
      </div>

      <div className="space-y-4">
        <ImageCard
          title="Provenance Stego Image"
          src={gen ? imageUrl(gen.image_url) : undefined}
          subtitle={gen ? `id: ${gen.image_id}` : undefined}
          loading={loadingPhase === "generating"}
          loadingText="Image is being generated..."
        />
        {dec ? (
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold">Recovered Metadata</h3>
            <pre className="overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">{JSON.stringify(dec.recovered_metadata, null, 2)}</pre>
          </div>
        ) : null}
        {dec ? <MetricsPanel metrics={dec.metrics} /> : null}
      </div>
    </div>
  );
}
