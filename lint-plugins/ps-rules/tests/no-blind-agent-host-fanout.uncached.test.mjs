import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  lintPsRulesFixture,
  readEnabledRuleIds,
  readRegisteredRuleNames,
  readRuleScope,
} from '../../../test-support/read-ps-rules-config.test-helper.ts';
import { FORBIDDEN_SPECS } from '../rules/no-blind-agent-host-fanout.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const RULE = 'no-blind-agent-host-fanout';
const CODE = `ps(${RULE})`;
const FIXTURE = `lint-plugins/ps-rules/__fixtures__/${RULE}.fixture.tsx`;
const DOCS = `lint-plugins/ps-rules/README.md#${RULE}`;

function fires() {
  return lintPsRulesFixture(FIXTURE).filter((d) => d.code === CODE);
}

describe(`${RULE} oxlint rule`, () => {
  test('fires at exactly its 5 planted positives, by its own code, and on no negative case', () => {
    const found = fires();
    expect(found.map((fire) => fire.position)).toEqual([
      '29:23',
      '30:23',
      '31:23',
      '32:23',
      '35:29',
    ]);
    for (const fire of found) {
      expect(fire.message).toContain('User-global skill installs must be gated on detected hosts');
      expect(fire.message).toContain('detectUserSkillHosts');
      expect(fire.message).toContain('HOSTS_WITH_USER_SKILL_DIR');
      expect(fire.message).toMatch(/https?:\/\/[^\s]+/);
      expect(fire.message).toContain(DOCS);
    }
  });

  test('rule is registered, enabled, and scoped via its RULE_SCOPES entry', async () => {
    expect(await readRegisteredRuleNames(REPO_ROOT)).toContain(RULE);
    expect(await readEnabledRuleIds(REPO_ROOT)).toContain(`ps/${RULE}`);
    expect(readRuleScope(REPO_ROOT, RULE)).not.toEqual([]);
  });

  test('its scope table still carries every include and exclude the rule depends on', () => {
    const scope = readRuleScope(REPO_ROOT, RULE);
    expect(scope).toContain(FIXTURE);
    expect(scope).toContain('packages/server/src/**/*.ts');
    expect(scope).toContain('packages/cli/src/**/*.ts');
    for (const excluded of ['!**/*.test.ts', '!**/*.test-helper.ts']) {
      expect(scope).not.toContain(excluded);
    }
  });

  test('bans every range shape of the spec, not just the one that shipped', () => {
    const matched = [...FORBIDDEN_SPECS].sort();
    expect(matched.length).toBeGreaterThan(0);
    for (const spec of ['skills@~1.5.0', 'skills@^1.5.0', 'skills@1.5.0', 'skills@latest']) {
      expect(matched).toContain(spec);
    }
    expect(matched).toContain('--agent');
  });
});
