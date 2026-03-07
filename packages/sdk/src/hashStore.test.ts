import type { AutomergeUrl } from '@probability-nz/plugin-types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useHashStore } from './hashStore';

const setHash = (state: Record<string, unknown>) => {
  location.hash = encodeURIComponent(JSON.stringify(state));
};

describe('hashStore', () => {
  beforeEach(() => {
    location.hash = '';
    useHashStore.setState({}, true);
  });

  afterEach(() => {
    location.hash = '';
  });

  it('parses valid hash JSON into store state', () => {
    setHash({
      context: {
        doc: 'automerge:abc123',
        sync: ['wss://sync.example.com'],
      },
    });
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const state = useHashStore.getState();
    expect(state.context?.doc).toBe('automerge:abc123');
    expect(state.context?.sync).toEqual(['wss://sync.example.com']);
  });

  it('handles missing hash (empty state)', () => {
    location.hash = '';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const state = useHashStore.getState();
    expect(state).toEqual({});
  });

  it('handles malformed hash JSON', () => {
    location.hash = 'not-valid-json';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const state = useHashStore.getState();
    expect(state).toEqual({});
  });

  it('supports arbitrary keys', () => {
    setHash({ foo: 42, bar: [1, 2, 3] });
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const state = useHashStore.getState();
    expect(state.foo).toBe(42);
    expect(state.bar).toEqual([1, 2, 3]);
  });

  it('setState writes to URL hash', () => {
    useHashStore.setState({
      context: { doc: 'automerge:test' as AutomergeUrl, sync: ['wss://example.com'] },
    });
    const hash = decodeURIComponent(location.hash.slice(1));
    const parsed = JSON.parse(hash);
    expect(parsed.context.doc).toBe('automerge:test');
    expect(parsed.context.sync).toEqual(['wss://example.com']);
  });

  it('hashchange events update store', () => {
    setHash({
      context: { doc: 'automerge:fromhash', sync: ['wss://a.com'] },
    });
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const state = useHashStore.getState();
    expect(state.context?.doc).toBe('automerge:fromhash');
    expect(state.context?.sync).toEqual(['wss://a.com']);
  });

  it('round-trips delegation through URL hash', () => {
    // Opaque base64url-encoded KeyHive Signed<Delegation>
    const delegation = 'dGVzdC1lZDI1NTE5LXB1YmtleS0zMi1ieXRlcw';
    setHash({
      context: {
        doc: 'automerge:abc123',
        sync: ['wss://sync.example.com'],
        delegation,
      },
    });
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const state = useHashStore.getState();
    expect(state.context?.delegation).toBe(delegation);
  });

  it('round-trips through URL hash', () => {
    const original = {
      context: {
        doc: 'automerge:roundtrip' as AutomergeUrl,
        sync: ['wss://sync1.com', 'wss://sync2.com'],
      },
    };
    useHashStore.setState(original, true);

    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const state = useHashStore.getState();
    expect(state.context?.doc).toBe(original.context.doc);
    expect(state.context?.sync).toEqual(original.context.sync);
  });
});
