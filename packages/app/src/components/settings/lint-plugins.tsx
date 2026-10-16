import type { ReactNode } from 'react';
import {
  FrontmatterPluginSection,
  MarkdownlintPluginSection,
  PsfPluginSection,
} from './LintingSection';
import { LINT_PLUGIN_META, type LintPluginMeta } from './lint-plugin-meta';

type PluginSection = () => ReactNode;

const SECTIONS: Record<LintPluginMeta['id'], PluginSection> = {
  markdownlint: MarkdownlintPluginSection,
  frontmatter: FrontmatterPluginSection,
  psf: PsfPluginSection,
};

export interface LintPluginUi extends LintPluginMeta {
  Section: PluginSection;
}

export const LINT_PLUGIN_UI: LintPluginUi[] = LINT_PLUGIN_META.map((meta) => ({
  ...meta,
  Section: SECTIONS[meta.id],
}));
