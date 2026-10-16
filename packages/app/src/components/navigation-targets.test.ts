import { createTargetNamespace, DOCUMENT_OPEN_BYTE_LIMIT } from '@palimpsest/core';
import { describe, expect, test } from 'vitest';
import {
  deriveKnownFolderPaths,
  docNameForNavigationTarget,
  downgradeFolderIndexForHashNav,
  largeFileNavigationTarget,
  psContentNavigationTarget,
  resolveNavigationTarget,
  withLargeFileOpenGuard,
} from './navigation-targets';

describe('deriveKnownFolderPaths', () => {
  test('derives ancestor folders from admitted doc names', () => {
    const folderPaths = deriveKnownFolderPaths(new Set(['docs/index', 'reports/q1/REPORT']));

    expect(folderPaths).toEqual(new Set(['docs', 'reports', 'reports/q1']));
  });
});

describe('resolveNavigationTarget', () => {
  test('slug-collision navigation agrees for reversed page inventories', () => {
    for (const order of [
      ['a/b', 'a-b'],
      ['a-b', 'a/b'],
    ]) {
      expect(resolveNavigationTarget('A B', { pages: new Set(order) })).toEqual({
        kind: 'doc',
        target: 'a-b',
        docName: 'a-b',
      });
    }
  });

  test('resolves managed-artifact docs as real doc targets (never missing)', () => {
    const docName = '__skill__/global/foo';
    expect(resolveNavigationTarget(docName, { pages: new Set() })).toEqual({
      kind: 'doc',
      target: docName,
      docName,
    });
  });

  test('redirects a stale `__template__/…` deep-link to the content doc', () => {
    expect(resolveNavigationTarget('__template__/notes/daily', { pages: new Set() })).toEqual({
      kind: 'doc',
      target: 'notes/.ps/templates/daily',
      docName: 'notes/.ps/templates/daily',
    });
    expect(resolveNavigationTarget('__template__/daily', { pages: new Set() })).toEqual({
      kind: 'doc',
      target: '.ps/templates/daily',
      docName: '.ps/templates/daily',
    });
    expect(resolveNavigationTarget('__template__/My%20Notes/daily', { pages: new Set() })).toEqual({
      kind: 'doc',
      target: 'My Notes/.ps/templates/daily',
      docName: 'My Notes/.ps/templates/daily',
    });
  });

  test('resolves a PROJECT skill content doc without page-index membership', () => {
    const target = '.ps/skills/new-skill/SKILL';
    expect(resolveNavigationTarget(target, { pages: new Set() })).toEqual({
      kind: 'doc',
      target,
      docName: target,
    });
  });

  test('resolves a GLOBAL skill bundle .md reference to an EDITABLE doc target', () => {
    expect(
      resolveNavigationTarget('__skill__/global/demo/references/notes', { pages: new Set() }),
    ).toEqual({
      kind: 'doc',
      target: '__skill__/global/demo/references/notes',
      docName: '__skill__/global/demo/references/notes',
    });
    expect(
      resolveNavigationTarget('__skill__/global/demo/references/sub/deep', { pages: new Set() }),
    ).toEqual({
      kind: 'doc',
      target: '__skill__/global/demo/references/sub/deep',
      docName: '__skill__/global/demo/references/sub/deep',
    });
  });

  test('the GLOBAL SKILL doc itself stays a normal editor doc target (not skill-file)', () => {
    expect(resolveNavigationTarget('__skill__/global/demo', { pages: new Set() })).toEqual({
      kind: 'doc',
      target: '__skill__/global/demo',
      docName: '__skill__/global/demo',
    });
  });

  test('redirects a stale `__skill__/project/<name>` deep-link to the content doc', () => {
    expect(resolveNavigationTarget('__skill__/project/foo', { pages: new Set() })).toEqual({
      kind: 'doc',
      target: '.ps/skills/foo/SKILL',
      docName: '.ps/skills/foo/SKILL',
    });
  });

  test('resolves skill and template file-path links as content docs', () => {
    const skillDoc = '.ps/skills/open-knowledge-pack-knowledge-base/SKILL';
    expect(resolveNavigationTarget(skillDoc, { pages: new Set([skillDoc]) })).toEqual({
      kind: 'doc',
      target: skillDoc,
      docName: skillDoc,
    });
    expect(resolveNavigationTarget('notes/.ps/templates/daily', { pages: new Set() })).toEqual({
      kind: 'doc',
      target: 'notes/.ps/templates/daily',
      docName: 'notes/.ps/templates/daily',
    });
  });

  test('resolves a template content doc structurally, normalizing a .md link to ext-less', () => {
    expect(resolveNavigationTarget('projects/.ps/templates/plan', { pages: new Set() })).toEqual({
      kind: 'doc',
      target: 'projects/.ps/templates/plan',
      docName: 'projects/.ps/templates/plan',
    });
    expect(resolveNavigationTarget('projects/.ps/templates/plan.md', { pages: new Set() })).toEqual(
      {
        kind: 'doc',
        target: 'projects/.ps/templates/plan',
        docName: 'projects/.ps/templates/plan',
      },
    );
  });

  test('prefers an exact document over folder landing notes', () => {
    const resolved = resolveNavigationTarget('reports', {
      pages: new Set(['reports', 'reports/index', 'reports/reports']),
      folderPaths: new Set(['reports']),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'reports',
      docName: 'reports',
    });
  });

  test('two double-extension files under one stem keep their qualified names', () => {
    const resolved = resolveNavigationTarget('docs/guide.md', {
      pages: new Set(['docs/guide.md', 'docs/guide.mdx']),
      folderPaths: new Set(['docs']),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'docs/guide.md',
      docName: 'docs/guide.md',
    });
  });

  test('an exact dotted identity outranks the extension-less page for the same stem', () => {
    const resolved = resolveNavigationTarget('docs/guide.md', {
      pages: new Set(['docs/guide.md', 'docs/guide.mdx', 'docs/guide']),
      folderPaths: new Set(['docs']),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'docs/guide.md',
      docName: 'docs/guide.md',
    });
  });

  test('falls back to extensionless document targets when no exact extension page exists', () => {
    const resolved = resolveNavigationTarget('docs/guide.md', {
      pages: new Set(['docs/guide']),
      folderPaths: new Set(['docs']),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'docs/guide',
      docName: 'docs/guide',
    });
  });

  test('prefers an exact document over a folder with the same basename', () => {
    const resolved = resolveNavigationTarget('hello', {
      pages: new Set(['hello']),
      folderPaths: new Set(['hello']),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'hello',
      docName: 'hello',
    });
  });

  test('uses trailing slash intent to open a folder with the same basename as a document', () => {
    const resolved = resolveNavigationTarget('hello/', {
      pages: new Set(['hello']),
      folderPaths: new Set(['hello']),
    });

    expect(resolved).toEqual({
      kind: 'folder',
      target: 'hello',
      folderPath: 'hello',
    });
  });

  test('resolves a canonical index note before a bare folder', () => {
    const resolved = resolveNavigationTarget('./reports/', {
      pages: new Set(['reports/index']),
    });

    expect(resolved).toEqual({
      kind: 'folder-index',
      target: 'reports',
      folderPath: 'reports',
      docName: 'reports/index',
      noteKind: 'canonical-index',
    });
  });

  test('falls back to the legacy folder note when no canonical index exists', () => {
    const resolved = resolveNavigationTarget('reports', {
      pages: new Set(['reports/reports']),
    });

    expect(resolved).toEqual({
      kind: 'folder-index',
      target: 'reports',
      folderPath: 'reports',
      docName: 'reports/reports',
      noteKind: 'legacy-folder-note',
    });
  });

  test('returns folder for a known folder with no landing note', () => {
    const resolved = resolveNavigationTarget('reports/', {
      pages: new Set(),
      folderPaths: new Set(['reports']),
    });

    expect(resolved).toEqual({
      kind: 'folder',
      target: 'reports',
      folderPath: 'reports',
    });
  });

  test('returns missing when neither a doc nor folder exists', () => {
    const resolved = resolveNavigationTarget('reports', {
      pages: new Set(['docs/index']),
    });

    expect(resolved).toEqual({
      kind: 'missing',
      target: 'reports',
    });
  });

  test('resolves a bare-name target to a same-basename file in a subfolder', () => {
    const resolved = resolveNavigationTarget('analysis', {
      pages: new Set(['andrew-data/project-x/analysis']),
      pagesByBasename: new Map([['analysis', 'andrew-data/project-x/analysis']]),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'andrew-data/project-x/analysis',
      docName: 'andrew-data/project-x/analysis',
    });
  });

  test('basename match is slug-normalized so [[Project X]] resolves to subfolder/project-x', () => {
    const resolved = resolveNavigationTarget('Project X', {
      pages: new Set(['subfolder/project-x']),
      pagesByBasename: new Map([['project-x', 'subfolder/project-x']]),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'subfolder/project-x',
      docName: 'subfolder/project-x',
    });
  });

  test('exact root match wins over a same-basename subfolder file', () => {
    const resolved = resolveNavigationTarget('analysis', {
      pages: new Set(['analysis', 'sub/analysis']),
      pagesByBasename: new Map([['analysis', 'sub/analysis']]),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'analysis',
      docName: 'analysis',
    });
  });

  test('full-path slug match wins over basename', () => {
    const resolved = resolveNavigationTarget('sub-analysis', {
      pages: new Set(['Sub-Analysis', 'other/analysis']),
      pagesBySlug: new Map([
        ['sub-analysis', 'Sub-Analysis'],
        ['other-analysis', 'other/analysis'],
      ]),
      pagesByBasename: new Map([
        ['sub-analysis', 'Sub-Analysis'],
        ['analysis', 'other/analysis'],
      ]),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'Sub-Analysis',
      docName: 'Sub-Analysis',
    });
  });

  test('canonical folder-index wins over basename', () => {
    const resolved = resolveNavigationTarget('reports', {
      pages: new Set(['reports/index', 'docs/reports']),
      pagesByBasename: new Map([
        ['index', 'reports/index'],
        ['reports', 'docs/reports'],
      ]),
    });

    expect(resolved).toEqual({
      kind: 'folder-index',
      target: 'reports',
      folderPath: 'reports',
      docName: 'reports/index',
      noteKind: 'canonical-index',
    });
  });

  test('legacy folder note wins over basename', () => {
    const resolved = resolveNavigationTarget('reports', {
      pages: new Set(['reports/reports', 'docs/reports']),
      pagesByBasename: new Map([['reports', 'docs/reports']]),
    });

    expect(resolved).toEqual({
      kind: 'folder-index',
      target: 'reports',
      folderPath: 'reports',
      docName: 'reports/reports',
      noteKind: 'legacy-folder-note',
    });
  });

  test('basename branch ignores path-shaped targets so [[sub/foo]] does not rewrite', () => {
    const resolved = resolveNavigationTarget('sub/foo', {
      pages: new Set(['other/foo']),
      pagesByBasename: new Map([['foo', 'other/foo']]),
    });

    expect(resolved).toEqual({
      kind: 'missing',
      target: 'sub/foo',
    });
  });

  test('basename wins over a bare-folder fallback so a file beats an empty container', () => {
    const resolved = resolveNavigationTarget('analysis', {
      pages: new Set(['analysis/sub', 'other/analysis']),
      folderPaths: new Set(['analysis', 'other']),
      pagesByBasename: new Map([
        ['sub', 'analysis/sub'],
        ['analysis', 'other/analysis'],
      ]),
    });

    expect(resolved).toEqual({
      kind: 'doc',
      target: 'other/analysis',
      docName: 'other/analysis',
    });
  });

  test('without pagesByBasename, bare-name target in subfolder remains missing (backward compat)', () => {
    const resolved = resolveNavigationTarget('analysis', {
      pages: new Set(['sub/analysis']),
    });

    expect(resolved).toEqual({
      kind: 'missing',
      target: 'analysis',
    });
  });
});

