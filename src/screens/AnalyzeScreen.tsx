/**
 * AnalyzeScreen — the "Analyze" button.
 *
 * Runs the InferenceEngine over your journal and shows:
 *  - recurring themes
 *  - most frequent meaningful words
 *  - reflection questions (purpose, excitement, accountability)
 *
 * The engine (local Gemma or Pro cloud) is chosen by lib/inference/engine.ts.
 * Analysis input is built with RAG retrieval (lib/rag.ts) so the model only
 * sees the relevant chunks — never the whole journal dumped into context.
 */
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getEngine } from '../lib/inference/engine';
import { buildAnalysisContext } from '../lib/rag';
import { AnalysisResult } from '../lib/themes';

export default function AnalyzeScreen() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setRunning(true);
    setError(null);
    try {
      const engine = await getEngine();
      // RAG: retrieve only the relevant chunks — the "context fix".
      const context = await buildAnalysisContext();
      const res = await engine.analyze({ context, entryCount: context.entryCount });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <Text style={styles.title}>Analyze</Text>
      <Text style={styles.sub}>
        Finds patterns in your own words — themes, frequent words, and questions
        worth sitting with. Runs on your phone unless you're on Pro.
      </Text>
      <TouchableOpacity style={styles.button} onPress={analyze} disabled={running}>
        <Text style={styles.buttonText}>{running ? 'Thinking…' : 'Analyze my journal'}</Text>
      </TouchableOpacity>
      {running && <ActivityIndicator style={styles.spinner} color="#e8e6df" />}
      {error && <Text style={styles.error}>{error}</Text>}
      {result && (
        <View>
          <Text style={styles.meta}>
            via {result.engineUsed === 'local' ? 'on-device AI' : 'Pro cloud'} · {result.entryCount} entries
          </Text>
          <Text style={styles.h}>Themes</Text>
          {result.themes.map((t) => (
            <View key={t.name} style={styles.card}>
              <Text style={styles.cardTitle}>{t.name}</Text>
              <Text style={styles.cardText}>{t.summary}</Text>
            </View>
          ))}
          <Text style={styles.h}>Words you live in</Text>
          <Text style={styles.words}>
            {result.frequentWords.map((w) => `${w.word} (${w.count})`).join('  ·  ')}
          </Text>
          <Text style={styles.h}>Questions to sit with</Text>
          {result.questions.map((q, i) => (
            <Text key={i} style={styles.question}>
              {i + 1}. {q}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#2a4a3a', borderRadius: 12, marginVertical: 16, padding: 16 },
  buttonText: { color: '#e8e6df', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  card: { backgroundColor: '#17171d', borderRadius: 12, marginBottom: 8, padding: 12 },
  cardText: { color: '#b9b7ae', fontSize: 13 },
  cardTitle: { color: '#e8e6df', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  error: { color: '#ff7a7a', marginTop: 12 },
  h: { color: '#e8e6df', fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  meta: { color: '#8a8a93', fontSize: 12, marginTop: 8 },
  pad: { padding: 16 },
  question: { color: '#e8e6df', fontSize: 14, lineHeight: 22, marginBottom: 8 },
  root: { flex: 1 },
  spinner: { marginTop: 16 },
  sub: { color: '#8a8a93', marginTop: 8 },
  title: { color: '#e8e6df', fontSize: 24, fontWeight: '700' },
  words: { color: '#b9b7ae', fontSize: 13, lineHeight: 20 },
});
