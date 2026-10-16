import { readFileSync } from 'node:fs';
import * as root from '@palimpsest/core';
import * as agentRegistrySubpath from '@palimpsest/core/agent-registry';
import * as bridgeSubpath from '@palimpsest/core/bridge';
import * as bugReportSidecarNoteContentSubpath from '@palimpsest/core/bug-report-sidecar/note-content';
import * as checkpointKindsSubpath from '@palimpsest/core/checkpoint-kinds';
import * as clientVersionSubpath from '@palimpsest/core/client-version';
import * as commandsCommandIdentitySubpath from '@palimpsest/core/commands/command-identity';
import * as commentsLeafTextSubpath from '@palimpsest/core/comments/leaf-text';
import * as commentsPassageMatchSubpath from '@palimpsest/core/comments/passage-match';
import * as configAutoSyncModeSubpath from '@palimpsest/core/config/auto-sync-mode';
import * as configBindConfigDocSubpath from '@palimpsest/core/config/bind-config-doc';
import * as configBindPsignoreDocSubpath from '@palimpsest/core/config/bind-psignore-doc';
import * as configErrorsSubpath from '@palimpsest/core/config/errors';
import * as configFieldRegistrySubpath from '@palimpsest/core/config/field-registry';
import * as configMergeLayeredSubpath from '@palimpsest/core/config/merge-layered';
import * as configSchemaSubpath from '@palimpsest/core/config/schema';
import * as configSchemaLeafSubpath from '@palimpsest/core/config/schema-leaf';
import * as constantsActivitySubpath from '@palimpsest/core/constants/activity';
import * as constantsCc1Subpath from '@palimpsest/core/constants/cc1';
import * as constantsChromeSubpath from '@palimpsest/core/constants/chrome';
import * as constantsCodeLanguagesSubpath from '@palimpsest/core/constants/code-languages';
import * as constantsCreateNewBannerSubpath from '@palimpsest/core/constants/create-new-banner';
import * as constantsCreateNewProjectReasonSubpath from '@palimpsest/core/constants/create-new-project-reason';
import * as constantsDocLifecycleSubpath from '@palimpsest/core/constants/doc-lifecycle';
import * as constantsDocumentOpenSubpath from '@palimpsest/core/constants/document-open';
import * as constantsEditorsSubpath from '@palimpsest/core/constants/editors';
import * as constantsEmbeddedHostSubpath from '@palimpsest/core/constants/embedded-host';
import * as constantsFeatureFlagsSubpath from '@palimpsest/core/constants/feature-flags';
import * as constantsGithubSubpath from '@palimpsest/core/constants/github';
import * as constantsGraphSubpath from '@palimpsest/core/constants/graph';
import * as constantsManualUpdateCheckSubpath from '@palimpsest/core/constants/manual-update-check';
import * as constantsMcpSubpath from '@palimpsest/core/constants/mcp';
import * as constantsMenuLabelsSubpath from '@palimpsest/core/constants/menu-labels';
import * as constantsNativeMenuLabelsSubpath from '@palimpsest/core/constants/native-menu-labels';
import * as constantsPreviewEmbedStartersSubpath from '@palimpsest/core/constants/preview-embed-starters';
import * as constantsPreviewThemeTokensSubpath from '@palimpsest/core/constants/preview-theme-tokens';
import * as constantsProductSubpath from '@palimpsest/core/constants/product';
import * as constantsSkillsSubpath from '@palimpsest/core/constants/skills';
import * as constantsUninstallFeedbackSubpath from '@palimpsest/core/constants/uninstall-feedback';
import * as constantsUploadSubpath from '@palimpsest/core/constants/upload';
import * as extensionsCodeBlockFidelitySubpath from '@palimpsest/core/extensions/code-block-fidelity';
import * as extensionsFootnoteReferenceSubpath from '@palimpsest/core/extensions/footnote-reference';
import * as extensionsFrontmatterSubpath from '@palimpsest/core/extensions/frontmatter';
import * as extensionsImageReferenceFidelitySubpath from '@palimpsest/core/extensions/image-reference-fidelity';
import * as extensionsImageSrcFidelitySubpath from '@palimpsest/core/extensions/image-src-fidelity';
import * as extensionsJsxComponentSubpath from '@palimpsest/core/extensions/jsx-component';
import * as extensionsJsxInlineSubpath from '@palimpsest/core/extensions/jsx-inline';
import * as extensionsLinkFidelitySubpath from '@palimpsest/core/extensions/link-fidelity';
import * as extensionsMathInlineSubpath from '@palimpsest/core/extensions/math-inline';
import * as extensionsRawMdxFallbackSubpath from '@palimpsest/core/extensions/raw-mdx-fallback';
import * as extensionsSharedSubpath from '@palimpsest/core/extensions/shared';
import * as extensionsTagSubpath from '@palimpsest/core/extensions/tag';
import * as extensionsWikiLinkSubpath from '@palimpsest/core/extensions/wiki-link';
import * as extensionsWikiLinkEmbedSubpath from '@palimpsest/core/extensions/wiki-link-embed';
import * as frontmatterErrorsSubpath from '@palimpsest/core/frontmatter/errors';
import * as frontmatterSchemaSubpath from '@palimpsest/core/frontmatter/schema';
import * as frontmatterTagsSubpath from '@palimpsest/core/frontmatter/tags';
import * as frontmatterDiffSubpath from '@palimpsest/core/frontmatter-diff';
import * as gitWorktreeInventoryModelSubpath from '@palimpsest/core/git/worktree-inventory-model';
import * as gitWorktreeSelectorModelSubpath from '@palimpsest/core/git/worktree-selector-model';
import * as handoffSubpath from '@palimpsest/core/handoff';
import * as i18nBrowserLocaleProviderSubpath from '@palimpsest/core/i18n/browser-locale-provider';
import * as i18nDirectionSubpath from '@palimpsest/core/i18n/direction';
import * as i18nLocalesSubpath from '@palimpsest/core/i18n/locales';
import * as i18nResolveLocaleSubpath from '@palimpsest/core/i18n/resolve-locale';
import * as loggerTypesSubpath from '@palimpsest/core/logger-types';
import * as loggingRendererLogSubpath from '@palimpsest/core/logging/renderer-log';
import * as loggingSecretScrubSubpath from '@palimpsest/core/logging/secret-scrub';
import * as markdownSubpath from '@palimpsest/core/markdown';
import * as markdownCodeFenceSubpath from '@palimpsest/core/markdown/code-fence';
import * as markdownHtmlToMdastSubpath from '@palimpsest/core/markdown/html-to-mdast';
import * as markdownLintSubpath from '@palimpsest/core/markdown/lint';
import * as markdownMdastToHtmlSubpath from '@palimpsest/core/markdown/mdast-to-html';
import * as markdownPlainTextSubpath from '@palimpsest/core/markdown/plain-text';
import * as markdownReferenceLabelSubpath from '@palimpsest/core/markdown/reference-label';
import * as markdownResolveImageUrlSubpath from '@palimpsest/core/markdown/resolve-image-url';
import * as markdownSafeUrlSubpath from '@palimpsest/core/markdown/safe-url';
import * as markdownTagPromotionSubpath from '@palimpsest/core/markdown/tag-promotion';
import * as metricsParseHealthSubpath from '@palimpsest/core/metrics/parse-health';
import * as registrySubpath from '@palimpsest/core/registry';
import * as registryTypesSubpath from '@palimpsest/core/registry/types';
import * as schemasApiSubpath from '@palimpsest/core/schemas/api';
import * as schemasCc1Subpath from '@palimpsest/core/schemas/cc1';
import * as searchWorkspaceSearchSubpath from '@palimpsest/core/search/workspace-search';
import * as seedPlanWorkSubpath from '@palimpsest/core/seed-plan-work';
import * as sharingSubpath from '@palimpsest/core/sharing';
import * as skillTargetsSchemaSubpath from '@palimpsest/core/skill-targets/schema';
import * as skillsCatalogSchemaSubpath from '@palimpsest/core/skills-catalog/schema';
import * as skillsCatalogScopeSubpath from '@palimpsest/core/skills-catalog/scope';
import * as skillsCatalogSkillCostSubpath from '@palimpsest/core/skills-catalog/skill-cost';
import * as skillsCatalogSourceFieldsSubpath from '@palimpsest/core/skills-catalog/source-fields';
import * as syncPausedReasonSubpath from '@palimpsest/core/sync-paused-reason';
import * as terminalLayoutSubpath from '@palimpsest/core/terminal-layout';
import * as themeBase16Subpath from '@palimpsest/core/theme/base16';
import * as themeThemePluginsSubpath from '@palimpsest/core/theme/theme-plugins';
import * as typesAwarenessSubpath from '@palimpsest/core/types/awareness';
import * as typesIdentitySubpath from '@palimpsest/core/types/identity';
import * as typesPrincipalSubpath from '@palimpsest/core/types/principal';
import * as typesTimelineSubpath from '@palimpsest/core/types/timeline';
import * as uninstallBridgeSubpath from '@palimpsest/core/uninstall-bridge';
import * as utilDocNameSubpath from '@palimpsest/core/util/doc-name';
import * as utilsAssetHrefSubpath from '@palimpsest/core/utils/asset-href';
import * as utilsChunkedInsertSubpath from '@palimpsest/core/utils/chunked-insert';
import * as utilsCodeFenceTrackerSubpath from '@palimpsest/core/utils/code-fence-tracker';
import * as utilsEmbedUrlRewriteSubpath from '@palimpsest/core/utils/embed-url-rewrite';
import * as utilsExtensionSubpath from '@palimpsest/core/utils/extension';
import * as utilsFileSizeSubpath from '@palimpsest/core/utils/file-size';
import * as utilsGithubStarsSubpath from '@palimpsest/core/utils/github-stars';
import * as utilsGraphemeClipSubpath from '@palimpsest/core/utils/grapheme-clip';
import * as utilsHeadingScanSubpath from '@palimpsest/core/utils/heading-scan';
import * as utilsIdentitySubpath from '@palimpsest/core/utils/identity';
import * as utilsLinkTargetsSubpath from '@palimpsest/core/utils/link-targets';
import * as utilsLoomEmbedSubpath from '@palimpsest/core/utils/loom-embed';
import * as utilsPdfAnchorSubpath from '@palimpsest/core/utils/pdf-anchor';
import * as utilsRandomUuidSubpath from '@palimpsest/core/utils/random-uuid';
import * as utilsRelativeTimeSubpath from '@palimpsest/core/utils/relative-time';
import * as utilsResolveInternalHrefSubpath from '@palimpsest/core/utils/resolve-internal-href';
import * as utilsSanitizeFolderNameSubpath from '@palimpsest/core/utils/sanitize-folder-name';
import * as utilsSlugSubpath from '@palimpsest/core/utils/slug';
import * as utilsTargetIdentitySubpath from '@palimpsest/core/utils/target-identity';
import * as utilsTargetNamespaceSubpath from '@palimpsest/core/utils/target-namespace';
import * as utilsVimeoEmbedSubpath from '@palimpsest/core/utils/vimeo-embed';
import * as utilsWikiLinkResolveSubpath from '@palimpsest/core/utils/wiki-link-resolve';
import * as utilsYoutubeEmbedSubpath from '@palimpsest/core/utils/youtube-embed';
import { describe, expect, test } from 'vitest';

