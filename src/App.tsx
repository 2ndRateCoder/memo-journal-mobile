/**
 * Memo Journal — App entry.
 *
 * Simple tab navigation (useState) for the v0.1 scaffold. When the screen
 * count grows, migrate to expo-router. The app boots into the Record screen:
 * talk -> transcript -> dated journal entry -> RAG-indexed for analysis.
 */
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { initDb } from './lib/db';
import { initializePurchases } from './lib/subscription';
import AnalyzeScreen from './screens/AnalyzeScreen';
import RecordScreen from './screens/RecordScreen';
import SettingsScreen from './screens/SettingsScreen';
import TimelineScreen from './screens/TimelineScreen';

type Tab = 'record' | 'timeline' | 'analyze' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'record', label: '● Record' },
  { id: 'timeline', label: 'Journal' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('record');
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        // RevenueCat is best-effort at boot; failures leave the user on the free tier.
        try {
          await initializePurchases();
        } catch {
          /* free tier fallback */
        }
        setReady(true);
      } catch (e) {
        setBootError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (bootError) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>Couldn't open the local journal database.{"\n"}{bootError}</Text>
      </SafeAreaView>
    );
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Opening your journal…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        {tab === 'record' && <RecordScreen />}
        {tab === 'timeline' && <TimelineScreen />}
        {tab === 'analyze' && <AnalyzeScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>
      <View style={styles.tabbar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={styles.tab}>
            <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  center: { alignItems: 'center', backgroundColor: '#0e0e12', flex: 1, justifyContent: 'center', padding: 24 },
  error: { color: '#ff7a7a', textAlign: 'center' },
  muted: { color: '#8a8a93' },
  root: { backgroundColor: '#0e0e12', flex: 1 },
  tab: { flex: 1, paddingVertical: 14 },
  tabLabel: { color: '#8a8a93', fontSize: 14, textAlign: 'center' },
  tabLabelActive: { color: '#e8e6df', fontWeight: '700' },
  tabbar: { borderTopColor: '#26262e', borderTopWidth: 1, flexDirection: 'row' },
});