describe('psContentNavigationTarget (read-only .ps routing)', () => {
  const pages = new Set(['notes/real', '.ps/skills/writer/SKILL']);

  test('targets without a .ps path segment are not governed', () => {
    expect(psContentNavigationTarget('notes/real', { pages })).toBeNull();
    expect(psContentNavigationTarget('brand-new/idea', { pages })).toBeNull();
    expect(psContentNavigationTarget('docs/ok/guide', { pages })).toBeNull();
  });

  test('a template content doc keeps the normal doc flow even when it lags the page index', () => {
    expect(psContentNavigationTarget('.ps/templates/meeting', { pages })).toBeNull();
    expect(psContentNavigationTarget('team/.ps/templates/spec', { pages })).toBeNull();
  });

  test('page-list members stay normal content docs (skills carve-out)', () => {
    expect(psContentNavigationTarget('.ps/skills/writer/SKILL', { pages })).toBeNull();
  });

  test('doc-shaped .ps targets resolve to the read-only text viewer on their .md path', () => {
    expect(psContentNavigationTarget('.ps/raw-probe', { pages })).toEqual({
      kind: 'asset',
      target: '.ps/raw-probe.md',
      assetPath: '.ps/raw-probe.md',
      mediaKind: 'text',
    });
    expect(psContentNavigationTarget('notes/.ps/frontmatter', { pages })).toEqual({
      kind: 'asset',
      target: 'notes/.ps/frontmatter.md',
      assetPath: 'notes/.ps/frontmatter.md',
      mediaKind: 'text',
    });
  });

  test('a known on-disk extension overrides the .md default', () => {
    expect(psContentNavigationTarget('.ps/templates/a/b', { pages, docExt: '.mdx' })).toEqual({
      kind: 'asset',
      target: '.ps/templates/a/b.mdx',
      assetPath: '.ps/templates/a/b.mdx',
      mediaKind: 'text',
    });
  });

  test('nested template paths are not template files — they land on the viewer', () => {
    expect(psContentNavigationTarget('.ps/templates/a/b', { pages })).toMatchObject({
      kind: 'asset',
      assetPath: '.ps/templates/a/b.md',
    });
  });

  test('extension-carrying .ps leaves resolve as their own asset path', () => {
    expect(psContentNavigationTarget('.ps/config.yml', { pages })).toEqual({
      kind: 'asset',
      target: '.ps/config.yml',
      assetPath: '.ps/config.yml',
      mediaKind: 'text',
    });
    expect(psContentNavigationTarget('.ps/assets/logo.png', { pages })).toMatchObject({
      kind: 'asset',
      assetPath: '.ps/assets/logo.png',
      mediaKind: 'image',
    });
  });

  test('worktrees and local paths land read-only even though listings exclude them', () => {
    for (const target of ['.ps/worktrees/checkout/README', '.ps/local/config.yml']) {
      expect(psContentNavigationTarget(target, { pages })?.kind).toBe('asset');
    }
  });

  test('the docName contract is file-shaped: a leaf still gains its .md extension', () => {
    expect(psContentNavigationTarget('articles/.ps', { pages })).toMatchObject({
      kind: 'asset',
      assetPath: 'articles/.ps.md',
    });
  });
});

