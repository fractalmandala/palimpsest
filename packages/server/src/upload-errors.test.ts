import { describe, expect, test } from 'vitest';
import { classifyUploadErrno, uploadStatusFor, uploadTitleFor } from './upload-errors.ts';

function withCode(code: string): NodeJS.ErrnoException {
  const err = new Error(`mock ${code}`) as NodeJS.ErrnoException;
  err.code = code;
  return err;
}

describe('classifyUploadErrno', () => {
  test('ENOSPC → urn:ps:error:storage-full', () => {
    expect(classifyUploadErrno(withCode('ENOSPC'))).toBe('urn:ps:error:storage-full');
  });

  test('EDQUOT → urn:ps:error:storage-full (quota exceeded behaves like full)', () => {
    expect(classifyUploadErrno(withCode('EDQUOT'))).toBe('urn:ps:error:storage-full');
  });

  test('EROFS → urn:ps:error:storage-readonly', () => {
    expect(classifyUploadErrno(withCode('EROFS'))).toBe('urn:ps:error:storage-readonly');
  });

  test('EACCES → urn:ps:error:storage-readonly', () => {
    expect(classifyUploadErrno(withCode('EACCES'))).toBe('urn:ps:error:storage-readonly');
  });

  test('EPERM → urn:ps:error:storage-readonly', () => {
    expect(classifyUploadErrno(withCode('EPERM'))).toBe('urn:ps:error:storage-readonly');
  });

  test('EIO → urn:ps:error:storage-error (generic disk I/O fallback)', () => {
    expect(classifyUploadErrno(withCode('EIO'))).toBe('urn:ps:error:storage-error');
  });

  test('unknown errno → urn:ps:error:storage-error (default branch)', () => {
    expect(classifyUploadErrno(withCode('ESOMETHINGWEIRD'))).toBe('urn:ps:error:storage-error');
  });

  test('error with no code field → urn:ps:error:storage-error', () => {
    const err = new Error('no code at all') as NodeJS.ErrnoException;
    expect(classifyUploadErrno(err)).toBe('urn:ps:error:storage-error');
  });
});

describe('uploadStatusFor', () => {
  test('malformed-upload → 400', () => {
    expect(uploadStatusFor('urn:ps:error:malformed-upload')).toBe(400);
  });

  test('storage-full → 507 (RFC 4918 Insufficient Storage; retry-after-frees)', () => {
    expect(uploadStatusFor('urn:ps:error:storage-full')).toBe(507);
  });

  test('storage-readonly → 500', () => {
    expect(uploadStatusFor('urn:ps:error:storage-readonly')).toBe(500);
  });

  test('storage-error → 500', () => {
    expect(uploadStatusFor('urn:ps:error:storage-error')).toBe(500);
  });

  test('collision-exhaustion → 500', () => {
    expect(uploadStatusFor('urn:ps:error:collision-exhaustion')).toBe(500);
  });
});

describe('uploadTitleFor', () => {
  test('malformed-upload title is sentence-shaped + period-terminated', () => {
    expect(uploadTitleFor('urn:ps:error:malformed-upload')).toBe('Upload payload is malformed.');
  });

  test('storage-full title', () => {
    expect(uploadTitleFor('urn:ps:error:storage-full')).toBe('Storage is full.');
  });

  test('storage-readonly title', () => {
    expect(uploadTitleFor('urn:ps:error:storage-readonly')).toBe('Storage is read-only.');
  });

  test('storage-error title', () => {
    expect(uploadTitleFor('urn:ps:error:storage-error')).toBe('Failed to write upload.');
  });

  test('collision-exhaustion title', () => {
    expect(uploadTitleFor('urn:ps:error:collision-exhaustion')).toBe(
      'Filename collision retries exhausted.',
    );
  });
});
