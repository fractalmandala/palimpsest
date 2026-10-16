import { getMeter, withSpanSync } from '@palimpsest/server';
import type { PsSlidesOpenResult } from '../shared/ipc-channels.ts';

let _deckOpenFailureCounterCache: ReturnType<ReturnType<typeof getMeter>['createCounter']> | null =
  null;
function deckOpenFailureCounter() {
  _deckOpenFailureCounterCache ||= getMeter().createCounter('ps.slides.deck_open.failures', {
    description: 'Count of Slidev deck-open failures, labeled by reason',
  });
  return _deckOpenFailureCounterCache;
}

export function recordDeckOpen(result: PsSlidesOpenResult): void {
  if (result.ok) {
    withSpanSync(
      'ps.slides.deckOpen',
      { attributes: { 'ps.slides.outcome': 'ok' } },
      () => undefined,
    );
    return;
  }
  withSpanSync(
    'ps.slides.deckOpen',
    { attributes: { 'ps.slides.outcome': 'failure', 'ps.slides.reason': result.reason } },
    () => undefined,
  );
  deckOpenFailureCounter().add(1, { 'ps.slides.reason': result.reason });
}
