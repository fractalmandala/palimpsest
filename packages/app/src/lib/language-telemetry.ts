import type { LanguagePreference } from '@palimpsest/core/i18n/locales';
import { trace } from '@opentelemetry/api';

const TRACER_NAME = 'palimpsest-app';

export function recordLanguagePreferenceChanged({
  from,
  to,
}: {
  from: LanguagePreference;
  to: LanguagePreference;
}): void {
  try {
    trace
      .getTracer(TRACER_NAME)
      .startSpan('ps.language.preferenceChanged', {
        attributes: { 'ps.language.from': from, 'ps.language.to': to },
      })
      .end();
  } catch (err) {
    console.warn(
      '[language-telemetry] span emit failed:',
      err instanceof Error ? err : String(err),
    );
  }
}
