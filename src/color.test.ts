import { describe, expect, it } from 'vitest';
import { toColor } from './color';

describe('toColor', () => {
  it('returns a valid hex color string', () => {
    const color = toColor('test');
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('is deterministic', () => {
    expect(toColor('hello')).toBe(toColor('hello'));
  });

  it('produces different colors for different inputs', () => {
    const a = toColor('alice');
    const b = toColor('bob');
    expect(a).not.toBe(b);
  });

  it('handles empty string', () => {
    const color = toColor('');
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('produces visually distinct colors for similar inputs', () => {
    const a = toColor('player1');
    const b = toColor('player2');
    expect(a).not.toBe(b);
  });
});
