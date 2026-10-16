import { assertNeverProblemType, type ProblemType } from '@palimpsest/core';
import type { HttpErrorStatus } from './http/error-response.ts';

export type UploadWriteReason = Extract<
  ProblemType,
  | 'urn:ps:error:collision-exhaustion'
  | 'urn:ps:error:storage-full'
  | 'urn:ps:error:storage-readonly'
  | 'urn:ps:error:storage-error'
  | 'urn:ps:error:malformed-upload'
>;

export class UploadWriteError extends Error {
  readonly reason: UploadWriteReason;

  constructor(reason: UploadWriteReason, cause?: unknown) {
    super(`UploadWriteError: ${reason}`, { cause });
    this.name = 'UploadWriteError';
    this.reason = reason;
  }
}

export function uploadStatusFor(reason: UploadWriteReason): HttpErrorStatus {
  switch (reason) {
    case 'urn:ps:error:malformed-upload':
      return 400;
    case 'urn:ps:error:storage-full':
      return 507;
    case 'urn:ps:error:storage-readonly':
      return 500;
    case 'urn:ps:error:storage-error':
      return 500;
    case 'urn:ps:error:collision-exhaustion':
      return 500;
    default:
      return assertNeverProblemType(reason);
  }
}

export function classifyUploadErrno(err: NodeJS.ErrnoException): UploadWriteReason {
  if (err.code === 'ENOSPC' || err.code === 'EDQUOT') return 'urn:ps:error:storage-full';
  if (err.code === 'EROFS' || err.code === 'EACCES' || err.code === 'EPERM') {
    return 'urn:ps:error:storage-readonly';
  }
  return 'urn:ps:error:storage-error';
}

export function uploadTitleFor(reason: UploadWriteReason): string {
  switch (reason) {
    case 'urn:ps:error:malformed-upload':
      return 'Upload payload is malformed.';
    case 'urn:ps:error:storage-full':
      return 'Storage is full.';
    case 'urn:ps:error:storage-readonly':
      return 'Storage is read-only.';
    case 'urn:ps:error:storage-error':
      return 'Failed to write upload.';
    case 'urn:ps:error:collision-exhaustion':
      return 'Filename collision retries exhausted.';
    default:
      return assertNeverProblemType(reason);
  }
}
