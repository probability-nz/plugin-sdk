import type { ObjID, Prop, PutPatch } from '@automerge/automerge';

export type { ObjID, Prop } from '@automerge/automerge';

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

/** Anchored version of automerge's {@link PutPatch} */
export interface PutOp extends Omit<PutPatch, 'path'> {
  path: AnchoredPath;
}

/** Move — no automerge equivalent yet (planned feature) */
export interface MoveOp {
  action: 'move';
  path: AnchoredPath;
  to: AnchoredPath;
}

/** Presence operation broadcast between peers */
export type PresenceOp = CursorOp | PutOp | MoveOp;
