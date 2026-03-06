/** Automerge object ID (e.g. `"2@abc123"`) */
export type ObjID = string;

/** Automerge property key */
export type Prop = string | number;

/**
 * A path anchored to a specific Automerge object
 * @example `["2@abc123", "children", 0, "position"]`
 */
export type AnchoredPath = [ObjID, ...Prop[]];

/** Cursor focus (what the user is looking at) — no automerge equivalent */
export interface CursorOp {
  action: 'focus';
  path: AnchoredPath;
}

/** Anchored version of automerge's PutPatch */
export interface PutOp {
  action: 'put';
  path: AnchoredPath;
  value: string | number | boolean | null | Date | Uint8Array;
  conflict?: boolean;
}

/** Move — no automerge equivalent yet (planned feature) */
export interface MoveOp {
  action: 'move';
  path: AnchoredPath;
  to: AnchoredPath;
}

/** Presence operation broadcast between peers */
export type PresenceOp = CursorOp | PutOp | MoveOp;
