/**
 * Shared types for journal analysis results.
 * Produced by InferenceEngine.analyze() on either tier.
 */

export interface Theme {
  /** Short label, e.g. "work stress", "training", "family". */
  name: string;
  /** One-to-two sentence summary of how the theme shows up. */
  summary: string;
  /** Entry ids that evidence the theme (for "show me" drill-down). */
  entryIds: number[];
}

export interface WordFreq {
  word: string;
  count: number;
}

export interface AnalysisResult {
  themes: Theme[];
  frequentWords: WordFreq[];
  /** Reflection questions aimed at purpose, excitement, accountability. */
  questions: string[];
  generatedAt: string; // ISO 8601
  entryCount: number;
  engineUsed: 'local' | 'cloud';
  /** Model identifier that produced this analysis (auditability). */
  modelId: string;
}

/** Input handed to an engine. Note: this is RAG-retrieved context, not the whole journal. */
export interface AnalysisInput {
  context: AnalysisContext;
  entryCount: number;
}

export interface AnalysisContext {
  /** Retrieved chunk texts with their entry ids — bounded, relevant-only. */
  chunks: { entryId: number; text: string; score: number }[];
  /** Total entries that exist (for the "N entries" label). */
  totalEntries: number;
}
