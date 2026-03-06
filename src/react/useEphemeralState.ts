import { useCallback, useMemo, useRef } from 'react';
import { useDocHandle, usePresence, type AnyDocumentId } from '@automerge/react';
import type { CursorOp, PutOp, MoveOp } from '../types';
import { getPresenceValidator, formatErrors } from '../validation';

export interface PresenceState {
  cursor?: CursorOp;
  op?: PutOp | MoveOp;
}

export interface PeerPresence {
  state: PresenceState;
  lastActiveAt: number;
  lastUpdateAt: number;
}

/**
 * Typed ephemeral state API wrapping automerge's channel-based presence.
 * The presence schema is closed — only `cursor` and `op` channels are allowed.
 */
export function useEphemeralState(docUrl: AnyDocumentId) {
  const handle = useDocHandle(docUrl, { suspense: true });

  const { peerStates, localState, update } = usePresence<PresenceState>({
    handle,
    initialState: {},
  });

  // Track last known valid state per peer for fallback
  const validPeerCache = useRef<Record<string, PresenceState>>({});

  const setState = useCallback(
    (partial: Partial<PresenceState>) => {
      // Validate the merged state before broadcasting
      const merged = { ...localState, ...partial };
      const result = getPresenceValidator().validate(merged);
      if (!result.valid) {
        throw new Error(formatErrors(result.errors));
      }

      for (const key of Object.keys(partial) as Array<keyof PresenceState>) {
        if (partial[key] !== undefined) {
          update(key, partial[key]);
        }
      }
    },
    [localState, update],
  );

  const peers = useMemo(() => {
    const result: Record<string, PeerPresence> = {};
    const cache = validPeerCache.current;
    const validator = getPresenceValidator();

    for (const peer of peerStates.peers) {
      const id = String(peer.peerId);
      const validation = validator.validate(peer.value);

      if (validation.valid) {
        cache[id] = peer.value;
        result[id] = {
          state: peer.value,
          lastActiveAt: peer.lastActiveAt,
          lastUpdateAt: peer.lastUpdateAt,
        };
      } else if (cache[id]) {
        console.warn(`Invalid presence from peer ${id}, using last valid state`);
        result[id] = {
          state: cache[id],
          lastActiveAt: peer.lastActiveAt,
          lastUpdateAt: peer.lastUpdateAt,
        };
      }
      // If no valid state ever received, peer is omitted
    }
    return result;
  }, [peerStates]);

  const state: PresenceState = localState ?? {};

  return { state, setState, peers };
}
