"use client";

import { useEffect, useMemo, useState } from "react";

import ExecutionModeSelector from "@/components/ExecutionModeSelector";
import ImageCard from "@/components/ImageCard";
import MetricsPanel from "@/components/MetricsPanel";
import ModeBanner from "@/components/ModeBanner";
import PresetSelector from "@/components/PresetSelector";
import ProgressPanel from "@/components/ProgressPanel";
import { api, imageUrl } from "@/lib/api";
import type { CompareResponse, DemoPreset, ExecutionMode } from "@/lib/types";

type Props = {
  onNewImageId: (id: string) => void;
};

export default function DiversityTab({ onNewImageId }: Props) {
  const [mode, setMode] = useState<ExecutionMode>("demo");
  const [presets, setPresets] = useState<DemoPreset[]>([]);
  const [presetId, setPresetId] = useState("div_astronaut_photo_vs_watercolor");

  const [message, setMessage] = useState("MDDM demo: hidden message");
  const [promptA, setPromptA] = useState("a photo of an astronaut riding a horse, high quality");
  const [promptB, setPromptB] = useState("a watercolor painting of an astronaut riding a horse at sunset");
  const [seedA, setSeedA] = useState("101");
  const [seedB, setSeedB] = useState("202");

  const [res, setRes] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [runtimeHistory, setRuntimeHistory] = useState<number[]>([]);
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
      .demoPresets("diversity")
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
    setMessage(String(inputs.hidden_message ?? ""));
    setPromptA(String(inputs.prompt_a ?? ""));
    setPromptB(String(inputs.prompt_b ?? ""));
    setSeedA(String(inputs.seed_a ?? ""));
    setSeedB(String(inputs.seed_b ?? ""));
    setErr(null);
  }, [mode, selectedPreset]);

  useEffect(() => {
    if (mode !== "demo") return;
    setRes(null);
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
  }, [loading]);

  const estimatedSec = useMemo(() => {
    if (runtimeHistory.length > 0) {
      return runtimeHistory.reduce((a, b) => a + b, 0) / runtimeHistory.length;
    }
    if (health?.device?.toLowerCase().includes("cuda")) {
      return 45;
    }
    return 420;
  }, [runtimeHistory, health]);

  const run = async () => {
    setLoading(true);
    setErr(null);
    try {
      const out =
        mode === "demo"
          ? await api.generateCompare({
              mode: "demo",
              preset_id: presetId,
            })
          : await api.generateCompare({
              mode: "custom",
              hidden_message: message,
              prompt_a: promptA,
              prompt_b: promptB,
              seed_a: seedA ? Number(seedA) : null,
              seed_b: seedB ? Number(seedB) : null,
            });
      setRes(out);
      if (mode === "custom") {
        setRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
      }
      if (mode === "custom") {
        out.items.forEach((it) => onNewImageId(it.image_id));
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-100">Same Secret, Different Visuals</h2>
        <div className="section-intro">
          <p className="font-medium text-slate-100">This experiment demonstrates payload-image decoupling.</p>
          <p className="mt-1">
            The same hidden payload can be embedded into visually different outputs by changing prompts/seeds. Even when images look very different,
            payload recovery should remain stable.
          </p>
        </div>
        <div className="space-y-3">
          <ExecutionModeSelector value={mode} onChange={setMode} />
          <ModeBanner mode={mode} />

          {mode === "demo" ? (
            <>
              <PresetSelector presets={presets} value={presetId} onChange={setPresetId} label="Diversity Demo Preset" />
              <div className="badge-success">Loaded from preset asset: {presetId}</div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="table-chip">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Prompt A</p>
                  <p className="mt-1 text-sm text-slate-100">{promptA || "-"}</p>
                </div>
                <div className="table-chip">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Prompt B</p>
                  <p className="mt-1 text-sm text-slate-100">{promptB || "-"}</p>
                </div>
                <div className="table-chip md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Shared Hidden Message (Preset)</p>
                  <p className="mt-1 text-sm text-slate-100">{message || "-"}</p>
                </div>
                <div className="table-chip">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Seed A</p>
                  <p className="mt-1 text-sm text-slate-100">{seedA || "-"}</p>
                </div>
                <div className="table-chip">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Seed B</p>
                  <p className="mt-1 text-sm text-slate-100">{seedB || "-"}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Prompt A</label>
                  <textarea className="input min-h-[74px]" value={promptA} onChange={(e) => setPromptA(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Prompt B</label>
                  <textarea className="input min-h-[74px]" value={promptB} onChange={(e) => setPromptB(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">Shared Hidden Message</label>
                <textarea className="input min-h-[70px]" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <input className="input md:col-span-1" value={seedA} onChange={(e) => setSeedA(e.target.value)} placeholder="Seed A" title="Seed A" />
                <input className="input md:col-span-1" value={seedB} onChange={(e) => setSeedB(e.target.value)} placeholder="Seed B" title="Seed B" />
              </div>
            </>
          )}

          <button className="btn-primary" disabled={loading || (mode === "demo" && !presetId)} onClick={run}>
            {loading ? "Running..." : mode === "demo" ? "Load Preset Comparison" : "Run Diversity Test"}
          </button>

          {mode === "custom" ? (
            <>
              {loading ? <div className="badge-warn">Generating two images and decoding both...</div> : null}
              <ProgressPanel
                active={loading}
                phaseLabel="Diversity run: 2x generation + 2x decode"
                elapsedSec={elapsedSec}
                estimatedSec={estimatedSec}
                device={health?.device}
                extraInfo="Same secret, different prompts/seeds."
              />
            </>
          ) : (
            loading ? <div className="badge-success">Loading precomputed diversity case...</div> : null
          )}

          <div className="flex flex-wrap gap-2">
            <span className="badge">Mode: {mode}</span>
            <span className="badge">Device: {health?.device ?? "unknown"}</span>
            {mode === "custom" ? (
              <span className="badge">Expected runtime: ~{estimatedSec.toFixed(1)}s</span>
            ) : (
              <span className="badge-success">Instant demo response target: &lt; 200ms</span>
            )}
            {res ? <span className="badge">Last runtime: {res.runtime_s.toFixed(2)}s</span> : null}
          </div>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
        </div>
      </div>

      {res ? (
        <div className="grid gap-4 md:grid-cols-2">
          {res.items.map((item) => (
            <div key={item.image_id} className="space-y-3">
              <ImageCard
                title={item.prompt}
                src={imageUrl(item.image_url)}
                subtitle={`seed: ${item.seed} | id: ${item.image_id} | gen ${item.generate_runtime_s.toFixed(2)}s | dec ${item.decode_runtime_s.toFixed(2)}s`}
              />
              <MetricsPanel title="Decode Metrics" metrics={item.metrics} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
