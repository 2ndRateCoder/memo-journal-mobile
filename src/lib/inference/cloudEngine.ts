/**
 * Pro-tier cloud engine — Tinfoil confidential inference.
 *
 * Tinfoil (tinfoil.sh) runs frontier models inside NVIDIA secure enclaves.
 * The `tinfoil` npm SDK speaks the OpenAI chat-completions format and encrypts
 * every request with HPKE (EHBP) so that ONLY the hardware-attested enclave can
 * decrypt it — Tinfoil itself cannot read your journal. Fail-closed: if
 * attestation fails, the request fails; we never silently fall back to a
 * plaintext provider.
 *
 * ⚠️ UNVERIFIED: the tinfoil JS SDK targets Node 20+ / browsers. React Native
 * (Hermes) compatibility — especially the HPKE crypto primitives — must be
 * validated before this ships. If Hermes can't do it, the fallback is a thin
 * native module or routing through a first-party relay that never logs bodies.
 */
import { AnalysisInput, AnalysisResult, Theme } from '../themes';
import { isPro } from '../subscription';
import { InferenceEngine, ModelDescriptor } from './types';

/** Tinfoil model catalog ids (UNVERIFIED — confirm against https://docs.tinfoil.sh/models/catalog at integration time). */
export const TINFOIL_MODELS = {
  flagship: 'llama3-3-70b',
  reasoning: 'deepseek-r1-0528', // UNVERIFIED exact id
} as const;

const PRO_DESCRIPTOR: ModelDescriptor = {
  kind: 'cloud',
  label: 'Pro cloud (confidential inference)',
  modelId: TINFOIL_MODELS.flagship,
  sizeBytes: null, // nothing downloads — inference happens in the enclave
};

const ANALYSIS_SYSTEM_PROMPT = `You are a thoughtful journaling coach. You receive short excerpts from someone's private voice journal. Identify 3-5 recurring themes, note their most frequent meaningful words, and write 3-5 short reflection questions about purpose, excitement, and accountability. Be warm, specific, and non-clinical. Reply ONLY as JSON: {"themes":[{"name":"","summary":""}],"words":[{"word":"","count":0}],"questions":[""]}`;

function contextToPrompt(input: AnalysisInput): string {
  const chunks = input.context.chunks.map((c) => `- ${c.text}`).join('\n');
  return `Here are ${input.entryCount} journal entries, reduced to the ${input.context.chunks.length} most relevant excerpts:\n${chunks}`;
}

export class TinfoilCloudEngine implements InferenceEngine {
  readonly kind = 'cloud' as const;
  readonly descriptor: ModelDescriptor = PRO_DESCRIPTOR;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;

  constructor(private apiKey: string) {}

  async isAvailable(): Promise<boolean> {
    return (await isPro()) && this.client !== null;
  }

  async load(): Promise<void> {
    if (!(await isPro())) throw new Error('Pro subscription required for cloud analysis.');
    // TODO: validate `tinfoil` on Hermes before shipping (see header note).
    const { TinfoilAI } = await import('tinfoil');
    this.client = new TinfoilAI({ apiKey: this.apiKey });
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    if (!this.client) throw new Error('Cloud engine not initialised — call load() first.');
    const completion = await this.client.chat.completions.create({
      messages: [
        { content: ANALYSIS_SYSTEM_PROMPT, role: 'system' },
        { content: contextToPrompt(input), role: 'user' },
      ],
      model: this.descriptor.modelId,
      response_format: { type: 'json_object' },
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: { themes?: Theme[]; words?: { word: string; count: number }[]; questions?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Cloud model returned malformed analysis JSON.');
    }
    return {
      engineUsed: 'cloud',
      entryCount: input.entryCount,
      frequentWords: parsed.words ?? [],
      generatedAt: new Date().toISOString(),
      modelId: this.descriptor.modelId,
      questions: parsed.questions ?? [],
      themes: parsed.themes ?? [],
    };
  }

  async chat(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    if (!this.client) throw new Error('Cloud engine not initialised — call load() first.');
    const completion = await this.client.chat.completions.create({
      messages,
      model: this.descriptor.modelId,
    });
    return completion.choices[0]?.message?.content ?? '';
  }

  async dispose(): Promise<void> {
    this.client = null;
  }
}
