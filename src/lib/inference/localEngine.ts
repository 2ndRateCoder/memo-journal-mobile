/**
 * Local inference engine — the free tier. Gemma via a React Native runtime.
 *
 * ARCHITECTURE DECISION (see docs/MODEL_RESEARCH.md):
 *  - v0.1 target: llama.rn (llama.cpp bindings for React Native) loading a
 *    GGUF-quantised Gemma build. This is the only RN-ready path today with a
 *    real model ecosystem, and it needs no account, no key, no network.
 *  - v0.2+ option: a custom native module around Google's LiteRT-LM Swift API
 *    to run gemma-4-E4B-it-litert-lm directly with Metal GPU acceleration.
 *
 * Device gate: small devices get gemma-3n-E2B (~2B effective, lightest);
 * capable devices (more RAM / newer SoC) get the bigger Gemma 4 E4B build.
 * Model weights download once on Wi-Fi into the app sandbox — never bundled
 * in the IPA (see docs/ROADMAP.md for App Store size rules).
 */
import * as Device from 'expo-device';
import { AnalysisInput, AnalysisResult } from '../themes';
import { InferenceEngine, ModelDescriptor } from './types';

export type DeviceTier = 'light' | 'capable';

export const MODEL_CATALOG: Record<DeviceTier, ModelDescriptor> = {
  light: {
    kind: 'local',
    label: 'Gemma 3n E2B (on-device)',
    // UNVERIFIED: confirm an exact GGUF repo id on HuggingFace before wiring download.
    modelId: 'gemma-3n-E2B-it-q4km-gguf',
    sizeBytes: null,
  },
  capable: {
    kind: 'local',
    label: 'Gemma 4 E4B (on-device)',
    // UNVERIFIED: confirm an exact GGUF repo id on HuggingFace before wiring download.
    modelId: 'gemma-4-E4B-it-q4km-gguf',
    sizeBytes: null,
  },
};

export interface LocalModelStatus {
  descriptor: ModelDescriptor;
  state: 'not-downloaded' | 'downloading' | 'ready' | 'error';
  localPath: string | null;
}

/**
 * Heuristic device gate. TODO: replace with real checks (total RAM via a
 * native module; iPhone 12+/A14 as the rough "capable" floor to validate).
 */
export async function estimateDeviceTier(): Promise<DeviceTier> {
  const model = Device.modelName ?? '';
  // Placeholder heuristic — validate against real perf measurements.
  void model;
  return 'light';
}

export async function getModelStatus(): Promise<LocalModelStatus> {
  const tier = await estimateDeviceTier();
  // TODO: check FileSystem for the downloaded weights file.
  return { descriptor: MODEL_CATALOG[tier], localPath: null, state: 'not-downloaded' };
}

const ANALYSIS_SYSTEM_PROMPT = `You are a thoughtful journaling coach. You receive short excerpts from someone's private voice journal. Identify 3-5 recurring themes, note their most frequent meaningful words, and write 3-5 short reflection questions about purpose, excitement, and accountability. Be warm, specific, and non-clinical. Reply ONLY as JSON: {"themes":[{"name":"","summary":"","evidence":""}],"words":[{"word":"","count":0}],"questions":[""]}`;

export class LocalGemmaEngine implements InferenceEngine {
  readonly kind = 'local' as const;
  readonly descriptor: ModelDescriptor;
  private loaded = false;

  constructor(descriptor: ModelDescriptor) {
    this.descriptor = descriptor;
  }

  async isAvailable(): Promise<boolean> {
    return this.loaded;
  }

  async load(_onProgress?: (p: number) => void): Promise<void> {
    // TODO: native wiring. Intended shape with llama.rn:
    //
    //   import { initLlama } from 'llama.rn';
    //   const ctx = await initLlama({ model: localPath, n_ctx: 4096, n_gpu_layers: 99 });
    //   this.ctx = ctx;
    //
    // Requires: dev build (not Expo Go), New Architecture enabled (see app.json),
    // weights downloaded to app sandbox first. Until this is wired, analyze()
    // throws and the UI must say the local model isn't ready yet.
    throw new Error(
      'Local inference runtime not wired yet (llama.rn integration pending). See docs/MODEL_RESEARCH.md.',
    );
  }

  async analyze(_input: AnalysisInput): Promise<AnalysisResult> {
    if (!this.loaded) throw new Error('Local model not loaded.');
    // TODO: format the RAG context with the Gemma chat template, run completion,
    // parse the JSON into AnalysisResult. Keep the system prompt above.
    void ANALYSIS_SYSTEM_PROMPT;
    throw new Error('analyze() not implemented until the runtime is wired.');
  }

  async chat(_messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    throw new Error('chat() not implemented until the runtime is wired.');
  }

  async dispose(): Promise<void> {
    this.loaded = false;
    // TODO: release the llama.rn context.
  }
}