describe('resolveNavigationTarget — folder-shaped .ps targets', () => {
  const options = {
    pages: new Set(['articles/intro']),
    folderPaths: new Set(['articles']),
  };

  test('a revealed .ps directory does not resolve to a phantom .md asset', () => {
    for (const target of ['articles/.ps/', 'articles/.ps/templates/', '.ps/']) {
      expect(resolveNavigationTarget(target, options).kind).not.toBe('asset');
    }
  });

  test('folder-shaped misses resolve the same inside and outside .ps', () => {
    expect(resolveNavigationTarget('articles/nope/', options)).toEqual({
      kind: 'missing',
      target: 'articles/nope',
    });
    expect(resolveNavigationTarget('articles/.ps/', options)).toEqual({
      kind: 'missing',
      target: 'articles/.ps',
    });
    expect(resolveNavigationTarget('articles/.ps/templates/', options)).toEqual({
      kind: 'missing',
      target: 'articles/.ps/templates',
    });
    expect(resolveNavigationTarget('.ps/', options)).toEqual({
      kind: 'missing',
      target: '.ps',
    });
  });

  test('.ps folders backed by indexed skill docs still resolve as folders', () => {
    const skillOptions = { pages: new Set(['.ps/skills/writer/SKILL']) };
    for (const folderPath of ['.ps', '.ps/skills', '.ps/skills/writer']) {
      expect(resolveNavigationTarget(`${folderPath}/`, skillOptions)).toEqual({
        kind: 'folder',
        target: folderPath,
        folderPath,
      });
    }
  });

  test('doc-shaped .ps targets keep their read-only routing', () => {
    expect(resolveNavigationTarget('articles/.ps/templates/meeting', options)).toEqual({
      kind: 'doc',
      target: 'articles/.ps/templates/meeting',
      docName: 'articles/.ps/templates/meeting',
    });
    expect(
      resolveNavigationTarget('.ps/skills/writer/SKILL', {
        pages: new Set(['.ps/skills/writer/SKILL']),
      }),
    ).toEqual({
      kind: 'doc',
      target: '.ps/skills/writer/SKILL',
      docName: '.ps/skills/writer/SKILL',
    });
    expect(resolveNavigationTarget('articles/.ps', options)).toMatchObject({
      kind: 'asset',
      assetPath: 'articles/.ps.md',
    });
  });

  test('a trailing-slash template path returns missing (folder-shaped, not a doc)', () => {
    expect(resolveNavigationTarget('articles/.ps/templates/meeting/', options)).toEqual({
      kind: 'missing',
      target: 'articles/.ps/templates/meeting',
    });
  });
});

