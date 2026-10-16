import type { Root } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { lintRule } from 'unified-lint-rule';
import type { Point, Position } from 'unist';
import { VFile } from 'vfile';
import type { VFileMessage } from 'vfile-message';
import { compileAppliesTo } from './applies-to.ts';
import type { LintDiagnostic, LintPosition, LintRange } from './types.ts';

declare module 'vfile' {
  interface VFileDataMap {
    psfDocName?: string;
  }
}

type PsfRuleFn = (tree: Root, file: VFile) => void;

export function definePsfRule(id: string, rule: PsfRuleFn) {
  return lintRule(`psf:${id}`, (tree, file) => {
    try {
      rule(tree as Root, file);
    } catch (err) {
      console.warn(
        `[lint] OKF rule "${id}" failed${file.data.psfDocName ? ` on "${file.data.psfDocName}"` : ''}`,
        err,
      );
    }
  });
}

export function defineScopedPsfRule(id: string, appliesTo: string, rule: PsfRuleFn) {
  const scope = compileAppliesTo(appliesTo);
  return definePsfRule(id, (tree, file) => {
    if (scope.matches(file.data.psfDocName)) rule(tree, file);
  });
}

export type PsfRule = ReturnType<typeof definePsfRule>;

const point = (p: Point): LintPosition => ({ line: p.line - 1, character: p.column - 1 });

function rangeOf(place: Point | Position | null | undefined, lines: readonly string[]): LintRange {
  if (place && 'start' in place) return { start: point(place.start), end: point(place.end) };
  if (place) {
    const start = point(place);
    return { start, end: { line: start.line, character: lines[start.line]?.length ?? 0 } };
  }
  return { start: { line: 0, character: 0 }, end: { line: 0, character: lines[0]?.length ?? 0 } };
}

function toDiagnostic(message: VFileMessage, lines: readonly string[]): LintDiagnostic {
  return {
    range: rangeOf(message.place, lines),
    severity: 'warning',
    source: 'psf',
    code: message.ruleId ?? 'psf',
    message: message.reason,
  };
}

export function runPsfRules(
  text: string,
  rules: readonly PsfRule[],
  docName?: string,
): LintDiagnostic[] {
  if (rules.length === 0) return [];
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']);
  for (const rule of rules) processor.use(rule);
  const file = new VFile({ value: text });
  if (docName !== undefined) file.data.psfDocName = docName;
  const tree = processor.parse(file);
  processor.runSync(tree, file);
  const lines = text.split('\n');
  return file.messages.map((message) => toDiagnostic(message, lines));
}
