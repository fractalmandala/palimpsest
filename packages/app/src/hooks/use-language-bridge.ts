import type { LanguagePreference } from '@palimpsest/core/i18n/locales';
import { useEffect } from 'react';
import type { PsDesktopBridge } from '@/lib/desktop-bridge-types';

export function useLanguageBridge(
  bridge: PsDesktopBridge | undefined,
  preference: LanguagePreference | undefined,
  synced: boolean,
): void {
  useEffect(() => {
    if (!bridge || !synced) return;
    if (typeof bridge.setLanguagePreference !== 'function') return;
    bridge.setLanguagePreference(preference ?? 'system').catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          event: 'language-preference-push-failed',
          preference: preference ?? 'system',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
  }, [bridge, preference, synced]);
}
