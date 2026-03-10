export type ECCMode = "none" | "rep3" | "hamming74";
export type ExecutionMode = "demo" | "custom";

export type DemoPreset = {
  id: string;
  section: "encode_decode" | "diversity" | "tamper" | "provenance";
  title: string;
  subtitle: string;
  description: string;
  asset_dir?: string;
  inputs: Record<string, unknown>;
};

export type DemoPresetsResponse = {
  section?: string;
  presets: DemoPreset[] | Record<string, DemoPreset[]>;
};

export type MetricsPayload = {
  recovered_message: string;
  bit_accuracy: number;
  ber: number;
  exact_match: boolean;
  bit_errors: number;
  payload_bits: number;
  encoded_bits: number;
  ecc_mode: ECCMode;
};

export type GenerateResponse = {
  image_id: string;
  image_url: string;
  prompt: string;
  seed: number;
  payload_bits: number;
  encoded_bits: number;
  ecc_mode: ECCMode;
  runtime_s: number;
};

export type DecodeResponse = {
  image_id: string;
  image_url: string;
  metrics: MetricsPayload;
  runtime_s: number;
};

export type CompareItem = {
  image_id: string;
  image_url: string;
  prompt: string;
  seed: number;
  metrics: MetricsPayload;
  generate_runtime_s: number;
  decode_runtime_s: number;
};

export type CompareResponse = {
  items: CompareItem[];
  runtime_s: number;
};

export type AttackDecodeResponse = {
  source_image_id: string;
  source_image_url: string;
  attacked_image_id: string;
  attacked_image_url: string;
  attack_type: string;
  attack_strength: number;
  metrics: MetricsPayload;
  decode_runtime_s: number;
  runtime_s: number;
};

export type ProvenanceResponse = {
  image_id: string;
  image_url: string;
  encoded_metadata: Record<string, unknown>;
  payload_bits: number;
  encoded_bits: number;
  runtime_s: number;
};

export type DecodeProvenanceResponse = {
  image_id: string;
  image_url: string;
  recovered_metadata: Record<string, unknown>;
  parse_ok: boolean;
  metrics: MetricsPayload;
  runtime_s: number;
};
