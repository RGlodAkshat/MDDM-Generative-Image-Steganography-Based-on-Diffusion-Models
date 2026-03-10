"use client";

import { useEffect, useMemo, useState } from "react";

import ExecutionModeSelector from "@/components/ExecutionModeSelector";
import ImageCard from "@/components/ImageCard";
import MetricsPanel from "@/components/MetricsPanel";
import ModeBanner from "@/components/ModeBanner";
import PresetSelector from "@/components/PresetSelector";
import ProgressPanel from "@/components/ProgressPanel";
import { api, imageUrl } from "@/lib/api";
import type { AttackDecodeResponse, DemoPreset, ExecutionMode, MetricsPayload } from "@/lib/types";

type Props = {
  latestImageId: string | null;
};

const ATTACKS = [
  "jpeg",
  "resize",
  "blur",
  "brightness",
  "contrast",
  "rotation",
  "crop",
  "occlusion",
] as const;

const ATTACK_DESCRIPTIONS: Record<(typeof ATTACKS)[number], string> = {
  jpeg: "JPEG Compression: reduces high-frequency image information, which may corrupt embedded signals.",
  resize: "Resize: changes pixel sampling and interpolation, which may disturb latent alignment.",
  blur: "Gaussian Blur: smooths fine details and weakens embedded signal strength.",
  brightness: "Brightness Adjustment: uniformly shifts pixel intensity values.",
  contrast: "Contrast Adjustment: changes pixel intensity distribution.",
  rotation: "Rotation: applies geometric transformation that can misalign spatial embedding.",
  crop: "Crop / Occlusion: removes parts of the image, destroying some embedded bits.",
  occlusion: "Crop / Occlusion: removes parts of the image, destroying some embedded bits.",
};

