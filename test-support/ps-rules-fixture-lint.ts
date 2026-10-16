import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';

const PS_RULES_FIXTURES = 'lint-plugins/ps-rules/__fixtures__';

const PS_RULES_FIXTURE_CONFIG = `${PS_RULES_FIXTURES}/oxlint.fixtures.json`;

const PS_ROOT = fileURLToPath(new URL('..', import.meta.url));

const OUTPUT_LIMIT = 4000;

const FIXTURE_SUFFIX = '.fixture.tsx';

interface ReportedDiagnostic {
  code?: string;
  filename?: string;
  message?: string;
  labels?: Array<{ span?: { line?: number; column?: number } }>;
}

export type PsRulesFixtureLint = { diagnostics: ReportedDiagnostic[] } | { error: string };

declare module 'vitest' {
  export interface ProvidedContext {
    psRulesFixtureLint?: PsRulesFixtureLint;
  }
}

function oxlintBin(): string {
  const manifest = createRequire(import.meta.url).resolve('oxlint/package.json');
  const { bin } = JSON.parse(readFileSync(manifest, 'utf8')) as { bin: Record<string, string> };
  return join(dirname(manifest), bin.oxlint);
}

function clip(text: string | null | undefined): string {
  const trimmed = text?.trim() || '(empty)';
  return trimmed.length > OUTPUT_LIMIT
    ? `${trimmed.slice(0, OUTPUT_LIMIT)}... (${trimmed.length - OUTPUT_LIMIT} more characters)`
    : trimmed;
}

function lintPsRulesFixtures(): PsRulesFixtureLint {
  const fixtures = readdirSync(join(PS_ROOT, PS_RULES_FIXTURES)).filter((name) =>
    name.endsWith(FIXTURE_SUFFIX),
  );
  const result = spawnSync(
    process.execPath,
    [oxlintBin(), '-f', 'json', '-c', PS_RULES_FIXTURE_CONFIG, PS_RULES_FIXTURES],
    { cwd: PS_ROOT, encoding: 'utf-8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 },
  );
  const output = `stdout: ${clip(result.stdout)}\nstderr: ${clip(result.stderr)}`;
  const run = `oxlint over ${PS_RULES_FIXTURES} with ${PS_RULES_FIXTURE_CONFIG}`;
  if (result.error || result.status !== 1) {
    return {
      error: `ps-rules fixture lint: ${run} ${result.error ? `could not run (${result.error.message})` : `exited ${result.status ?? `on signal ${result.signal}`}, not 1`}, so no rule's fires can be read from it. Every fixture carries error-severity fires, so a clean lint exits 1.\n${output}`,
    };
  }
  let report: { number_of_files?: number; diagnostics?: ReportedDiagnostic[] };
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return { error: `ps-rules fixture lint: ${run} exited 1 without a JSON report.\n${output}` };
  }
  const linted = new Set(fixtures.map((name) => `${PS_RULES_FIXTURES}/${name}`));
  const unattributed = (report.diagnostics ?? []).filter(
    (diagnostic) => typeof diagnostic.filename !== 'string' || !linted.has(diagnostic.filename),
  );
  if (unattributed.length > 0) {
    return {
      error: `ps-rules fixture lint: ${run} reported ${unattributed.length} diagnostic(s) naming no fixture, which no rule test would read: ${JSON.stringify(unattributed.slice(0, 3))}`,
    };
  }
  if (report.number_of_files !== fixtures.length) {
    return {
      error: `ps-rules fixture lint: ${run} linted ${report.number_of_files} files, but ${PS_RULES_FIXTURES} holds ${fixtures.length} *${FIXTURE_SUFFIX} fixtures (${fixtures.join(', ')}), so a fixture went unlinted or a lintable file that is not a fixture sits beside them.`,
    };
  }
  return { diagnostics: report.diagnostics ?? [] };
}

export default function providePsRulesFixtureLint(project: TestProject): void {
  const provide = () => project.provide('psRulesFixtureLint', lintPsRulesFixtures());
  provide();
  project.onTestsRerun(provide);
}
