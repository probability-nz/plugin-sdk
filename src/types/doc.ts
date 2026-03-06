/** 3-element tuple for position, rotation, scale */
export type Vector3Tuple = [number, number, number];

/** A game piece in a manifest or document */
export interface Piece {
  name?: string;
  /** Path to a glTF/GLB model */
  src?: string;
  /** Key into {@link Templates} to inherit defaults from */
  template?: string;
  position?: Vector3Tuple;
  scale?: Vector3Tuple;
  /** Euler rotation (degrees) */
  rotation?: Vector3Tuple;
  /** CSS color string, or `null` for no tint */
  color?: string | null;
  locked?: boolean;
  /** Named face orientations (e.g. for dice) */
  faces?: Face[];
  children?: Piece[];
}

export interface Face {
  name: string;
  rotation: Vector3Tuple;
}

export type PieceTemplate = Omit<Piece, 'children'>;

export type Templates = Record<string, PieceTemplate>;

/** A named starting arrangement of pieces */
export interface Scenario {
  name?: string;
  children: Piece[];
}

/**
 * @example
 * ```json
 * {
 *   "$schema": "https://probability.nz/schemas/game-manifest/1.0",
 *   "templates": { "d6": { "src": "/models/d6.glb" } },
 *   "states": [{ "name": "2-player setup", "children": [...] }]
 * }
 * ```
 */
export interface GameManifest {
  $schema: string;
  templates: Templates;
  states: Scenario[];
}
