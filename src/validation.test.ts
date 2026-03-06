import { describe, expect, it } from 'vitest';
import { getDocValidator, getPresenceValidator, formatErrors } from './validation';

describe('getDocValidator', () => {
  it('returns a cached singleton', () => {
    const a = getDocValidator();
    const b = getDocValidator();
    expect(a).toBe(b);
  });

  it('accepts a valid game state', () => {
    const doc = {
      $schema: 'https://probability.nz/schemas/game-manifest/1.0',
      templates: {
        d6: { src: '/models/d6.glb', faces: [{ name: 'one', rotation: [0, 0, 0] }] },
      },
      states: [{ name: 'setup', children: [] }],
    };
    const result = getDocValidator().validate(doc);
    expect(result.valid).toBe(true);
  });

  it('accepts extra properties at the top level', () => {
    const doc = { count: 42, custom: 'data' };
    const result = getDocValidator().validate(doc);
    expect(result.valid).toBe(true);
  });

  it('accepts a doc with recursive children', () => {
    const doc = {
      children: [
        {
          name: 'parent',
          position: [0, 1, 2],
          children: [
            {
              name: 'child',
              position: [3, 4, 5],
              children: [{ name: 'grandchild' }],
            },
          ],
        },
      ],
    };
    const result = getDocValidator().validate(doc);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid Vector3Tuple', () => {
    const doc = {
      children: [{ position: [1, 2] }],
    };
    const result = getDocValidator().validate(doc);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid Face', () => {
    const doc = {
      children: [{ faces: [{ name: 'one' }] }],
    };
    const result = getDocValidator().validate(doc);
    expect(result.valid).toBe(false);
  });

  it('validates a large tree within a reasonable time', () => {
    const makePiece = (depth: number): Record<string, unknown> => ({
      name: `piece-${depth}`,
      position: [0, 0, 0],
      children: depth > 0 ? Array.from({ length: 3 }, () => makePiece(depth - 1)) : [],
    });
    // 3^4 = 81 leaf pieces, ~120 total nodes
    const doc = { children: [makePiece(4)] };

    const start = performance.now();
    const result = getDocValidator().validate(doc);
    const elapsed = performance.now() - start;

    expect(result.valid).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });
});

describe('getPresenceValidator', () => {
  it('returns a cached singleton', () => {
    const a = getPresenceValidator();
    const b = getPresenceValidator();
    expect(a).toBe(b);
  });

  it('accepts empty presence', () => {
    const result = getPresenceValidator().validate({});
    expect(result.valid).toBe(true);
  });

  it('accepts a valid cursor op', () => {
    const result = getPresenceValidator().validate({
      cursor: { action: 'focus', path: ['2@abc123', 'children', 0] },
    });
    expect(result.valid).toBe(true);
  });

  it('accepts a valid put op', () => {
    const result = getPresenceValidator().validate({
      op: { action: 'put', path: ['2@abc123', 'position'], value: [1, 2, 3] },
    });
    expect(result.valid).toBe(true);
  });

  it('accepts a valid move op', () => {
    const result = getPresenceValidator().validate({
      op: {
        action: 'move',
        path: ['2@abc123', 'children', 0],
        to: ['3@def456', 'children', 1],
      },
    });
    expect(result.valid).toBe(true);
  });

  it('rejects arbitrary properties', () => {
    const result = getPresenceValidator().validate({
      x: 100,
      y: 200,
    });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid cursor op', () => {
    const result = getPresenceValidator().validate({
      cursor: { action: 'hover', path: [] },
    });
    expect(result.valid).toBe(false);
  });
});

describe('formatErrors', () => {
  it('formats errors into readable messages', () => {
    const doc = { children: [{ position: [1, 2] }] };
    const result = getDocValidator().validate(doc);
    const message = formatErrors(result.errors);
    expect(message).toContain('Schema validation failed');
    expect(message.length).toBeGreaterThan(25);
  });

  it('returns fallback for empty errors', () => {
    const message = formatErrors([]);
    expect(message).toBe('Schema validation failed');
  });
});
