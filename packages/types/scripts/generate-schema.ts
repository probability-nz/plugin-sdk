/**
 * Converts TypeScript types to standalone JSON Schema 2020-12 via Typia.
 * To add types, add them to the tuple below.
 *
 * @note Output includes OpenAPI `discriminator` keywords (ignored by JSON Schema).
 * @fileoverview
 */

import typia from "typia";
import { mkdirSync, writeFileSync } from "node:fs";
import type { GameManifest, GameState } from "../src/doc";
import type { PresenceState } from "../src/presence";

const openapi = typia.json.schemas<
  [GameManifest, GameState, PresenceState], // Types go here
  "3.1"
>();

const schema = JSON.parse(
  JSON.stringify(openapi, (key, value) => {
    if (key === "$ref" && typeof value === "string") {
      return value.replace(/^#\/components\/schemas\//, "#/$defs/");
    }
    return value;
  }),
);

mkdirSync("dist", { recursive: true });
writeFileSync(
  "dist/analog.json",
  JSON.stringify(
    {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://probability.nz/schemas/analog/v0",
      title: "Analog",
      description: "Schema for Probability Automerge documents and presence",
      oneOf: schema.schemas,
      $defs: schema.components.schemas ?? {},
    },
    null,
    2,
  ),
);