const PRE_EXISTING_KEYS = [
  '.',
  './shadow-repo-layout',
  './skill-folder-state',
  './git-repository',
  './server',
  './keepalive',
  './helper-bundle',
  './skills-catalog',
  './acp/thread-protocol',
  './acp/agent-posture',
  './acp/permissive-mode',
  './acp/codex-legacy-notice',
  './acp/tool-call-input',
  './desktop-bridge',
];

const MODULE_SUBPATHS: Record<string, object> = {
  './agent-registry': agentRegistrySubpath,
  './bridge': bridgeSubpath,
  './bug-report-sidecar/note-content': bugReportSidecarNoteContentSubpath,
  './checkpoint-kinds': checkpointKindsSubpath,
  './client-version': clientVersionSubpath,
  './commands/command-identity': commandsCommandIdentitySubpath,
  './comments/leaf-text': commentsLeafTextSubpath,
  './comments/passage-match': commentsPassageMatchSubpath,
  './config/auto-sync-mode': configAutoSyncModeSubpath,
  './config/bind-config-doc': configBindConfigDocSubpath,
  './config/bind-psignore-doc': configBindPsignoreDocSubpath,
  './config/errors': configErrorsSubpath,
  './config/field-registry': configFieldRegistrySubpath,
  './config/merge-layered': configMergeLayeredSubpath,
  './config/schema': configSchemaSubpath,
  './config/schema-leaf': configSchemaLeafSubpath,
  './constants/activity': constantsActivitySubpath,
  './constants/cc1': constantsCc1Subpath,
  './constants/chrome': constantsChromeSubpath,
  './constants/code-languages': constantsCodeLanguagesSubpath,
  './constants/create-new-banner': constantsCreateNewBannerSubpath,
  './constants/create-new-project-reason': constantsCreateNewProjectReasonSubpath,
  './constants/doc-lifecycle': constantsDocLifecycleSubpath,
  './constants/document-open': constantsDocumentOpenSubpath,
  './constants/editors': constantsEditorsSubpath,
  './constants/embedded-host': constantsEmbeddedHostSubpath,
  './constants/feature-flags': constantsFeatureFlagsSubpath,
  './constants/github': constantsGithubSubpath,
  './constants/graph': constantsGraphSubpath,
  './constants/manual-update-check': constantsManualUpdateCheckSubpath,
  './constants/mcp': constantsMcpSubpath,
  './constants/menu-labels': constantsMenuLabelsSubpath,
  './constants/native-menu-labels': constantsNativeMenuLabelsSubpath,
  './constants/preview-embed-starters': constantsPreviewEmbedStartersSubpath,
  './constants/preview-theme-tokens': constantsPreviewThemeTokensSubpath,
  './constants/product': constantsProductSubpath,
  './constants/skills': constantsSkillsSubpath,
  './constants/uninstall-feedback': constantsUninstallFeedbackSubpath,
  './constants/upload': constantsUploadSubpath,
  './extensions/code-block-fidelity': extensionsCodeBlockFidelitySubpath,
  './extensions/footnote-reference': extensionsFootnoteReferenceSubpath,
  './extensions/frontmatter': extensionsFrontmatterSubpath,
  './extensions/image-reference-fidelity': extensionsImageReferenceFidelitySubpath,
  './extensions/image-src-fidelity': extensionsImageSrcFidelitySubpath,
  './extensions/jsx-component': extensionsJsxComponentSubpath,
  './extensions/jsx-inline': extensionsJsxInlineSubpath,
  './extensions/link-fidelity': extensionsLinkFidelitySubpath,
  './extensions/math-inline': extensionsMathInlineSubpath,
  './extensions/raw-mdx-fallback': extensionsRawMdxFallbackSubpath,
  './extensions/shared': extensionsSharedSubpath,
  './extensions/tag': extensionsTagSubpath,
  './extensions/wiki-link': extensionsWikiLinkSubpath,
  './extensions/wiki-link-embed': extensionsWikiLinkEmbedSubpath,
  './frontmatter-diff': frontmatterDiffSubpath,
  './frontmatter/errors': frontmatterErrorsSubpath,
  './frontmatter/schema': frontmatterSchemaSubpath,
  './frontmatter/tags': frontmatterTagsSubpath,
  './git/worktree-inventory-model': gitWorktreeInventoryModelSubpath,
  './git/worktree-selector-model': gitWorktreeSelectorModelSubpath,
  './handoff': handoffSubpath,
  './i18n/browser-locale-provider': i18nBrowserLocaleProviderSubpath,
  './i18n/direction': i18nDirectionSubpath,
  './i18n/locales': i18nLocalesSubpath,
  './i18n/resolve-locale': i18nResolveLocaleSubpath,
  './logger-types': loggerTypesSubpath,
  './logging/renderer-log': loggingRendererLogSubpath,
  './logging/secret-scrub': loggingSecretScrubSubpath,
  './markdown': markdownSubpath,
  './markdown/code-fence': markdownCodeFenceSubpath,
  './markdown/html-to-mdast': markdownHtmlToMdastSubpath,
  './markdown/lint': markdownLintSubpath,
  './markdown/mdast-to-html': markdownMdastToHtmlSubpath,
  './markdown/plain-text': markdownPlainTextSubpath,
  './markdown/reference-label': markdownReferenceLabelSubpath,
  './markdown/resolve-image-url': markdownResolveImageUrlSubpath,
  './markdown/safe-url': markdownSafeUrlSubpath,
  './markdown/tag-promotion': markdownTagPromotionSubpath,
  './metrics/parse-health': metricsParseHealthSubpath,
  './registry': registrySubpath,
  './registry/types': registryTypesSubpath,
  './schemas/api': schemasApiSubpath,
  './schemas/cc1': schemasCc1Subpath,
  './search/workspace-search': searchWorkspaceSearchSubpath,
  './seed-plan-work': seedPlanWorkSubpath,
  './sharing': sharingSubpath,
  './skill-targets/schema': skillTargetsSchemaSubpath,
  './skills-catalog/schema': skillsCatalogSchemaSubpath,
  './skills-catalog/scope': skillsCatalogScopeSubpath,
  './skills-catalog/skill-cost': skillsCatalogSkillCostSubpath,
  './skills-catalog/source-fields': skillsCatalogSourceFieldsSubpath,
  './sync-paused-reason': syncPausedReasonSubpath,
  './terminal-layout': terminalLayoutSubpath,
  './theme/base16': themeBase16Subpath,
  './theme/theme-plugins': themeThemePluginsSubpath,
  './types/awareness': typesAwarenessSubpath,
  './types/identity': typesIdentitySubpath,
  './types/principal': typesPrincipalSubpath,
  './types/timeline': typesTimelineSubpath,
  './uninstall-bridge': uninstallBridgeSubpath,
  './util/doc-name': utilDocNameSubpath,
  './utils/asset-href': utilsAssetHrefSubpath,
  './utils/chunked-insert': utilsChunkedInsertSubpath,
  './utils/code-fence-tracker': utilsCodeFenceTrackerSubpath,
  './utils/embed-url-rewrite': utilsEmbedUrlRewriteSubpath,
  './utils/extension': utilsExtensionSubpath,
  './utils/file-size': utilsFileSizeSubpath,
  './utils/github-stars': utilsGithubStarsSubpath,
  './utils/grapheme-clip': utilsGraphemeClipSubpath,
  './utils/heading-scan': utilsHeadingScanSubpath,
  './utils/identity': utilsIdentitySubpath,
  './utils/link-targets': utilsLinkTargetsSubpath,
  './utils/loom-embed': utilsLoomEmbedSubpath,
  './utils/pdf-anchor': utilsPdfAnchorSubpath,
  './utils/random-uuid': utilsRandomUuidSubpath,
  './utils/relative-time': utilsRelativeTimeSubpath,
  './utils/resolve-internal-href': utilsResolveInternalHrefSubpath,
  './utils/sanitize-folder-name': utilsSanitizeFolderNameSubpath,
  './utils/slug': utilsSlugSubpath,
  './utils/target-identity': utilsTargetIdentitySubpath,
  './utils/target-namespace': utilsTargetNamespaceSubpath,
  './utils/vimeo-embed': utilsVimeoEmbedSubpath,
  './utils/wiki-link-resolve': utilsWikiLinkResolveSubpath,
  './utils/youtube-embed': utilsYoutubeEmbedSubpath,
};