describe('resolveNavigationTarget .ps guard', () => {
  const options = { pages: new Set(['notes/real', '.ps/skills/writer/SKILL']) };

  test('doc-shaped .ps targets never resolve to missing — the viewer replaces create-mode', () => {
    expect(resolveNavigationTarget('.ps/raw-probe', options)).toEqual({
      kind: 'asset',
      target: '.ps/raw-probe.md',
      assetPath: '.ps/raw-probe.md',
      mediaKind: 'text',
    });
    expect(resolveNavigationTarget('notes/.ps/frontmatter', options)).toMatchObject({
      kind: 'asset',
      assetPath: 'notes/.ps/frontmatter.md',
    });
    expect(resolveNavigationTarget('.ps/worktrees/checkout/README', options)).toMatchObject({
      kind: 'asset',
    });
  });

  test('sanctioned .ps resolutions: skills and templates both stay content docs', () => {
    expect(resolveNavigationTarget('.ps/skills/writer/SKILL', options)).toEqual({
      kind: 'doc',
      target: '.ps/skills/writer/SKILL',
      docName: '.ps/skills/writer/SKILL',
    });
    expect(resolveNavigationTarget('.ps/templates/meeting', options)).toEqual({
      kind: 'doc',
      target: '.ps/templates/meeting',
      docName: '.ps/templates/meeting',
    });
  });

  test('.ps folder targets keep resolving to the folder overview', () => {
    expect(resolveNavigationTarget('.ps', options)).toEqual({
      kind: 'folder',
      target: '.ps',
      folderPath: '.ps',
    });
  });

  test('non-.ok misses keep the create-mode missing resolution', () => {
    expect(resolveNavigationTarget('brand-new/idea', options)).toEqual({
      kind: 'missing',
      target: 'brand-new/idea',
    });
  });
});

