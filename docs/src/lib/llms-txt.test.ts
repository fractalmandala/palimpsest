import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { describe, expect, test } from 'vitest';
import { buildLlmsTxt, type LlmsTxtLink, marketingLinks } from './llms-txt';
import { MARKETING_MARKDOWN_PAGES } from './marketing-markdown-pages';

const docsLink: LlmsTxtLink = {
  url: 'https://github.com/fractalmandala/palimpsest/blob/main/docs/content/get-started/quickstart.mdx',
  name: 'Quickstart',
  description: 'Install and open your first file.',
};
const postLink: LlmsTxtLink = {
  url: 'https://github.com/fractalmandala/palimpsest/blog/markdownlint-support.md',
  name: 'Keeping you and your agents in check with markdownlint',
};

function build(overrides: Partial<Parameters<typeof buildLlmsTxt>[0]> = {}) {
  return buildLlmsTxt({ docs: [docsLink], blogPosts: [postLink], ...overrides });
}

describe('llms.txt index', () => {
  test('opens with a title and a blockquote summary', () => {
    const [title, summary] = build().split('\n\n');
    expect(title).toBe('# Palimpsest');
    expect(summary.startsWith('> ')).toBe(true);
    expect(summary.length).toBeGreaterThan('> '.length);
  });

  test('groups entries under Docs, Blog and Product in that order', () => {
    const headings = [...build().matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(headings).toEqual(['Docs', 'Blog', 'Product']);
  });

  test('lists a page an agent can fetch, with its notes', () => {
    expect(build()).toContain(
      '- [Quickstart](https://github.com/fractalmandala/palimpsest/blob/main/docs/content/get-started/quickstart.mdx): Install and open your first file.',
    );
  });

  test('neutralises raw HTML a description names in passing', () => {
    const body = build({
      docs: [
        {
          url: 'https://github.com/fractalmandala/palimpsest/blob/main/docs/content/reference/components/accordion.mdx',
          name: 'Accordion',
          description: 'Standalone expand/collapse via native HTML5 <details>/<summary>.',
        },
      ],
    });
    expect(body).toContain('native HTML5 \\<details>/\\<summary>.');
    expect(body).not.toContain(' <details>');
  });

  test('neutralises raw HTML a title names in passing', () => {
    const body = build({
      docs: [
        {
          url: 'https://github.com/fractalmandala/palimpsest/blob/main/docs/content/reference/components/accordion.mdx',
          name: 'The <details> element',
        },
      ],
    });
    expect(body).toContain('- [The \\<details> element](');
    expect(body).not.toContain('[The <details>');
  });

  test('keeps a bracket in a title inside the link label', () => {
    const body = build({
      docs: [{ url: 'https://github.com/fractalmandala/palimpsest/tree/main/docs/content', name: 'Arrays [and] slices' }],
    });
    expect(body).toContain('- [Arrays \\[and\\] slices](https://github.com/fractalmandala/palimpsest/tree/main/docs/content)');
  });

  test.each([
    ['A [link](u) title', 'A link title'],
    ['Bang ![img](u) in a title', 'Bang img in a title'],
  ])('reduces link syntax in a title to its words: %j', (name, expected) => {
    const bullet = build({ docs: [{ url: 'https://github.com/fractalmandala/palimpsest/tree/main/docs/content', name }] })
      .split('\n')
      .find((line) => line.startsWith('- [A ') || line.startsWith('- [Bang '));
    const tree = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .parse(bullet ?? '');

    const links: string[] = [];
    const images: string[] = [];
    visit(tree, 'link', (node) => links.push(node.url));
    visit(tree, 'image', (node) => images.push(node.url));

    expect(links).toEqual(['https://github.com/fractalmandala/palimpsest/tree/main/docs/content']);
    expect(images).toEqual([]);
    expect(bullet).toContain(`[${expected}]`);
  });

  test('leaves a bracket inside a code span alone', () => {
    const body = build({
      docs: [{ url: 'https://github.com/fractalmandala/palimpsest/tree/main/docs/content', name: 'The `items[]` prop' }],
    });
    const tree = unified().use(remarkParse).use(remarkGfm).parse(body);

    const spans: string[] = [];
    visit(tree, 'inlineCode', (node) => spans.push(node.value));
    expect(spans).toContain('items[]');
  });

  test.each([
    ['a parenthesis', 'https://github.com/fractalmandala/palimpsest/blog/note-)-end.md'],
    ['a space', 'https://github.com/fractalmandala/palimpsest/blog/pre post.md'],
  ])('round-trips a URL carrying %s', (_name, url) => {
    const body = build({ blogPosts: [{ url, name: 'Note' }] });
    const tree = unified().use(remarkParse).use(remarkGfm).parse(body);

    const urls: string[] = [];
    visit(tree, 'link', (node) => urls.push(node.url));
    expect(urls).toContain(url);
  });

  test('keeps a multi-line title on the bullet it belongs to', () => {
    const body = build({
      docs: [{ url: 'https://github.com/fractalmandala/palimpsest/tree/main/docs/content', name: 'Folded\n\ntitle' }],
    });
    expect(body).toContain('- [Folded title](https://github.com/fractalmandala/palimpsest/tree/main/docs/content)');
  });

  test('omits the notes separator when an entry has no description', () => {
    expect(build()).toContain(
      '- [Keeping you and your agents in check with markdownlint]' +
        '(https://github.com/fractalmandala/palimpsest/blog/markdownlint-support.md)\n',
    );
  });

  test('every listed URL is absolute and points at a Markdown rendition', () => {
    for (const url of [...build().matchAll(/^- \[(?:\\.|[^\]\\])*]\(([^)]+)\)/gm)].map(
      (m) => m[1],
    )) {
      expect(url).toMatch(/^https:\/\/palimpsest\.ai\//);
      expect(url).toMatch(/\.md$/);
    }
  });

  test('lists no URL twice', () => {
    const urls = [...build().matchAll(/^- \[(?:\\.|[^\]\\])*]\(([^)]+)\)/gm)].map((m) => m[1]);
    expect(urls).toEqual([...new Set(urls)]);
  });

  test('carries every curated marketing rendition', () => {
    const body = build();
    for (const page of MARKETING_MARKDOWN_PAGES) {
      expect(body).toContain(`(https://github.com/fractalmandala/palimpsest${page.path})`);
    }
  });

  test('lists the blog index ahead of the posts it indexes', () => {
    const body = build();
    expect(body.indexOf('/blog.md)')).toBeLessThan(body.indexOf('/blog/markdownlint-support.md)'));
  });

  test('drops a section with nothing to list rather than emitting it bare', () => {
    const headings = [...build({ docs: [] }).matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(headings).toEqual(['Blog', 'Product']);
  });

  test('keeps the blog section when only the index is available', () => {
    expect(build({ blogPosts: [] })).toContain('## Blog');
  });

  test('resolves marketing paths against the site origin', () => {
    expect(marketingLinks('Product').map((link) => link.url)).toContain(
      'https://github.com/fractalmandala/palimpsest/download.md',
    );
  });
});
