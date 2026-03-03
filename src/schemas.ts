import { z } from 'zod';

const Vector3TupleSchema = z.tuple([z.number(), z.number(), z.number()]);

const FaceSchema = z.object({
  name: z.string(),
  rotation: Vector3TupleSchema,
});

export const PieceSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    name: z.string().optional(),
    src: z.string().optional(),
    template: z.string().optional(),
    position: Vector3TupleSchema.optional(),
    scale: Vector3TupleSchema.optional(),
    rotation: Vector3TupleSchema.optional(),
    color: z.string().nullable().optional(),
    locked: z.boolean().optional(),
    faces: z.array(FaceSchema).optional(),
    children: z.array(PieceSchema).optional(),
  }),
);

const ScenarioSchema = z.object({
  name: z.string().optional(),
  children: z.array(PieceSchema),
});

export const GameManifestSchema = z.object({
  $schema: z.string(),
  templates: z.record(z.string(), PieceSchema),
  states: z.array(ScenarioSchema),
});