describe('docNameForNavigationTarget', () => {
  test('returns null for folder targets so folder navigation stays doc-free', () => {
    expect(
      docNameForNavigationTarget({
        kind: 'folder',
        target: 'reports',
        folderPath: 'reports',
      }),
    ).toBeNull();
  });

  test('returns the editable doc name for live and missing targets', () => {
    expect(
      docNameForNavigationTarget({
        kind: 'folder-index',
        target: 'reports',
        folderPath: 'reports',
        docName: 'reports/index',
        noteKind: 'canonical-index',
      }),
    ).toBe('reports/index');

    expect(
      docNameForNavigationTarget({
        kind: 'missing',
        target: 'reports/new-note',
      }),
    ).toBe('reports/new-note');
  });

  test('returns the represented doc name for large-file targets', () => {
    expect(
      docNameForNavigationTarget({
        kind: 'large-file',
        target: 'big',
        docName: 'big',
        size: 101,
        limit: 100,
      }),
    ).toBe('big');
  });
});

describe('large-file open guard', () => {
  test('rewrites an oversized document target to a non-opening large-file target', () => {
    expect(
      withLargeFileOpenGuard(
        {
          kind: 'doc',
          target: 'big',
          docName: 'big',
        },
        new Map([['big', { size: 101 }]]),
        100,
      ),
    ).toEqual({
      kind: 'large-file',
      target: 'big',
      docName: 'big',
      size: 101,
      limit: 100,
    });
  });

  test('passes through documents at the exact byte limit', () => {
    const target = {
      kind: 'doc',
      target: 'exact',
      docName: 'exact',
    } as const;

    expect(withLargeFileOpenGuard(target, new Map([['exact', { size: 100 }]]), 100)).toBe(target);
  });

  test('rewrites an oversized folder-index target to a large-file target', () => {
    expect(
      withLargeFileOpenGuard(
        {
          kind: 'folder-index',
          target: 'reports',
          folderPath: 'reports',
          docName: 'reports/index',
          noteKind: 'canonical-index',
        },
        new Map([['reports/index', { size: 101 }]]),
        100,
      ),
    ).toEqual({
      kind: 'large-file',
      target: 'reports/index',
      docName: 'reports/index',
      size: 101,
      limit: 100,
    });
  });

  test('blocks documents over the default cap', () => {
    const oversizedBytes = DOCUMENT_OPEN_BYTE_LIMIT + 1;

    expect(
      withLargeFileOpenGuard(
        {
          kind: 'doc',
          target: 'oversized',
          docName: 'oversized',
        },
        new Map([['oversized', { size: oversizedBytes }]]),
      ),
    ).toEqual({
      kind: 'large-file',
      target: 'oversized',
      docName: 'oversized',
      size: oversizedBytes,
      limit: DOCUMENT_OPEN_BYTE_LIMIT,
    });
  });

  test('largeFileNavigationTarget ignores missing metadata', () => {
    expect(largeFileNavigationTarget('unknown', undefined, 100)).toBeNull();
  });
});

