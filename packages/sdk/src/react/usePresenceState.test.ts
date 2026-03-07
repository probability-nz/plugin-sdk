import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    localState: undefined as Record<string, unknown> | undefined,
    peerStatesValue: {} as Record<string, Record<string, unknown>>,
  };
  const update = vi.fn();
  return {
    state,
    update,
    useDocHandle: vi.fn(),
    usePresence: vi.fn(() => ({
      peerStates: { getStates: () => state.peerStatesValue },
      localState: state.localState,
      update,
    })),
  };
});

vi.mock('@automerge/react', () => ({
  useDocHandle: mocks.useDocHandle,
  usePresence: mocks.usePresence,
}));

import { usePresenceState } from './usePresenceState';

describe('usePresenceState', () => {
  const mockHandle = { url: 'automerge:abc' };

  beforeEach(() => {
    mocks.useDocHandle.mockReturnValue(mockHandle);
    mocks.state.localState = undefined;
    mocks.state.peerStatesValue = {};
    mocks.update.mockClear();
    mocks.usePresence.mockClear();
  });

  it('resolves handle with suspense', () => {
    renderHook(() => usePresenceState('automerge:abc' as any));
    expect(mocks.useDocHandle).toHaveBeenCalledWith('automerge:abc', { suspense: true });
  });

  it('passes handle and initialState to usePresence', () => {
    renderHook(() => usePresenceState('automerge:abc' as any));
    expect(mocks.usePresence).toHaveBeenCalledWith({
      handle: mockHandle,
      initialState: {},
    });
  });

  it('returns empty state when no local state', () => {
    mocks.state.localState = undefined;
    const { result } = renderHook(() => usePresenceState('automerge:abc' as any));
    expect(result.current.state).toEqual({});
  });

  it('returns local state from automerge presence', () => {
    mocks.state.localState = { cursor: { action: 'focus', path: ['1@abc', 'children', 0] } };
    const { result } = renderHook(() => usePresenceState('automerge:abc' as any));
    expect(result.current.state).toEqual(mocks.state.localState);
  });

  describe('setState', () => {
    it('calls update per channel for valid cursor op', () => {
      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));

      act(() => {
        result.current.setState({
          cursor: { action: 'focus', path: ['1@abc', 'position'] },
        });
      });

      expect(mocks.update).toHaveBeenCalledWith('cursor', {
        action: 'focus',
        path: ['1@abc', 'position'],
      });
    });

    it('calls update per channel for valid move op', () => {
      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));

      act(() => {
        result.current.setState({
          op: { action: 'move', path: ['1@abc'], to: ['2@def'] },
        });
      });

      expect(mocks.update).toHaveBeenCalledWith('op', {
        action: 'move',
        path: ['1@abc'],
        to: ['2@def'],
      });
    });

    it('calls update for both channels when both provided', () => {
      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));

      act(() => {
        result.current.setState({
          cursor: { action: 'focus', path: ['1@abc'] },
          op: { action: 'put', path: ['1@abc', 'name'], value: 'test' },
        });
      });

      expect(mocks.update).toHaveBeenCalledTimes(2);
      expect(mocks.update).toHaveBeenCalledWith('cursor', expect.objectContaining({ action: 'focus' }));
      expect(mocks.update).toHaveBeenCalledWith('op', expect.objectContaining({ action: 'put' }));
    });

    it('throws on invalid presence state', () => {
      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));

      expect(() => {
        act(() => {
          // @ts-expect-error — testing runtime validation
          result.current.setState({ garbage: 'data' });
        });
      }).toThrow('Schema validation failed');

      expect(mocks.update).not.toHaveBeenCalled();
    });

    it('throws on invalid cursor op', () => {
      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));

      expect(() => {
        act(() => {
          // @ts-expect-error — testing runtime validation
          result.current.setState({ cursor: { action: 'hover', path: [] } });
        });
      }).toThrow('Schema validation failed');
    });
  });

  describe('peers', () => {
    it('returns empty peers when none connected', () => {
      mocks.state.peerStatesValue = {};
      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));
      expect(result.current.peers).toEqual({});
    });

    it('includes valid peers', () => {
      mocks.state.peerStatesValue = {
        'peer-1': {
          peerId: 'peer-1',
          value: { cursor: { action: 'focus', path: ['1@abc'] } },
          lastActiveAt: 1000,
          lastSeenAt: 2000,
        },
      };

      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));

      expect(result.current.peers['peer-1']).toEqual({
        state: { cursor: { action: 'focus', path: ['1@abc'] } },
        lastActiveAt: 1000,
        lastSeenAt: 2000,
      });
    });

    it('omits peers with no valid state ever', () => {
      mocks.state.peerStatesValue = {
        'bad-peer': {
          peerId: 'bad-peer',
          value: { garbage: 'data' },
          lastActiveAt: 1000,
          lastSeenAt: 2000,
        },
      };

      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));
      expect(result.current.peers['bad-peer']).toBeUndefined();
    });

    it('uses last valid state for peers that send invalid data', () => {
      // First render: valid state
      mocks.state.peerStatesValue = {
        'peer-1': {
          peerId: 'peer-1',
          value: { cursor: { action: 'focus', path: ['1@abc'] } },
          lastActiveAt: 1000,
          lastSeenAt: 2000,
        },
      };

      const { result, rerender } = renderHook(() => usePresenceState('automerge:abc' as any));
      expect(result.current.peers['peer-1'].state).toEqual({
        cursor: { action: 'focus', path: ['1@abc'] },
      });

      // Second render: invalid state — should fall back to cached
      mocks.state.peerStatesValue = {
        'peer-1': {
          peerId: 'peer-1',
          value: { invalid: true },
          lastActiveAt: 1000,
          lastSeenAt: 3000,
        },
      };

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      rerender();

      expect(result.current.peers['peer-1'].state).toEqual({
        cursor: { action: 'focus', path: ['1@abc'] },
      });
      expect(result.current.peers['peer-1'].lastSeenAt).toBe(3000);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid presence from peer'));

      warnSpy.mockRestore();
    });

    it('handles multiple peers', () => {
      mocks.state.peerStatesValue = {
        'peer-1': {
          peerId: 'peer-1',
          value: { cursor: { action: 'focus', path: ['1@abc'] } },
          lastActiveAt: 1000,
          lastSeenAt: 2000,
        },
        'peer-2': {
          peerId: 'peer-2',
          value: { op: { action: 'move', path: ['2@def'], to: ['3@ghi'] } },
          lastActiveAt: 1500,
          lastSeenAt: 2500,
        },
      };

      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));

      expect(Object.keys(result.current.peers)).toHaveLength(2);
      expect(result.current.peers['peer-1'].state.cursor).toBeDefined();
      expect(result.current.peers['peer-2'].state.op).toBeDefined();
    });

    it('accepts peers with empty presence', () => {
      mocks.state.peerStatesValue = {
        'idle-peer': {
          peerId: 'idle-peer',
          value: {},
          lastActiveAt: 1000,
          lastSeenAt: 2000,
        },
      };

      const { result } = renderHook(() => usePresenceState('automerge:abc' as any));
      expect(result.current.peers['idle-peer'].state).toEqual({});
    });
  });
});
