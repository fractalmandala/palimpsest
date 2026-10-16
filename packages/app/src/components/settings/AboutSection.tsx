import { Trans } from '@lingui/react/macro';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PsAboutInfo } from '@/lib/desktop-bridge-types';
import { SettingsSectionHeader } from './SettingsSectionHeader';

export function AboutSection() {
  const bridge = typeof window !== 'undefined' ? (window.psDesktop ?? null) : null;
  const [about, setAbout] = useState<PsAboutInfo | null>(null);

  useEffect(() => {
    if (!bridge) return;
    let cancelled = false;
    const readAbout = () => {
      bridge.state
        .query()
        .then((snapshot) => {
          if (!cancelled && snapshot.about) setAbout(snapshot.about);
        })
        .catch((err: unknown) => {
          console.warn('[about-section] bridge.state.query() failed', err);
        });
    };
    const readAboutWhenVisible = () => {
      if (document.visibilityState === 'visible') readAbout();
    };
    readAbout();
    window.addEventListener('focus', readAbout);
    document.addEventListener('visibilitychange', readAboutWhenVisible);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', readAbout);
      document.removeEventListener('visibilitychange', readAboutWhenVisible);
    };
  }, [bridge]);

  if (!bridge) return null;
  const version = about?.version ?? bridge.appVersion;

  return (
    <section
      aria-labelledby="settings-about-title"
      className="space-y-3"
      data-testid="settings-about"
    >
      <SettingsSectionHeader titleId="settings-about-title" title={<Trans>About</Trans>} />
      <div className="space-y-3 rounded-md border p-3">
        <div>
          {about ? <div className="text-sm font-medium">{about.productName}</div> : null}
          <p
            className="select-text font-mono text-1sm text-muted-foreground"
            data-testid="settings-about-version"
          >
            v{version}
          </p>
        </div>
        {about ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void bridge.shell.openExternal(about.releaseNotesUrl);
              }}
              data-testid="settings-about-release-notes"
            >
              <Trans>Release notes</Trans>
              <ArrowUpRight aria-hidden="true" className="size-3" />
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
