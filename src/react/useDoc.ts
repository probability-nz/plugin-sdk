import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { DocHandle } from '@automerge/automerge-repo';
import { Presence } from '@automerge/automerge-repo';
import type { ZodType } from 'zod';
import { useRepo } from './RepoProvider';
import { SDKError } from '../errors';

export interface PeerInfo<P> {
  state: P | null;
  lastActiveAt: number;
  lastUpdateAt: number;
}

export type UseDocResult<T = Record<string, unknown>, P = unknown> =
  | { status: 'loading' }
  | {
      status: 'ready';
      doc: T;
      handle: DocHandle<T>;
      changeDoc: (fn: (doc: T) => void) => void;
      presence: P | null;
      setPresence: (state: P | ((prev: P | null) => P)) => void;
      peers: Record<string, PeerInfo<P>>;
    }
  | { status: 'error'; error: SDKError };

interface DocSnapshot<T> {
  doc: T | undefined;
  handleState: string;
}

const AUTOMERGE_URL_RE = /^automerge:/;

export function useDoc<T = Record<string, unknown>, P = unknown>(
  docUrl: string,
  presenceSchema?: ZodType<P>,
): UseDocResult<T, P> {
  const repo = useRepo();

  // Validate URL
  if (!AUTOMERGE_URL_RE.test(docUrl)) {
    return {
      status: 'error',
      error: new SDKError('INVALID_DOC_URL', `Invalid document URL: ${docUrl}`),
    };
  }

  // Get or find handle (findWithProgress returns handle synchronously)
  const handleRef = useRef<DocHandle<T> | null>(null);
  if (!handleRef.current || handleRef.current.url !== docUrl) {
    const progress = repo.findWithProgress<T>(docUrl as any);
    handleRef.current = progress.handle;
  }
  const handle = handleRef.current!;

  // Subscribe to doc changes via useSyncExternalStore (concurrent-safe)
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const onChange = () => onStoreChange();
      handle.on('change', onChange);
      handle.on('heads-changed', onChange);
      handle.on('delete', onChange);
      return () => {
        handle.off('change', onChange);
        handle.off('heads-changed', onChange);
        handle.off('delete', onChange);
      };
    },
    [handle],
  );

  const getSnapshot = useCallback((): DocSnapshot<T> => {
    const handleState = handle.state;
    let doc: T | undefined;
    try {
      doc = handle.isReady() ? handle.doc() : undefined;
    } catch {
      doc = undefined;
    }
    return { doc, handleState };
  }, [handle]);

  // Stable reference for useSyncExternalStore
  const cachedSnapshotRef = useRef<DocSnapshot<T>>(getSnapshot());
  const getSnapshotStable = useCallback(() => {
    const next = getSnapshot();
    const prev = cachedSnapshotRef.current;
    if (prev.doc === next.doc && prev.handleState === next.handleState) {
      return prev;
    }
    cachedSnapshotRef.current = next;
    return next;
  }, [getSnapshot]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshotStable, getSnapshotStable);

  // Presence
  const presenceRef = useRef<Presence<Record<string, unknown>> | null>(null);
  const localPresenceRef = useRef<P | null>(null);
  const peersRef = useRef<Record<string, PeerInfo<P>>>({});
  const peersVersionRef = useRef(0);

  // Subscribe to presence updates
  const presenceSubscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!presenceRef.current) return () => {};
      const p = presenceRef.current;
      const onUpdate = () => {
        peersVersionRef.current++;
        onStoreChange();
      };
      p.on('update', onUpdate);
      p.on('snapshot', onUpdate);
      p.on('heartbeat', onUpdate);
      p.on('goodbye', onUpdate);
      return () => {
        p.off('update', onUpdate);
        p.off('snapshot', onUpdate);
        p.off('heartbeat', onUpdate);
        p.off('goodbye', onUpdate);
      };
    },
    [handle, snapshot.handleState],
  );

  const getPeersSnapshot = useCallback((): Record<string, PeerInfo<P>> => {
    if (!presenceRef.current) return peersRef.current;
    const view = presenceRef.current.getPeerStates();
    const result: Record<string, PeerInfo<P>> = {};
    for (const peer of view.peers) {
      let state: P | null = (peer.value as Record<string, unknown>).state as P ?? null;
      if (presenceSchema && state != null) {
        const parsed = presenceSchema.safeParse(state);
        if (parsed.success) {
          state = parsed.data;
        } else {
          console.warn(`Invalid presence from peer ${String(peer.peerId)}:`, parsed.error);
          state = null;
        }
      }
      result[String(peer.peerId)] = {
        state,
        lastActiveAt: peer.lastActiveAt,
        lastUpdateAt: peer.lastUpdateAt,
      };
    }
    peersRef.current = result;
    return result;
  }, [handle, presenceSchema, snapshot.handleState]);

  const peers = useSyncExternalStore(presenceSubscribe, getPeersSnapshot, () => ({}));

  // Start/stop presence when handle becomes ready
  useEffect(() => {
    if (snapshot.handleState !== 'ready') return;

    const p = new Presence({ handle: handle as DocHandle<any> });
    presenceRef.current = p;
    p.start({ initialState: {} });

    return () => {
      p.stop();
      presenceRef.current = null;
    };
  }, [handle, snapshot.handleState]);

  // Stable changeDoc ref
  const changeDoc = useCallback(
    (fn: (doc: T) => void) => {
      handle.change(fn);
    },
    [handle],
  );

  // Stable setPresence ref
  const setPresence = useCallback(
    (stateOrUpdater: P | ((prev: P | null) => P)) => {
      const p = presenceRef.current;
      if (!p) return;

      const next =
        typeof stateOrUpdater === 'function'
          ? (stateOrUpdater as (prev: P | null) => P)(localPresenceRef.current)
          : stateOrUpdater;

      // Validate locally — throws on failure (programmer error)
      if (presenceSchema) {
        presenceSchema.parse(next);
      }

      localPresenceRef.current = next;
      p.broadcast('state', next);
    },
    [handle, presenceSchema],
  );

  // Clear presence on page freeze (browser only)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onVisibilityChange = () => {
      const p = presenceRef.current;
      if (!p) return;
      if (document.visibilityState === 'hidden') {
        p.stop();
      } else {
        p.start({ initialState: localPresenceRef.current ? { state: localPresenceRef.current } : {} });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [handle]);

  // Map handle states to UseDocResult
  if (snapshot.handleState === 'deleted') {
    return {
      status: 'error',
      error: new SDKError('DOC_DELETED', 'Document has been deleted'),
    };
  }

  if (snapshot.handleState === 'unavailable') {
    return {
      status: 'error',
      error: new SDKError('INVALID_DOC_URL', 'Document not found'),
    };
  }

  if (!snapshot.doc || snapshot.handleState !== 'ready') {
    return { status: 'loading' };
  }

  return {
    status: 'ready',
    doc: snapshot.doc,
    handle,
    changeDoc,
    presence: localPresenceRef.current,
    setPresence,
    peers,
  };
}
