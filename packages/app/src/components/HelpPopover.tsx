// oxlint-disable ps/no-physical-direction-utility -- pre-rule backlog — physical margin/padding/inset utilities predate the rule; drain by swapping ml/mr → ms/me, pl/pr → ps/pe, left/right → start/end, then deleting this line. See https://github.com/fractalmandala/palimpsest/blob/main/lint-plugins/ps-rules/README.md#no-physical-direction-utility

import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { getGitHubStars } from '@palimpsest/core/utils/github-stars';
import {
  BookOpen,
  Bug,
  CircleHelp,
  Download,
  MessageSquare,
  Star,
} from 'lucide-react';
import type { ComponentProps, FC, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ReportBugDialog } from '@/components/ReportBugDialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dispatchExternalLinkClick } from '@/lib/external-link';
import { feedbackNudgeStore } from '@/lib/feedback-nudge-store';
import { DOCS_URL, GITHUB_REPO_URL } from '@/lib/social-links';
import { openAboutSettings } from '@/lib/use-settings-route';
import { cn } from '@/lib/utils';
import { FeedbackFormDialog } from './FeedbackFormDialog';
import { GithubIcon } from './icons/github';

interface ResourceLink {
  label: string | MessageDescriptor;
  href: string;
  icon: FC<ComponentProps<'svg'>>;
}

interface ResourceSection {
  key: string;
  heading: MessageDescriptor;
  links: ResourceLink[];
}

const sections: ResourceSection[] = [
  {
    key: 'resources',
    heading: msg`Resources`,
    links: [
      { label: msg`Docs`, href: DOCS_URL, icon: BookOpen },
      {
        label: msg`Download app`,
        href: 'https://github.com/fractalmandala/palimpsest/download',
        icon: Download,
      },
    ],
  },
  {
    key: 'community',
    heading: msg`Community`,
    links: [{ label: 'GitHub', href: GITHUB_REPO_URL, icon: GithubIcon }],
  },
];


const rowClassName =
  'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-azure-900/5 dark:hover:bg-white/20 hover:text-primary';

function formatStarCount(count: number): string {
  if (count < 1000) return String(count);
  const thousands = count / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1)}k`;
}

const StarCount: FC<{ count: number }> = ({ count }) => {
  const { t } = useLingui();
  const formatted = formatStarCount(count);
  return (
    <span
      role="img"
      className="ml-auto flex items-center gap-1 text-xs tabular-nums text-muted-foreground"
      aria-label={t`${formatted} GitHub stars`}
    >
      <Star className="size-3 fill-current" aria-hidden="true" />
      {formatted}
    </span>
  );
};

const ResourceLinkRow: FC<{ link: ResourceLink; trailing?: ReactNode }> = ({ link, trailing }) => {
  const { t } = useLingui();
  const { label, href, icon: Icon } = link;
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => dispatchExternalLinkClick(e, href)}
        onAuxClick={(e) => dispatchExternalLinkClick(e, href)}
        className={rowClassName}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {typeof label === 'string' ? label : t(label)}
        {trailing}
      </a>
    </li>
  );
};

const ActionRow: FC<{
  icon: FC<ComponentProps<'svg'>>;
  onSelect: () => void;
  children: ReactNode;
}> = ({ icon: Icon, onSelect, children }) => (
  <li>
    <Button
      variant="ghost"
      className={cn(rowClassName, 'h-auto w-full justify-start font-normal')}
      onClick={onSelect}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </Button>
  </li>
);

const SectionHeading: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="font-mono tracking-wide uppercase text-muted-foreground text-xs mb-1">{children}</p>
);

export const HelpPopover: FC = () => {
  const { t } = useLingui();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [reportBugOpen, setReportBugOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [starCount, setStarCount] = useState<number | null>(null);

  const bridge = typeof window !== 'undefined' ? (window.psDesktop ?? null) : null;
  const hasDesktopBridge = bridge != null;
  const appVersion = bridge?.appVersion;

  useEffect(() => {
    if (!popoverOpen || starCount !== null) return;
    const controller = new AbortController();
    getGitHubStars({ signal: controller.signal }).then((count) => {
      if (count !== null) setStarCount(count);
    });
    return () => controller.abort();
  }, [popoverOpen, starCount]);

  return (
    <>
      <Popover
        open={popoverOpen}
        onOpenChange={(open) => {
          setPopoverOpen(open);
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 hover:bg-accent text-muted-foreground"
              >
                <CircleHelp className="size-4" />
                <span className="sr-only">
                  <Trans>Resources</Trans>
                </span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <Trans>Resources</Trans>
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          align="end"
          aria-label={t`Resources`}
          className="w-56 p-3 subtle-scrollbar max-h-(--radix-popover-content-available-height) overflow-y-auto data-[state=closed]:overflow-hidden"
        >
          {sections.map((section, index) => (
            <div key={section.key} className={cn(index > 0 && 'mt-3')}>
              <SectionHeading>{t(section.heading)}</SectionHeading>
              <nav aria-label={t(section.heading)}>
                <ul className="space-y-0.5">
                  {section.links.map((link) => (
                    <ResourceLinkRow
                      key={link.href}
                      link={link}
                      trailing={
                        link.href === GITHUB_REPO_URL && starCount !== null ? (
                          <StarCount count={starCount} />
                        ) : undefined
                      }
                    />
                  ))}
                  {}
                  {section.key === 'resources' && (
                    <>
                      {}
                      {hasDesktopBridge && (
                        <ActionRow
                          icon={Bug}
                          onSelect={() => {
                            setPopoverOpen(false);
                            setReportBugOpen(true);
                          }}
                        >
                          <Trans>Report a bug</Trans>
                        </ActionRow>
                      )}
                      <ActionRow
                        icon={MessageSquare}
                        onSelect={() => {
                          setPopoverOpen(false);
                          setFeedbackOpen(true);
                        }}
                      >
                        <Trans>Send feedback</Trans>
                      </ActionRow>
                    </>
                  )}
                </ul>
              </nav>
            </div>
          ))}

          {appVersion ? (
            <div className="mt-3 border-t pt-2">
              <Button
                variant="ghost"
                className={cn(
                  rowClassName,
                  'h-auto w-full flex-wrap justify-between gap-y-0.5 text-start font-mono text-xs font-normal whitespace-normal',
                )}
                onClick={() => {
                  setPopoverOpen(false);
                  openAboutSettings();
                }}
                data-testid="help-popover-version"
              >
                <span className="min-w-0 max-w-full truncate">v{appVersion}</span>{' '}
                <span className="font-sans text-muted-foreground">
                  <Trans>About</Trans>
                </span>
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {}
      {hasDesktopBridge && (
        <ReportBugDialog open={reportBugOpen} onOpenChange={setReportBugOpen} launcherBorne />
      )}
      <FeedbackFormDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        onSuccess={() => feedbackNudgeStore.dismiss()}
      />
    </>
  );
};