describe('downgradeFolderIndexForHashNav', () => {
  test('rewrites a canonical-index target to its folder overview', () => {
    expect(
      downgradeFolderIndexForHashNav({
        kind: 'folder-index',
        target: 'reports',
        folderPath: 'reports',
        docName: 'reports/index',
        noteKind: 'canonical-index',
      }),
    ).toEqual({
      kind: 'folder',
      target: 'reports',
      folderPath: 'reports',
    });
  });

  test('rewrites a legacy-folder-note target to its folder overview', () => {
    expect(
      downgradeFolderIndexForHashNav({
        kind: 'folder-index',
        target: 'reports',
        folderPath: 'reports',
        docName: 'reports/reports',
        noteKind: 'legacy-folder-note',
      }),
    ).toEqual({
      kind: 'folder',
      target: 'reports',
      folderPath: 'reports',
    });
  });

  test('passes through non-folder-index targets unchanged', () => {
    const doc = { kind: 'doc', target: 'foo', docName: 'foo' } as const;
    expect(downgradeFolderIndexForHashNav(doc)).toBe(doc);

    const folder = { kind: 'folder', target: 'reports', folderPath: 'reports' } as const;
    expect(downgradeFolderIndexForHashNav(folder)).toBe(folder);

    const missing = { kind: 'missing', target: 'gone' } as const;
    expect(downgradeFolderIndexForHashNav(missing)).toBe(missing);
  });
});

describe('resolveNavigationTarget — Mermaid docs', () => {
  test('resolves a .mmd / .mermaid path to a doc target even when absent from pages', () => {
    const pages = new Set<string>();
    expect(resolveNavigationTarget('assets/flow.mmd', { pages })).toEqual({
      kind: 'doc',
      target: 'assets/flow.mmd',
      docName: 'assets/flow.mmd',
    });
    expect(resolveNavigationTarget('diagrams/seq.mermaid', { pages })).toEqual({
      kind: 'doc',
      target: 'diagrams/seq.mermaid',
      docName: 'diagrams/seq.mermaid',
    });
  });

  test('a trailing-slash (folder) form is not treated as a Mermaid doc', () => {
    expect(resolveNavigationTarget('assets/flow.mmd/', { pages: new Set() }).kind).not.toBe('doc');
  });
});

describe('editable text docs resolve as doc targets', () => {
  test('a .ts target opens the editable doc, not the asset viewer', () => {
    const target = resolveNavigationTarget('src/util.ts', {
      pages: new Set<string>(),
      pageMeta: new Map(),
      folderPaths: new Set<string>(),
      assetPaths: new Set<string>(['src/util.ts']),
    } as never);
    expect(target).toMatchObject({ kind: 'doc', docName: 'src/util.ts' });
  });
});

