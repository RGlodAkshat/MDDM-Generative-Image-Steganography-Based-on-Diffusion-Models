"use client";

import { useEffect, useMemo, useState } from "react";

import ImageCard from "@/components/ImageCard";
import MetricsPanel from "@/components/MetricsPanel";
import ProgressPanel from "@/components/ProgressPanel";
import { api, imageUrl } from "@/lib/api";
import type { CompareResponse } from "@/lib/types";

type Props = {
  onNewImageId: (id: string) => void;
};

export default function DiversityTab({ onNewImageId }: Props) {
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
      const out = await api.generateCompare({
        hidden_message: message,
        prompt_a: promptA,
        prompt_b: promptB,
        seed_a: seedA ? Number(seedA) : null,
        seed_b: seedB ? Number(seedB) : null,
      });
      setRes(out);
      setRuntimeHistory((prev) => [...prev.slice(-4), out.runtime_s]);
      out.items.forEach((it) => onNewImageId(it.image_id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="mb-3 text-base font-semibold">Same Secret, Different Visuals</h2>
        <p className="mb-3 text-sm text-slate-600">
          This section demonstrates payload-image decoupling: the same hidden payload can be embedded and recovered from visually different images by
          changing prompts and/or seeds.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <textarea className="input min-h-[74px]" value={promptA} onChange={(e) => setPromptA(e.target.value)} />
          <textarea className="input min-h-[74px]" value={promptB} onChange={(e) => setPromptB(e.target.value)} />
        </div>
        <div className="mt-3">
          <textarea className="input min-h-[70px]" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <input className="input" value={seedA} onChange={(e) => setSeedA(e.target.value)} placeholder="Seed A" />
          <input className="input" value={seedB} onChange={(e) => setSeedB(e.target.value)} placeholder="Seed B" />
          <button className="btn-primary md:col-span-2" disabled={loading} onClick={run}>
            {loading ? "Running..." : "Run Diversity Test"}
          </button>
        </div>
        <div className="mt-3">
          <ProgressPanel
            active={loading}
            phaseLabel="Diversity run: 2x generation + 2x decode"
            elapsedSec={elapsedSec}
            estimatedSec={estimatedSec}
            device={health?.device}
            extraInfo="Same secret, different prompts/seeds."
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge">Expected runtime: ~{estimatedSec.toFixed(1)}s</span>
          <span className="badge">Device: {health?.device ?? "unknown"}</span>
          {res ? <span className="badge">Last runtime: {res.runtime_s.toFixed(2)}s</span> : null}
        </div>
        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
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
