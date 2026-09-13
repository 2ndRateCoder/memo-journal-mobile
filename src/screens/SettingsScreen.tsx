/**
 * SettingsScreen — tier status, model management, upgrade path.
 *
 * Free tier: local model, no account, no key. Pro tier: RevenueCat-gated,
 * routes analysis through Tinfoil confidential inference.
 */
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getModelStatus, LocalModelStatus } from '../lib/inference/localEngine';
import { getOfferings, isPro, restorePurchases } from '../lib/subscription';

export default function SettingsScreen() {
  const [pro, setPro] = useState(false);
  const [model, setModel] = useState<LocalModelStatus | null>(null);

  useEffect(() => {
    isPro().then(setPro).catch(() => setPro(false));
    getModelStatus().then(setModel).catch(() => {});
  }, []);

  const upgrade = async () => {
    try {
      const offerings = await getOfferings();
      // TODO: render a real paywall from offerings.current.availablePackages.
      Alert.alert('Pro', offerings ? 'Paywall goes here (offerings fetched).' : 'No offerings configured yet.');
    } catch {
      Alert.alert('Pro', 'Store not reachable. Check your connection and try again.');
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{pro ? 'Memo Journal Pro' : 'Memo Journal (Free)'}</Text>
        <Text style={styles.cardText}>
          {pro
            ? 'Cloud analysis via confidential inference. Your journal syncs encrypted; the server never sees plaintext.'
            : 'Free forever: on-device AI, no account, no API key. Your words never leave this phone.'}
        </Text>
        {!pro && (
          <TouchableOpacity style={styles.button} onPress={upgrade}>
            <Text style={styles.buttonText}>Go Pro — deeper analysis</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => restorePurchases().then(setPro).catch(() => {})}>
          <Text style={styles.link}>Restore purchases</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Local model</Text>
        <Text style={styles.cardText}>
          {model ? `${model.descriptor.label} — ${model.state}` : 'Checking…'}
        </Text>
        {/* TODO: download / delete model buttons with progress UI */}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy</Text>
        <Text style={styles.cardText}>
          Free tier: 100% on-device. Pro tier: requests are encrypted to a hardware
          attested enclave (Tinfoil) — even the provider can't read them. Delete the
          app to delete everything; we hold nothing.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#2a4a3a', borderRadius: 10, marginTop: 12, padding: 12 },
  buttonText: { color: '#e8e6df', fontWeight: '700', textAlign: 'center' },
  card: { backgroundColor: '#17171d', borderRadius: 12, marginBottom: 12, padding: 16 },
  cardText: { color: '#b9b7ae', fontSize: 13, lineHeight: 20, marginTop: 6 },
  cardTitle: { color: '#e8e6df', fontSize: 15, fontWeight: '700' },
  link: { color: '#8a8a93', marginTop: 10, textAlign: 'center' },
  root: { flex: 1, padding: 16 },
  title: { color: '#e8e6df', fontSize: 24, fontWeight: '700', marginBottom: 12 },
});
