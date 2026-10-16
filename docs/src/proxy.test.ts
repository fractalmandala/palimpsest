import { NextRequest } from 'next/server';
import { describe, expect, test } from 'vitest';
import { proxy } from './proxy.ts';

function run(host: string, pathAndQuery: string) {
  const req = new NextRequest(`https://${host}${pathAndQuery}`, { headers: { host } });
  return proxy(req);
}

const HOST = 'example.com';
const AASA = '/.well-known/apple-app-site-association';

describe('proxy: no host canonicalization', () => {
  test('AASA passes through (no redirect) so Apple gets a direct 200', () => {
    const res = run(HOST, AASA);
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  test('the whole /.well-known/* prefix is excluded, not just AASA', () => {
    const res = run(HOST, '/.well-known/assetlinks.json');
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  test('a normal page is untouched (no redirect)', () => {
    const res = run(HOST, '/docs/get-started/quickstart');
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  test('root is untouched (no redirect)', () => {
    const res = run(HOST, '/');
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  test('query strings pass through with the page', () => {
    const res = run(HOST, '/d/abc123?ref=slack');
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });

  test('preview/other hosts pass through untouched', () => {
    const res = run('palimpsest-git-feat.vercel.app', '/docs');
    expect(res.headers.get('location')).toBeNull();
    expect(res.status).toBe(200);
  });
});

function negotiate(pathAndQuery: string, accept?: string) {
  const headers: Record<string, string> = { host: HOST };
  if (accept !== undefined) headers.accept = accept;
  const res = proxy(new NextRequest(`https://${HOST}${pathAndQuery}`, { headers }));
  const rewrite = res.headers.get('x-middleware-rewrite');
  return {
    status: res.status,
    location: res.headers.get('location'),
    rewrittenTo: rewrite ? new URL(rewrite).pathname : null,
  };
}

const MARKDOWN = 'text/markdown';
const BROWSER_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';

describe('proxy: Accept negotiation', () => {
  test('a docs page requested as Markdown serves its Markdown rendition', () => {
    expect(negotiate('/docs/get-started/quickstart', MARKDOWN).rewrittenTo).toBe(
      '/llms.mdx/get-started/quickstart',
    );
  });

  test('a one-segment slug resolves too', () => {
    expect(negotiate('/docs/overview', MARKDOWN).rewrittenTo).toBe('/llms.mdx/overview');
  });

  test('a trailing slash still resolves', () => {
    expect(negotiate('/docs/overview/', MARKDOWN).rewrittenTo).toBe('/llms.mdx/overview');
  });

  test('the query string survives the rewrite', () => {
    const res = negotiate('/docs/overview?ref=agent', MARKDOWN);
    expect(res.rewrittenTo).toBe('/llms.mdx/overview');
  });

  test('a browser gets the page untouched', () => {
    const res = negotiate('/docs/get-started/quickstart', BROWSER_ACCEPT);
    expect(res.rewrittenTo).toBeNull();
    expect(res.status).toBe(200);
  });

  test('a request with no Accept gets the page', () => {
    expect(negotiate('/docs/overview').rewrittenTo).toBeNull();
  });

  test('negotiation rewrites rather than redirecting, so the URL stays shareable', () => {
    const res = negotiate('/docs/overview', MARKDOWN);
    expect(res.location).toBeNull();
    expect(res.status).toBe(200);
  });

  test.each([
    ['the docs index, which only redirects', '/docs'],
    ['the changelog, built from a different source adapter', '/docs/changelog'],
    ['a changelog release page', '/docs/changelog/v0.4.0'],
    ['a path outside the docs tree', '/continue'],
    ['a share page', '/d/abc123'],
  ])('%s is never negotiated', (_label, path) => {
    expect(negotiate(path, MARKDOWN).rewrittenTo).toBeNull();
  });

  test.each(['/docs/overview.md', '/docs/overview.html.md', '/docs/overview.mdx'])(
    '%s is left to the rewrite rules rather than negotiated again',
    (path) => {
      expect(negotiate(path, MARKDOWN).rewrittenTo).toBeNull();
    },
  );

  test('negotiation applies on any host (no canonicalization to win)', () => {
    const res = proxy(
      new NextRequest(`https://${HOST}/docs/overview`, {
        headers: { host: HOST, accept: MARKDOWN },
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  test('the page a browser falls through to carries no Vary from the proxy', () => {
    const res = proxy(
      new NextRequest(`https://${HOST}/docs/overview`, {
        headers: { host: HOST, accept: BROWSER_ACCEPT },
      }),
    );
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
    expect(res.headers.get('vary')).toBeNull();
  });
});
