import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  lintPsRulesFixture,
  readEnabledRuleIds,
  readRegisteredRuleNames,
} from '../../../test-support/read-ps-rules-config.test-helper.ts';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const RULE = 'no-unportaled-editor-content';
const CODE = `ps(${RULE})`;
const FIXTURE = `lint-plugins/ps-rules/__fixtures__/${RULE}.fixture.tsx`;
const DOCS = `lint-plugins/ps-rules/README.md#${RULE}`;

function fires() {
  return lintPsRulesFixture(FIXTURE).filter((d) => d.code === CODE);
}

describe(`${RULE} oxlint rule`, () => {
  test('fires at exactly its 3 positive cases, by its own code, and on no negative case', () => {
    const found = fires();
    expect(found.map((fire) => fire.position)).toEqual(['21:10', '26:10', '33:7']);
    for (const fire of found) {
      expect(fire.message).toContain('Portal-only: render <EditorContent');
      expect(fire.message).toContain('render <EditorContent />');
      expect(fire.message).toMatch(/https?:\/\/[^\s]+/);
      expect(fire.message).toContain(DOCS);
    }
  });

  test('rule is registered, enabled, and deliberately unscoped', async () => {
    expect(await readRegisteredRuleNames(REPO_ROOT)).toContain(RULE);
    expect(await readEnabledRuleIds(REPO_ROOT)).toContain(`ps/${RULE}`);
  });
});
