import type {
  AttackDecodeResponse,
  CompareResponse,
  DemoPresetsResponse,
  DecodeProvenanceResponse,
  DecodeResponse,
  GenerateResponse,
  ProvenanceResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export function imageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

export const api = {
  health: () => request<{ status: string; device: string; model_loaded: boolean; model_id: string }>("/health"),

  demoPresets: (section?: "encode_decode" | "diversity" | "tamper" | "provenance") =>
    request<DemoPresetsResponse>(section ? `/demo-presets?section=${section}` : "/demo-presets"),

  generate: (body: Record<string, unknown>) =>
    request<GenerateResponse>("/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  decode: (body: Record<string, unknown>) =>
    request<DecodeResponse>("/decode", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  generateCompare: (body: Record<string, unknown>) =>
    request<CompareResponse>("/generate-compare", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  attackDecode: (body: Record<string, unknown>) =>
    request<AttackDecodeResponse>("/attack-decode", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  generateProvenance: (body: Record<string, unknown>) =>
    request<ProvenanceResponse>("/generate-provenance", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  decodeProvenance: (body: Record<string, unknown>) =>
    request<DecodeProvenanceResponse>("/decode-provenance", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
