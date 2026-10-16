import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { GitHubIcon } from '@/components/icons/github';
import { PsWordmark } from '@/components/ps-wordmark';
import { GITHUB_URL } from '@/lib/site';

export function baseOptions({
  wordmarkClassName = 'h-8 w-auto text-(--slide-text)',
}: {
  wordmarkClassName?: string;
} = {}): BaseLayoutProps {
  return {
    nav: {
      title: <PsWordmark aria-label="Palimpsest" className={wordmarkClassName} />,
    },
    links: [
      {
        type: 'icon',
        url: GITHUB_URL,
        label: 'GitHub',
        text: 'GitHub',
        icon: <GitHubIcon className="size-full" />,
        external: true,
      },
    ],
  };
}
