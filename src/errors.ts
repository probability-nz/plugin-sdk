export type SDKErrorCode =
  | 'MISSING_SYNC'
  | 'INVALID_DOC_URL'
  | 'CONNECTION_FAILED'
  | 'DOC_DELETED';

export class SDKError extends Error {
  readonly code: SDKErrorCode;

  constructor(code: SDKErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'SDKError';
    this.code = code;
  }
}
