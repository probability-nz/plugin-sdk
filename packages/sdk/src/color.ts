export type HexColor = `#${string}`;

/**
 * FNV-1a — deterministic non-cryptographic hash
 * Uses Math.imul for correct 32-bit overflow handling
 */
const fnv1a = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
};

/** Convert HSL to hex (s and l are 0-100, h is 0-360) */
const hslToHex = (h: number, s: number, l: number): HexColor => {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}` as HexColor;
};

/** Deterministic, visually distinct color from a string */
export const toColor = (s: string): HexColor => {
  const hash = fnv1a(s);
  const hue = hash % 360;
  return hslToHex(hue, 65, 55);
};
