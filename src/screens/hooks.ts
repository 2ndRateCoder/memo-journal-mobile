/**
 * Minimal focus-effect stand-in for the scaffold.
 * TODO: delete this file and use expo-router's useFocusEffect once navigation lands.
 */
import { useEffect } from 'react';

export function useFocusEffect(fn: () => void | (() => void)) {
  useEffect(fn, [fn]);
}
