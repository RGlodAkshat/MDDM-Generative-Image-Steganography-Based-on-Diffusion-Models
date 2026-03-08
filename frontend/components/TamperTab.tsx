"use client";

import { useEffect, useState } from "react";

import ImageCard from "@/components/ImageCard";
import MetricsPanel from "@/components/MetricsPanel";
import ProgressPanel from "@/components/ProgressPanel";
import { api, imageUrl } from "@/lib/api";
import type { AttackDecodeResponse } from "@/lib/types";

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

export default function TamperTab({ latestImageId }: Props) {
  const [imageId, setImageId] = useState(latestImageId || "");
  const [attackType, setAttackType] = useState<(typeof ATTACKS)[number]>("jpeg");
  const [strength, setStrength] = useState("0.6");
  const [res, setRes] = useState<AttackDecodeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [runtimeHistory, setRuntimeHistory] = useState<number[]>([]);
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
    try {
      const out = await api.attackDecode({
        image_id: imageId || latestImageId,
        attack_type: attackType,
        attack_strength: Number(strength),
      });
      setRes(out);
      setRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Attack check failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="mb-3 text-base font-semibold">Tamper / Attack Check</h2>
        <p className="mb-3 text-sm text-slate-600">
          This section applies realistic image distortions (compression, blur, geometric and photometric changes) and re-runs decoding to measure
          robustness under tampering.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="input md:col-span-2" placeholder="Image ID" value={imageId} onChange={(e) => setImageId(e.target.value)} />
          <select className="input" value={attackType} onChange={(e) => setAttackType(e.target.value as (typeof ATTACKS)[number])}>
            {ATTACKS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input className="input" placeholder="strength" value={strength} onChange={(e) => setStrength(e.target.value)} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Tip: leave Image ID empty to use latest generated image.</p>
        <div className="mt-3">
          <button className="btn-primary" disabled={loading || (!imageId && !latestImageId)} onClick={run}>
            {loading ? "Running..." : "Run Attack Decode"}
          </button>
        </div>
        <div className="mt-3">
          <ProgressPanel
            active={loading}
            phaseLabel="Applying attack + inversion decode"
            elapsedSec={elapsedSec}
            estimatedSec={estimatedSec}
            device={health?.device}
            extraInfo={`Attack=${attackType}, strength=${strength}`}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge">Expected runtime: ~{estimatedSec.toFixed(1)}s</span>
          <span className="badge">Device: {health?.device ?? "unknown"}</span>
        </div>
        {res ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge">Last total runtime: {res.runtime_s.toFixed(2)}s</span>
            <span className="badge">Last decode runtime: {res.decode_runtime_s.toFixed(2)}s</span>
          </div>
        ) : null}
        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
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
