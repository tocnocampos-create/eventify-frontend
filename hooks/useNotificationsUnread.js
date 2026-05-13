import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'notifications_unread';

// Module-level cache + listeners so all hook instances stay in sync
// without needing a React Context.
const listeners = new Set();
let cachedValue = false;

async function readStored() {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(KEY) === 'true';
    return (await SecureStore.getItemAsync(KEY)) === 'true';
  } catch {
    return false;
  }
}

async function writeStored(val) {
  try {
    const s = val ? 'true' : 'false';
    if (Platform.OS === 'web') localStorage.setItem(KEY, s);
    else await SecureStore.setItemAsync(KEY, s);
  } catch {}
}

function broadcast(val) {
  cachedValue = val;
  listeners.forEach((cb) => cb(val));
}

export function useNotificationsUnread() {
  const [isUnread, setIsUnread] = useState(cachedValue);

  useEffect(() => {
    // Hydrate from storage on first mount
    readStored().then((v) => {
      cachedValue = v;
      setIsUnread(v);
    });

    const listener = (val) => setIsUnread(val);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const markRead = useCallback(() => {
    writeStored(false);
    broadcast(false);
  }, []);

  const markUnread = useCallback(() => {
    writeStored(true);
    broadcast(true);
  }, []);

  return { isUnread, markRead, markUnread };
}
