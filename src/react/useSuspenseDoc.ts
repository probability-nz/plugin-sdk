import type { DocHandle } from '@automerge/automerge-repo';
import type { ZodType } from 'zod';
import { useDoc, type PeerInfo } from './useDoc';

export interface UseSuspenseDocResult<T = Record<string, unknown>, P = unknown> {
  doc: T;
  handle: DocHandle<T>;
  changeDoc: (fn: (doc: T) => void) => void;
  presence: P | null;
  setPresence: (state: P | ((prev: P | null) => P)) => void;
  peers: Record<string, PeerInfo<P>>;
}

const pending = new Map<string, Promise<void>>();

export function useSuspenseDoc<T = Record<string, unknown>, P = unknown>(
  docUrl: string,
  presenceSchema?: ZodType<P>,
): UseSuspenseDocResult<T, P> {
  const result = useDoc<T, P>(docUrl, presenceSchema);

  if (result.status === 'loading') {
    // Throw a promise to trigger Suspense
    let promise = pending.get(docUrl);
    if (!promise) {
      promise = new Promise<void>((resolve) => {
        // Will re-render when doc becomes ready/error, resolving this
        const check = setInterval(() => {
          resolve();
          clearInterval(check);
        }, 100);
      });
      pending.set(docUrl, promise);
    }
    throw promise;
  }

  // Clean up pending promise
  pending.delete(docUrl);

  if (result.status === 'error') {
    throw result.error;
  }

  return result;
}