export default function TamperTab({ latestImageId }: Props) {
  const [mode, setMode] = useState<ExecutionMode>("demo");
  const [presets, setPresets] = useState<DemoPreset[]>([]);
  const [presetId, setPresetId] = useState("tamper_jpeg_q60");

  const [imageId, setImageId] = useState(latestImageId || "");
  const [attackType, setAttackType] = useState<(typeof ATTACKS)[number]>("jpeg");
  const [strength, setStrength] = useState("0.6");
  const [res, setRes] = useState<AttackDecodeResponse | null>(null);
  const [baselineMetrics, setBaselineMetrics] = useState<MetricsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [runtimeHistory, setRuntimeHistory] = useState<number[]>([]);
  const [health, setHealth] = useState<{ status: string; device: string; model_loaded: boolean; model_id: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const selectedPreset = useMemo(() => presets.find((p) => p.id === presetId) ?? null, [presets, presetId]);
  const demoAttackOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of presets) {
      const t = String(p.inputs.attack_type ?? "");
      if ((ATTACKS as readonly string[]).includes(t)) {
        set.add(t);
      }
    }
    return ATTACKS.filter((a) => set.has(a));
  }, [presets]);

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
      .demoPresets("tamper")
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
    const demoAttack = String(inputs.attack_type ?? "jpeg");
    const demoStrength = String(inputs.attack_strength ?? "1.0");
    if ((ATTACKS as readonly string[]).includes(demoAttack)) {
      setAttackType(demoAttack as (typeof ATTACKS)[number]);
    }
    setStrength(demoStrength);
    setErr(null);
  }, [mode, selectedPreset]);

  useEffect(() => {
    if (mode !== "demo") return;
    setRes(null);
  }, [mode, presetId]);

  useEffect(() => {
    if (mode !== "demo" || presets.length === 0) return;
    const matched = presets.find((p) => String(p.inputs.attack_type ?? "") === attackType);
    if (matched && matched.id !== presetId) {
      setPresetId(matched.id);
    }
  }, [attackType, mode, presetId, presets]);

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

  const estimatedSec = runtimeHistory.length
    ? runtimeHistory.reduce((a, b) => a + b, 0) / runtimeHistory.length
    : health?.device?.toLowerCase().includes("cuda")
      ? 22
      : 260;

  const run = async () => {
    setLoading(true);
    setErr(null);
    setRes(null);
    setBaselineMetrics(null);
    try {
      const out =
        mode === "demo"
          ? await api.attackDecode({
              mode: "demo",
              preset_id: presetId,
            })
          : await api.attackDecode({
              mode: "custom",
              image_id: imageId || latestImageId,
              attack_type: attackType,
              attack_strength: Number(strength),
            });
      setRes(out);
      if (mode === "custom") {
        setRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
        try {
          const base = await api.decode({ mode: "custom", image_id: out.source_image_id });
          setBaselineMetrics(base.metrics);
        } catch {
          setBaselineMetrics(null);
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Attack check failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-100">Robustness Against Image Attacks</h2>
        <div className="section-intro">
          <p className="font-medium text-slate-100">This section evaluates payload recovery robustness under image modifications.</p>
          <p className="mt-1">
            Distortions simulate real-world transformations such as compression, resizing, blur, and geometry changes. After attack, decoding is
            repeated and BER changes are measured.
          </p>
        </div>
        <div className="space-y-3">
          <ExecutionModeSelector value={mode} onChange={setMode} />
          <ModeBanner mode={mode} />

          {mode === "demo" ? (
            <>
              <PresetSelector presets={presets} value={presetId} onChange={setPresetId} label="Tamper Demo Preset" />
              <div className="badge-success">Loaded from preset asset: {presetId}</div>
            </>
          ) : (
            <input className="input" placeholder="Image ID" value={imageId} onChange={(e) => setImageId(e.target.value)} />
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <select className="input" value={attackType} onChange={(e) => setAttackType(e.target.value as (typeof ATTACKS)[number])}>
              {(mode === "demo" && demoAttackOptions.length > 0 ? demoAttackOptions : ATTACKS).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="strength"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              disabled={mode === "demo"}
            />
          </div>

          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <span className="font-medium">Attack explanation:</span> {ATTACK_DESCRIPTIONS[attackType]}
          </div>

          {mode === "custom" ? <p className="text-xs text-slate-400">Tip: leave Image ID empty to use latest generated image.</p> : null}

          <button className="btn-primary" disabled={loading || (mode === "custom" && !imageId && !latestImageId) || (mode === "demo" && !presetId)} onClick={run}>
            {loading ? "Running..." : mode === "demo" ? "Load Preset Attack Result" : "Run Attack Decode"}
          </button>

          {mode === "custom" ? (
            <>
              {loading ? <div className="badge-warn">Applying attack and decoding payload...</div> : null}
              <ProgressPanel
                active={loading}
                phaseLabel="Applying attack + inversion decode"
                elapsedSec={elapsedSec}
                estimatedSec={estimatedSec}
                device={health?.device}
                extraInfo={`Attack=${attackType}, strength=${strength}`}
              />
            </>
          ) : (
            loading ? <div className="badge-success">Loading precomputed tamper result...</div> : null
          )}

          <div className="flex flex-wrap gap-2">
            <span className="badge">Mode: {mode}</span>
            <span className="badge">Device: {health?.device ?? "unknown"}</span>
            {mode === "custom" ? (
              <span className="badge">Expected runtime: ~{estimatedSec.toFixed(1)}s</span>
            ) : (
              <span className="badge-success">Instant demo response target: &lt; 200ms</span>
            )}
          </div>

          {res ? (
            <div className="flex flex-wrap gap-2">
              <span className="badge">Last total runtime: {res.runtime_s.toFixed(2)}s</span>
              <span className="badge">Last decode runtime: {res.decode_runtime_s.toFixed(2)}s</span>
              {baselineMetrics ? <span className="badge">Baseline BER: {baselineMetrics.ber.toFixed(6)}</span> : null}
              <span className="badge-warn">Attacked BER: {res.metrics.ber.toFixed(6)}</span>
              {baselineMetrics ? (
                <span className="badge-danger">
                  BER Delta: {(res.metrics.ber - baselineMetrics.ber >= 0 ? "+" : "") + (res.metrics.ber - baselineMetrics.ber).toFixed(6)}
                </span>
              ) : null}
            </div>
          ) : null}
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
        </div>
      </div>

      {res ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <ImageCard title="Original" src={imageUrl(res.source_image_url)} subtitle={`id: ${res.source_image_id}`} />
            <ImageCard title="Attacked" src={imageUrl(res.attacked_image_url)} subtitle={`${res.attack_type} (strength=${res.attack_strength})`} />
          </div>
          <MetricsPanel metrics={res.metrics} />
        </>
      ) : null}
    </div>
  );
}
