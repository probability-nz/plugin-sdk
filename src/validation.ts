import { Validator, type Schema, type OutputUnit } from '@cfworker/json-schema';
import rawSchema from './schema/game-state-v1.json';

// Cast needed because JSON import widens literal types (e.g. "object" → string)
const schema = rawSchema as unknown as Schema & { $defs: Record<string, Schema> };

let docValidator: Validator | undefined;
let presenceValidator: Validator | undefined;

/** Cached validator for the universal game state schema */
export function getDocValidator(): Validator {
  docValidator ??= new Validator(schema, '2020-12', false);
  return docValidator;
}

/** Cached validator for the closed presence schema */
export function getPresenceValidator(): Validator {
  presenceValidator ??= new Validator(
    { $ref: '#/$defs/PresenceState', $defs: schema.$defs },
    '2020-12',
    false,
  );
  return presenceValidator;
}

/** Format cfworker validation errors into a readable message */
export function formatErrors(errors: OutputUnit[]): string {
  const messages = errors
    .filter((e) => e.keyword !== undefined)
    .map((e) => {
      const path = e.instanceLocation || '';
      const keyword = e.keyword || 'unknown';
      const detail = e.error || '';
      return path ? `${path}: ${keyword} — ${detail}` : `${keyword} — ${detail}`;
    });
  return messages.length > 0
    ? `Schema validation failed:\n${messages.join('\n')}`
    : 'Schema validation failed';
}
