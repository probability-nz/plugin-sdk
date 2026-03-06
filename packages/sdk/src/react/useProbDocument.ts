import type { ChangeFn, ChangeOptions, Doc } from '@automerge/automerge';
import { type AnyDocumentId, useDocument as useAutomergeDocument } from '@automerge/react';
import { useCallback } from 'react';
import { formatErrors, getDocValidator } from '../validation';

type ChangeDocFn<T> = (changeFn: ChangeFn<T>, options?: ChangeOptions<T>) => void;

/**
 * Thin wrapper over automerge's useDocument that validates writes against the
 * universal game state schema. Requires suspense mode.
 */
export function useProbDocument<T>(
  id: AnyDocumentId,
  params: { suspense: true },
): [Doc<T>, ChangeDocFn<T>] {
  if (params?.suspense !== true) {
    throw new Error('useProbDocument requires { suspense: true }.');
  }

  const [doc, rawChangeDoc] = useAutomergeDocument<T>(id, params);

  const changeDoc = useCallback(
    (fn: ChangeFn<T>, options?: ChangeOptions<T>) => {
      rawChangeDoc((d) => {
        fn(d);
        const result = getDocValidator().validate(d);
        if (!result.valid) {
          throw new Error(formatErrors(result.errors));
        }
      }, options);
    },
    [rawChangeDoc],
  );

  return [doc, changeDoc];
}
