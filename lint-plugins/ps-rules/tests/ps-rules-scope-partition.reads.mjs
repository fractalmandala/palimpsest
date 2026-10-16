const PS_RULES_DIR = 'lint-plugins/ps-rules';
export const PS_RULES_TESTS_DIR = `${PS_RULES_DIR}/tests`;
export const PS_RULES_FIXTURES_DIR = `${PS_RULES_DIR}/__fixtures__`;

export const ROUND_READS = {
  test: './ps-rules-scope-partition.uncached.test.mjs',
  reads: 'the ps-rules registry, scope table, rules, fixtures and tests it partitions, and the oxlint config that loads the plugin',
  include: [`${PS_RULES_DIR}/**`, 'oxlint.config.ts'],
};
