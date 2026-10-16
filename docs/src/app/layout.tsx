import type { Metadata } from 'next';
import { DM_Sans, Inter, JetBrains_Mono } from 'next/font/google';
import type { Organization, WebSite, WithContext } from 'schema-dts';
import { JsonLd } from '@/components/seo/json-ld';
import {
  GITHUB_URL,
  metaDescription,
  SITE_DESCRIPTION,
  SITE_HEADLINE,
  SITE_NAME,
  SITE_URL,
} from '@/lib/site';
import './global.css';
import { Provider } from './provider';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Palimpsest',
  url: GITHUB_URL,
  sameAs: [GITHUB_URL],
} satisfies WithContext<Organization>;

const siteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: 'Palimpsest Docs',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
} satisfies WithContext<WebSite>;

const SITE_META_DESCRIPTION = metaDescription(SITE_DESCRIPTION);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_HEADLINE}`,
    template: '%s · Palimpsest',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: '/ps-logo.png',
    apple: '/ps-logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_HEADLINE}`,
    description: SITE_META_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_HEADLINE}`,
    description: SITE_META_DESCRIPTION,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased scrollbar-thin scrollbar-track-transparent scrollbar-thumb-fd-muted-foreground/30 dark:scrollbar-thumb-fd-muted-foreground/50`}
    >
      <body>
        <JsonLd json={[orgLd, siteLd]} />
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
