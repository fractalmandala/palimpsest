import type {
  PsMenuDispatchResult,
  PsMenuRendererSnapshot,
  PsSpellcheckEnabledSetResult,
  PsSpellingLanguagesQueryResult,
  PsSpellingLanguagesSetResult,
} from '@palimpsest/core/desktop-bridge';

export function asMenuRendererSnapshot(
  result: PsMenuDispatchResult,
): PsMenuRendererSnapshot | undefined {
  if (result == null || 'kind' in result) return undefined;
  return result;
}

export function asSpellingLanguagesQueryResult(
  result: PsMenuDispatchResult,
): PsSpellingLanguagesQueryResult {
  if (result != null && 'kind' in result && result.kind === 'spelling-languages-query') {
    return result;
  }
  const error = new Error('Spelling IPC protocol mismatch: expected spelling-languages-query');
  console.warn('[spellcheck] IPC protocol mismatch', error);
  throw error;
}

export function asSpellingLanguagesSetResult(
  result: PsMenuDispatchResult,
): PsSpellingLanguagesSetResult {
  if (result != null && 'kind' in result && result.kind === 'spelling-languages-set') {
    return result;
  }
  const error = new Error('Spelling IPC protocol mismatch: expected spelling-languages-set');
  console.warn('[spellcheck] IPC protocol mismatch', error);
  throw error;
}

export function asSpellcheckEnabledSetResult(
  result: PsMenuDispatchResult,
): PsSpellcheckEnabledSetResult {
  if (result != null && 'kind' in result && result.kind === 'spellcheck-enabled-set') {
    return result;
  }
  const error = new Error('Spelling IPC protocol mismatch: expected spellcheck-enabled-set');
  console.warn('[spellcheck] IPC protocol mismatch', error);
  throw error;
}