describe('markdown-extension normalization preserves document identity', () => {
  test('a managed-artifact skill reference normalizes before the early return', () => {
    expect(
      resolveNavigationTarget('__skill__/global/my-skill/references/guide.md', {
        pages: new Set<string>(),
      }),
    ).toEqual({
      kind: 'doc',
      target: '__skill__/global/my-skill/references/guide',
      docName: '__skill__/global/my-skill/references/guide',
    });
  });

  test('an external-skill bundle reference normalizes too', () => {
    expect(
      resolveNavigationTarget('__extskill__/my-skill/references/guide.mdx', {
        pages: new Set<string>(),
      }),
    ).toMatchObject({
      kind: 'doc',
      docName: '__extskill__/my-skill/references/guide',
    });
  });

  test('an exact dotted identity wins over its stripped twin', () => {
    const pages = new Set(['specs/demo/SPEC', 'specs/demo/SPEC.md']);
    expect(resolveNavigationTarget('specs/demo/SPEC.md', { pages })).toEqual({
      kind: 'doc',
      target: 'specs/demo/SPEC.md',
      docName: 'specs/demo/SPEC.md',
    });
  });

  test('only one terminal Markdown extension is removed', () => {
    const pages = new Set(['notes/idea']);
    expect(resolveNavigationTarget('notes/idea.md.md', { pages })).toMatchObject({
      kind: 'missing',
    });
    pages.add('notes/idea.md');
    expect(resolveNavigationTarget('notes/idea.md.md', { pages })).toMatchObject({
      kind: 'doc',
      docName: 'notes/idea.md',
    });
  });

  test('a file whose own name ends in .md keeps that extension', () => {
    const pages = new Set(['specs/demo/NOTE.md']);
    expect(resolveNavigationTarget('specs/demo/NOTE.md', { pages })).toEqual({
      kind: 'doc',
      target: 'specs/demo/NOTE.md',
      docName: 'specs/demo/NOTE.md',
    });
  });

  test('system and config doc names pass through untouched', () => {
    const synthetic = [
      '__system__',
      '__config__/project',
      '__local__/project',
      '__user__/config.yml',
    ];
    for (const docName of synthetic) {
      expect(resolveNavigationTarget(docName, { pages: new Set([docName]) })).toEqual({
        kind: 'doc',
        target: docName,
        docName,
      });
      expect(resolveNavigationTarget(docName, { pages: new Set<string>() }).target).toBe(docName);
    }
  });

  test('non-markdown doc names keep their extension', () => {
    expect(resolveNavigationTarget('assets/flow.mmd', { pages: new Set<string>() })).toMatchObject({
      kind: 'doc',
      docName: 'assets/flow.mmd',
    });
  });
});

describe('resolveNavigationTarget across canonically equivalent spellings', () => {
  const NFC = 'people/Ren\u00e9';
  const NFD = 'people/Rene\u0301';

  test('a document requested in NFC navigates to the stored NFD document', () => {
    expect(
      resolveNavigationTarget(NFC, { pages: createTargetNamespace('document', [NFD, 'notes']) }),
    ).toEqual({ kind: 'doc', target: NFD, docName: NFD });
  });

  test('a folder-shaped target resolves its index note under the stored spelling', () => {
    const pages = createTargetNamespace('document', [`${NFD}/index`, 'notes']);
    expect(resolveNavigationTarget(`${NFC}/`, { pages })).toEqual({
      kind: 'folder-index',
      target: NFC,
      folderPath: NFD,
      docName: `${NFD}/index`,
      noteKind: 'canonical-index',
    });
    expect(resolveNavigationTarget(NFC, { pages })).toEqual({
      kind: 'folder-index',
      target: NFC,
      folderPath: NFD,
      docName: `${NFD}/index`,
      noteKind: 'canonical-index',
    });
  });

  test('a folder requested in NFC resolves to the stored NFD folder path', () => {
    expect(
      resolveNavigationTarget(NFC, {
        pages: createTargetNamespace('document', [`${NFD}/notes`]),
        folderPaths: createTargetNamespace('folder', [NFD, 'people']),
      }),
    ).toEqual({ kind: 'folder', target: NFC, folderPath: NFD });
  });

  test('plain sets keep exact matching', () => {
    expect(resolveNavigationTarget(NFC, { pages: new Set([NFD]) })).toEqual({
      kind: 'missing',
      target: NFC,
    });
  });
});
