/** Branded string type for automerge document URLs (e.g. `automerge:abc123`) */
export type AutomergeUrl = `automerge:${string}`;

/** JSON-compatible value (replacement for type-fest's JsonValue) */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Connection context passed to plugins via the URL hash */
export interface HashContext {
  /** Automerge document URL */
  doc: AutomergeUrl;
  /** Sync server WebSocket URLs */
  sync: string[];
  /**
   * @experimental Will be a base64url-encoded KeyHive/Beelay Ed25519
   * Signed<Delegation>. Currently ignored — all values fail validation.
   */
  delegation?: string;
  [key: string]: JsonValue | undefined;
}

/**
 * JSON state stored in the URL hash fragment
 * Contains a {@link HashContext} plus arbitrary plugin-specific state
 */
export interface HashState {
  context: HashContext;
  [key: string]: JsonValue | HashContext | undefined;
}

/** Plugin URL: `<address>#<JSON-encoded HashState>` */
export type PluginUrl = `${string}#${string}`;