const CONDITION_ORDER = ['@inkeep/source', 'development', 'types', 'default'];

const packageJson: { exports: Record<string, Record<string, string>> } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);

const rootBindings = new Map(Object.entries(root));

describe('per-module core subpaths', () => {
  test('every export key beside the pre-existing entries is imported by this contract', () => {
    const declared = Object.keys(packageJson.exports).filter(
      (key) => !PRE_EXISTING_KEYS.includes(key),
    );
    expect(Object.keys(MODULE_SUBPATHS).sort()).toEqual(declared.sort());
  });

  test.each(Object.keys(MODULE_SUBPATHS))(
    '%s points its conditions at the module its name implies',
    (key) => {
      const conditions = packageJson.exports[key];
      const modulePath = key.slice(2);
      const flatName = modulePath.replaceAll('/', '-');
      expect(Object.keys(conditions ?? {})).toEqual(CONDITION_ORDER);
      expect([`./src/${modulePath}.ts`, `./src/${modulePath}/index.ts`]).toContain(
        conditions?.['@inkeep/source'],
      );
      expect(conditions?.development).toBe(conditions?.['@inkeep/source']);
      expect(conditions?.types).toBe(`./dist/${flatName}.d.mts`);
      expect(conditions?.default).toBe(`./dist/${flatName}.mjs`);
    },
  );

  test.each(Object.entries(MODULE_SUBPATHS))(
    '%s serves the same runtime bindings as the root barrel',
    (_key, namespace) => {
      const bindings = Object.entries(namespace);
      const shared = bindings.filter(([name]) => rootBindings.has(name));
      const divergent = shared
        .filter(([name, value]) => value !== rootBindings.get(name))
        .map(([name]) => name);
      expect(divergent).toEqual([]);
      if (bindings.length > 0) expect(shared.length).toBeGreaterThan(0);
    },
  );
});
