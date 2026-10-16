import { type GitNotAvailableError, GitTooOldError } from './git-preflight.ts';
import { withSpanSync } from './telemetry.ts';

export const GIT_PREFLIGHT_FAIL_SPAN_NAME = 'ps.preflight.git.fail';

export function emitPreflightFailureSpan(err: GitNotAvailableError | GitTooOldError): void {
  const reason = err instanceof GitTooOldError ? 'too_old' : 'not_available';
  const detectedVersion = err instanceof GitTooOldError ? err.detected : '';
  withSpanSync(
    GIT_PREFLIGHT_FAIL_SPAN_NAME,
    {
      attributes: {
        'ps.platform': err.platform,
        'ps.preflight.git.reason': reason,
        'ps.preflight.git.detected_version': detectedVersion,
      },
    },
    () => {},
  );
}
