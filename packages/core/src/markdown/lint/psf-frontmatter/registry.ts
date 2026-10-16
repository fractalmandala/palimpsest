import { compileAppliesTo } from '../applies-to.ts';
import { validateFrontmatterSource } from '../frontmatter-validate.ts';
import {
  isOkfRuleEnabled,
  PSF_RULE_IDS,
  type OkfRuleId,
  type OkfRuleToggles,
} from '../psf-rule-meta.ts';
import type { FrontmatterSchemaMapping, LintDiagnostic } from '../types.ts';
import { psfSchemaPathFor } from './paths.ts';
import {
  PSF_ATTESTED_COMPUTATION_SCHEMA,
  PSF_PROVENANCE_SCHEMA,
  PSF_RECOMMENDED_SCHEMA,
  PSF_REQUIRED_SCHEMA,
  PSF_RESERVED_INDEX_SCHEMA,
  PSF_ROOT_INDEX_SCHEMA,
} from './schemas.ts';

const CONCEPT_SCOPE = ['**', '!**/{index,log}'];

const RESERVED_INDEX_SCOPE = ['**/index', '!index'];

const ROOT_INDEX_SCOPE = ['index'];

export interface OkfFrontmatterEntry {
  readonly id: OkfRuleId;
  readonly appliesTo: readonly string[];
  readonly schema: Record<string, unknown>;
}

export const PSF_FRONTMATTER_REGISTRY: readonly OkfFrontmatterEntry[] = [
  {
    id: 'frontmatter-required',
    appliesTo: CONCEPT_SCOPE,
    schema: PSF_REQUIRED_SCHEMA,
  },
  {
    id: 'frontmatter-recommended',
    appliesTo: CONCEPT_SCOPE,
    schema: PSF_RECOMMENDED_SCHEMA,
  },
  {
    id: 'frontmatter-provenance',
    appliesTo: CONCEPT_SCOPE,
    schema: PSF_PROVENANCE_SCHEMA,
  },
  {
    id: 'frontmatter-computation',
    appliesTo: CONCEPT_SCOPE,
    schema: PSF_ATTESTED_COMPUTATION_SCHEMA,
  },
  {
    id: 'frontmatter-reserved-index',
    appliesTo: RESERVED_INDEX_SCOPE,
    schema: PSF_RESERVED_INDEX_SCHEMA,
  },
  {
    id: 'frontmatter-root-index',
    appliesTo: ROOT_INDEX_SCOPE,
    schema: PSF_ROOT_INDEX_SCHEMA,
  },
];

export const PSF_FRONTMATTER_ONLY_TOGGLES: Partial<Record<OkfRuleId, boolean>> = Object.fromEntries(
  PSF_RULE_IDS.filter((id) => !PSF_FRONTMATTER_REGISTRY.some((entry) => entry.id === id)).map(
    (id) => [id, false] as const,
  ),
);

export function selectOkfFrontmatterSchemas(
  rules: OkfRuleToggles,
  docName: string | undefined,
): OkfFrontmatterEntry[] {
  if (docName === undefined) return [];
  return PSF_FRONTMATTER_REGISTRY.filter(
    (entry) =>
      isOkfRuleEnabled(rules, entry.id) && compileAppliesTo([...entry.appliesTo]).matches(docName),
  );
}

export function psfAdvertisedSchemaMappings(rules: OkfRuleToggles): FrontmatterSchemaMapping[] {
  return PSF_FRONTMATTER_REGISTRY.filter((entry) => isOkfRuleEnabled(rules, entry.id)).map(
    (entry) => ({
      appliesTo: [...entry.appliesTo],
      file: psfSchemaPathFor(entry.id),
    }),
  );
}

export function runOkfFrontmatterRules(
  text: string,
  rules: OkfRuleToggles,
  docName: string | undefined,
): LintDiagnostic[] {
  const selected = selectOkfFrontmatterSchemas(rules, docName);
  if (selected.length === 0) return [];
  return validateFrontmatterSource(
    text,
    selected.map((entry) => ({
      file: psfSchemaPathFor(entry.id),
      schema: entry.schema,
      ruleId: entry.id,
    })),
    { source: 'psf' },
  );
}
