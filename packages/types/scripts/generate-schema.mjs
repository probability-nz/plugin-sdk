#!/usr/bin/env node
/**
 * Generates JSON Schema from TypeScript types using ts-json-schema-generator.
 * Output goes to dist/schema.json for consumption by the SDK validator.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outFile = resolve(root, 'dist', 'schema.json');

// Generate schema with both root types — all referenced types land in definitions
const raw = execSync(
  [
    'npx ts-json-schema-generator',
    `--path ${resolve(root, 'src/index.ts')}`,
    '--type GameManifest',
    '--type PresenceState',
    '--type Prop',
    '--no-type-check',
    '--strict-tuples',
  ].join(' '),
  { cwd: root, encoding: 'utf-8' },
);

// Convert draft-07 "definitions" → 2020-12 "$defs" and fix $ref paths
const schema = JSON.parse(
  JSON.stringify(JSON.parse(raw)).replaceAll('#/definitions/', '#/$defs/'),
);
if (schema.definitions) {
  schema.$defs = schema.definitions;
  delete schema.definitions;
}

// Override meta-schema to 2020-12
schema.$schema = 'https://json-schema.org/draft/2020-12/schema';

// Replace the generated top-level $ref with a permissive game-state root
// (the doc validator validates live game state, not just manifests)
delete schema.$ref;
schema.type = 'object';
schema.additionalProperties = true;
schema.properties = {
  $schema: { type: 'string' },
  templates: { $ref: '#/$defs/Templates' },
  states: { type: 'array', items: { $ref: '#/$defs/Scenario' } },
  children: { type: 'array', items: { $ref: '#/$defs/Piece' } },
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(schema, null, 2)}\n`);
console.log(`Schema written to ${outFile}`);
