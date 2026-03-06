import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockUseAutomergeDocument } = vi.hoisted(() => ({
  mockUseAutomergeDocument: vi.fn(),
}));
vi.mock('@automerge/react', () => ({
  useDocument: mockUseAutomergeDocument,
}));

import { useProbDocument } from './useProbDocument';

describe('useProbDocument', () => {
  const mockChangeDoc = vi.fn((fn: (d: Record<string, unknown>) => void) => {
    // Simulate automerge: call the change function with a mutable proxy
    // If the function throws, the transaction is discarded
    const draft = { ...currentDoc };
    fn(draft);
    currentDoc = draft;
  });

  let currentDoc: Record<string, unknown> = {};

  beforeEach(() => {
    currentDoc = {};
    mockChangeDoc.mockClear();
    mockUseAutomergeDocument.mockImplementation(() => [currentDoc, mockChangeDoc]);
  });

  it('throws if suspense is not true', () => {
    expect(() => {
      renderHook(() => useProbDocument('automerge:abc' as any, { suspense: false } as any));
    }).toThrow('useProbDocument requires { suspense: true }.');
  });

  it('returns [doc, changeDoc] like automerge useDocument', () => {
    currentDoc = { count: 5 };
    mockUseAutomergeDocument.mockReturnValue([currentDoc, mockChangeDoc]);

    const { result } = renderHook(() =>
      useProbDocument<{ count: number }>('automerge:abc' as any, { suspense: true }),
    );

    const [doc, changeDoc] = result.current;
    expect(doc).toEqual({ count: 5 });
    expect(typeof changeDoc).toBe('function');
  });

  it('passes id and params to automerge useDocument', () => {
    renderHook(() => useProbDocument('automerge:xyz' as any, { suspense: true }));

    expect(mockUseAutomergeDocument).toHaveBeenCalledWith('automerge:xyz', { suspense: true });
  });

  it('allows valid writes through', () => {
    currentDoc = { count: 0 };
    mockUseAutomergeDocument.mockReturnValue([currentDoc, mockChangeDoc]);

    const { result } = renderHook(() =>
      useProbDocument<{ count: number }>('automerge:abc' as any, { suspense: true }),
    );

    act(() => {
      result.current[1]((d) => {
        d.count = 1;
      });
    });

    expect(mockChangeDoc).toHaveBeenCalledTimes(1);
  });

  it('allows writes with extra properties (additionalProperties: true)', () => {
    currentDoc = {};
    mockUseAutomergeDocument.mockReturnValue([currentDoc, mockChangeDoc]);

    const { result } = renderHook(() =>
      useProbDocument<Record<string, unknown>>('automerge:abc' as any, { suspense: true }),
    );

    // Plugin-specific fields should pass validation
    act(() => {
      result.current[1]((d) => {
        d.score = 42;
        d.playerName = 'Alice';
      });
    });

    expect(mockChangeDoc).toHaveBeenCalledTimes(1);
  });

  it('allows writes with valid game state fields', () => {
    currentDoc = {};
    mockUseAutomergeDocument.mockReturnValue([currentDoc, mockChangeDoc]);

    const { result } = renderHook(() =>
      useProbDocument<Record<string, unknown>>('automerge:abc' as any, { suspense: true }),
    );

    act(() => {
      result.current[1]((d) => {
        d.templates = { d6: { src: '/models/d6.glb' } };
        d.children = [{ name: 'token', position: [0, 1, 2] }];
      });
    });

    expect(mockChangeDoc).toHaveBeenCalledTimes(1);
  });

  it('rejects writes that violate the schema', () => {
    currentDoc = {};
    // Mock that simulates automerge: fn throws → transaction discarded
    const throwingChangeDoc = vi.fn((fn: (d: Record<string, unknown>) => void) => {
      const draft: Record<string, unknown> = {};
      fn(draft); // This should throw
    });
    mockUseAutomergeDocument.mockReturnValue([currentDoc, throwingChangeDoc]);

    const { result } = renderHook(() =>
      useProbDocument<Record<string, unknown>>('automerge:abc' as any, { suspense: true }),
    );

    // Invalid: position must be [number, number, number]
    expect(() => {
      act(() => {
        result.current[1]((d) => {
          d.children = [{ position: [1, 2] }];
        });
      });
    }).toThrow('Schema validation failed');
  });

  it('rejects writes with invalid nested structure', () => {
    currentDoc = {};
    const throwingChangeDoc = vi.fn((fn: (d: Record<string, unknown>) => void) => {
      const draft: Record<string, unknown> = {};
      fn(draft);
    });
    mockUseAutomergeDocument.mockReturnValue([currentDoc, throwingChangeDoc]);

    const { result } = renderHook(() =>
      useProbDocument<Record<string, unknown>>('automerge:abc' as any, { suspense: true }),
    );

    // Invalid: Face requires both name and rotation
    expect(() => {
      act(() => {
        result.current[1]((d) => {
          d.children = [{ faces: [{ name: 'top' }] }];
        });
      });
    }).toThrow('Schema validation failed');
  });

  it('passes options to automerge changeDoc', () => {
    currentDoc = {};
    const changeDocWithOptions = vi.fn(
      (fn: (d: Record<string, unknown>) => void, _options?: unknown) => {
        const draft: Record<string, unknown> = {};
        fn(draft);
      },
    );
    mockUseAutomergeDocument.mockReturnValue([currentDoc, changeDocWithOptions]);

    const { result } = renderHook(() =>
      useProbDocument<Record<string, unknown>>('automerge:abc' as any, { suspense: true }),
    );

    const options = { message: 'test change' };
    act(() => {
      result.current[1]((d) => {
        d.foo = 'bar';
      }, options);
    });

    expect(changeDocWithOptions).toHaveBeenCalledWith(expect.any(Function), options);
  });
});
