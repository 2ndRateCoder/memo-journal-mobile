/**
 * The InferenceEngine contract. Both tiers (local Gemma, Pro cloud) speak this.
 * Screens only ever see this interface — never the runtime underneath.
 */
import { AnalysisInput, AnalysisResult } from '../themes';

export type EngineKind = 'local' | 'cloud';

export interface ModelDescriptor {
  /** Human label, e.g. "Gemma 3n E2B (on-device)". */
  label: string;
  /** Stable id, e.g. "gemma-3n-E2B-it-q4km" or "llama3-3-70b". */
  modelId: string;
  kind: EngineKind;
  /** Approximate download size, for the model-management UI. */
  sizeBytes: number | null;
}

export interface InferenceEngine {
  readonly kind: EngineKind;
  readonly descriptor: ModelDescriptor;
  /** True when the runtime + weights are ready to generate. */
  isAvailable(): Promise<boolean>;
  /** Load weights into memory. onProgress: 0..1 for download + init. */
  load(onProgress?: (p: number) => void): Promise<void>;
  /** The Analyze button. Input is RAG-bounded context, never the whole journal. */
  analyze(input: AnalysisInput): Promise<AnalysisResult>;
  /** Optional conversational follow-up ("tell me more about theme X"). */
  chat(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string>;
  /** Release native memory. */
  dispose(): Promise<void>;
}
