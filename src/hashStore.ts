import type { HashState } from './types';
import { create } from 'zustand';

export type { HashContext, HashState, JsonValue } from './types';

const parseHash = (): Partial<HashState> => {
  const raw = location.hash.slice(1);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(decodeURIComponent(raw)) as HashState;
  } catch {
    return {};
  }
};

const writeHash = (state: Partial<HashState>) => {
  const hash = encodeURIComponent(JSON.stringify(state));
  history.replaceState(null, '', `#${hash}`);
};

export const useHashStore = create<Partial<HashState>>()(parseHash);

useHashStore.subscribe(writeHash);

if (typeof window !== 'undefined') {
  addEventListener('hashchange', () => {
    useHashStore.setState(parseHash(), true);
  });
}
