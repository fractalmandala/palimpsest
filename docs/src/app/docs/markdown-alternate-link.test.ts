import { describe, expect, test, vi } from 'vitest';

const overviewPage = {
  url: '/docs/get-started/overview',
  data: { title: 'Overview', description: 'What Palimpsest is.' },
};

vi.doMock('@/lib/source', () => ({
  source: { getPage: () => overviewPage, generateParams: () => [] },
}));

const { generateMetadata } = await import('./[...slug]/page.tsx');
const changelog = await import('./changelog/page.tsx');

describe('docs page markdown alternate link', () => {
  test('a docs page advertises its .md twin at an absolute URL', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: ['get-started', 'overview'] }),
    } as never);

    expect(meta.alternates?.types).toMatchObject({
      'text/markdown': 'https://github.com/fractalmandala/palimpsest/blob/main/docs/content/get-started/overview.mdx',
    });
  });

  test('the advertised twin is the URL the markdown rewrite serves', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: ['get-started', 'overview'] }),
    } as never);
    const advertised = String(meta.alternates?.types?.['text/markdown']);

    expect(new URL(advertised).pathname).toBe(`${overviewPage.url}.md`);
  });

  test('a page with no markdown producer advertises no markdown twin', async () => {
    expect(changelog.metadata.alternates?.types).not.toHaveProperty('text/markdown');
    expect(changelog.metadata.alternates?.types).toHaveProperty('application/rss+xml');
  });
});
