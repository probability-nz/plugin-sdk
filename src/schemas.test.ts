import { describe, expect, it } from 'vitest';
import { GameManifestSchema, PieceSchema } from './schemas';

describe('PieceSchema', () => {
  it('accepts empty object', () => {
    expect(PieceSchema.parse({})).toEqual({});
  });

  it('accepts piece with all fields', () => {
    const piece = {
      name: 'token',
      src: 'token.glb',
      template: 'default',
      position: [1, 2, 3],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
      color: '#ff0000',
      locked: true,
      faces: [{ name: 'top', rotation: [0, 0, 0] }],
      children: [{ name: 'child' }],
    };
    expect(PieceSchema.parse(piece)).toEqual(piece);
  });

  it('accepts null color', () => {
    expect(PieceSchema.parse({ color: null })).toEqual({ color: null });
  });

  it('rejects invalid position', () => {
    expect(() => PieceSchema.parse({ position: [1, 2] })).toThrow();
  });

  it('accepts nested children', () => {
    const nested = { children: [{ children: [{ name: 'deep' }] }] };
    expect(PieceSchema.parse(nested)).toEqual(nested);
  });
});

describe('GameManifestSchema', () => {
  it('accepts valid manifest', () => {
    const manifest = {
      $schema: '0.0',
      templates: { token: { src: 'token.glb' } },
      states: [{ children: [{ template: 'token', position: [0, 0, 0] }] }],
    };
    expect(GameManifestSchema.parse(manifest)).toEqual(manifest);
  });

  it('rejects missing $schema', () => {
    expect(() =>
      GameManifestSchema.parse({ templates: {}, states: [] }),
    ).toThrow();
  });

  it('rejects missing states', () => {
    expect(() =>
      GameManifestSchema.parse({ $schema: '0.0', templates: {} }),
    ).toThrow();
  });
});
