/**
 * RecordScreen — the big red button.
 *
 * Flow: request mic permission -> record -> on-device speech-to-text ->
 * save transcript as a dated entry in SQLite -> chunk + embed for RAG.
 */
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { insertEntry } from '../lib/db';
import { indexEntryForRag } from '../lib/rag';
import { createRecognizer } from '../lib/speech';

export default function RecordScreen() {
  const [recording, setRecording] = useState(false);
  const [partial, setPartial] = useState('');
  const recognizer = useRef(createRecognizer());

  const toggle = async () => {
    if (recording) {
      const text = await recognizer.current.stopRecording();
      setRecording(false);
      if (!text.trim()) {
        Alert.alert('Nothing heard', 'Try again — a little louder this time.');
        setPartial('');
        return;
      }
      const entryId = await insertEntry(text.trim());
      // Index in the background so the UI stays snappy.
      indexEntryForRag(entryId, text.trim()).catch(() => {});
      setPartial('');
      Alert.alert('Saved', 'Your entry is in the journal, indexed for analysis.');
    } else {
      const granted = await recognizer.current.requestPermissions();
      if (!granted) {
        Alert.alert('Microphone needed', 'Enable microphone access in Settings to record memos.');
        return;
      }
      setPartial('');
      await recognizer.current.startRecording((t) => setPartial(t));
      setRecording(true);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Say it. We'll keep it.</Text>
      <Text style={styles.sub}>Transcribed on your phone. Nothing leaves the device.</Text>
      <TouchableOpacity
        onPress={toggle}
        style={[styles.button, recording && styles.buttonActive]}
        accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
      >
        <Text style={styles.buttonText}>{recording ? '■' : '●'}</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>{recording ? 'Listening… tap to stop' : 'Tap to record a memo'}</Text>
      {partial ? <Text style={styles.partial}>{partial}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#3a2020',
    borderRadius: 80,
    height: 160,
    justifyContent: 'center',
    marginVertical: 32,
    width: 160,
  },
  buttonActive: { backgroundColor: '#a83232' },
  buttonText: { color: '#fff', fontSize: 48 },
  hint: { color: '#8a8a93', fontSize: 14 },
  partial: { color: '#e8e6df', fontStyle: 'italic', marginTop: 16, paddingHorizontal: 24, textAlign: 'center' },
  root: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  sub: { color: '#8a8a93', marginTop: 8, textAlign: 'center' },
  title: { color: '#e8e6df', fontSize: 24, fontWeight: '700', textAlign: 'center' },
});
