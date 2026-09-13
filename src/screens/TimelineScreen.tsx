/**
 * TimelineScreen — scroll your entries by date.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { deleteEntry, getEntries, JournalEntry } from '../lib/db';
import { useFocusEffect } from './hooks'; // TODO: replace with expo-router focus hook

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TimelineScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const refresh = useCallback(async () => {
    setEntries(await getEntries());
  }, []);

  useFocusEffect(refresh);

  const onDelete = (id: number) => {
    // TODO: confirm dialog. Deleting an entry also deletes its chunks/embeddings (FK cascade).
    deleteEntry(id).then(refresh).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Journal</Text>
      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        ListEmptyComponent={<Text style={styles.empty}>No entries yet. Go mumble into the mic.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              <TouchableOpacity onPress={() => onDelete(item.id)}>
                <Text style={styles.delete}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#17171d', borderRadius: 12, marginBottom: 12, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { color: '#8a8a93', fontSize: 12 },
  delete: { color: '#ff7a7a', fontSize: 12 },
  empty: { color: '#8a8a93', marginTop: 48, textAlign: 'center' },
  root: { flex: 1, padding: 16 },
  text: { color: '#e8e6df', fontSize: 15, lineHeight: 22 },
  title: { color: '#e8e6df', fontSize: 24, fontWeight: '700', marginBottom: 12 },
});
