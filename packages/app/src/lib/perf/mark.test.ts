import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { __resetCardinalityWarnings, getCollector, getHistogramSnapshot } from './collector';
import { mark, validatePerfMarkName } from './mark';

describe('validatePerfMarkName', () => {
  test('accepts canonical ok/<subsystem>/<event>', () => {
    expect(validatePerfMarkName('ps/sync/resolve')).toBe(true);
    expect(validatePerfMarkName('ps/nav/hash-change')).toBe(true);
    expect(validatePerfMarkName('ps/activity/mode-flip')).toBe(true);
    expect(validatePerfMarkName('ps/render/app')).toBe(true);
    expect(validatePerfMarkName('ps/vitals/inp')).toBe(true);
  });

  test('rejects missing ok/ prefix', () => {
    expect(validatePerfMarkName('sync/resolve')).toBe(false);
  });

  test('rejects missing event segment', () => {
    expect(validatePerfMarkName('ps/sync')).toBe(false);
  });

  test('rejects uppercase or snake_case', () => {
    expect(validatePerfMarkName('ps/Sync/resolve')).toBe(false);
    expect(validatePerfMarkName('ps/sync/RESOLVE')).toBe(false);
    expect(validatePerfMarkName('ps/sync/snake_case')).toBe(false);
  });
});

describe('mark', () => {
  beforeEach(() => {
    getCollector()?.reset();
  });

  afterEach(() => {
    try {
      performance.clearMeasures();
    } catch {}
  });

  test('creates a performance entry with the given name', () => {
    mark('ps/test/emit-one');
    const entries = performance.getEntriesByName('ps/test/emit-one');
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].entryType).toBe('measure');
  });

  test('performance entry carries devtools track-entry detail', () => {
    mark('ps/sync/resolve', { docName: 'README', elapsedMs: 42 });
    const entries = performance.getEntriesByName('ps/sync/resolve') as PerformanceMeasure[];
    const last = entries[entries.length - 1];
    const detail = last.detail as {
      devtools: {
        dataType: string;
        track: string;
        properties?: Array<[string, string]>;
      };
    };
    expect(detail.devtools.dataType).toBe('track-entry');
    expect(detail.devtools.track).toBe('ps/sync');
    const props = detail.devtools.properties ?? [];
    const asMap = Object.fromEntries(props);
    expect(asMap.docName).toBe('README');
    expect(asMap.elapsedMs).toBe('42');
  });

  test('in dev mode, collector.marks receives the event', () => {
    mark('ps/test/collector-push', { a: 1 });
    const c = getCollector();
    expect(c).toBeDefined();
    const found = c?.marks.toArray().find((m) => m.name === 'ps/test/collector-push');
    expect(found).toBeDefined();
    expect(found?.track).toBe('ps/test');
    expect(found?.properties).toEqual({ a: 1 });
  });

  test('properties serialize nested objects as JSON', () => {
    mark('ps/test/nested-props', { info: { key: 'value', n: 3 } });
    const last = performance.getEntriesByName('ps/test/nested-props')[0] as PerformanceMeasure;
    const detail = last.detail as {
      devtools: { properties?: Array<[string, string]> };
    };
    const asMap = Object.fromEntries(detail.devtools.properties ?? []);
    expect(asMap.info).toBe('{"key":"value","n":3}');
  });

  test('duration defaults to zero for point events', () => {
    mark('ps/test/point-event');
    const entry = performance.getEntriesByName('ps/test/point-event')[0] as PerformanceMeasure;
    expect(entry.duration).toBe(0);
  });
});

describe('mark.count', () => {
  beforeEach(() => {
    getCollector()?.reset();
    __resetCardinalityWarnings();
  });

  test('increments the counter total on each call', () => {
    mark.count('ps/test/cnt');
    mark.count('ps/test/cnt');
    mark.count('ps/test/cnt');
    const c = getCollector();
    expect(c?.counters['ps/test/cnt']?.total).toBe(3);
  });

  test('increments per-prop subcounters by stringified value', () => {
    mark.count('ps/pool/open', { hit: true });
    mark.count('ps/pool/open', { hit: true });
    mark.count('ps/pool/open', { hit: false });
    const c = getCollector();
    const counter = c?.counters['ps/pool/open'];
    expect(counter?.total).toBe(3);
    expect(counter?.byProp.hit).toEqual({ true: 2, false: 1 });
  });

  test('counters are independent by name', () => {
    mark.count('ps/a/x');
    mark.count('ps/b/y');
    mark.count('ps/a/x');
    const c = getCollector();
    expect(c?.counters['ps/a/x']?.total).toBe(2);
    expect(c?.counters['ps/b/y']?.total).toBe(1);
  });

  test('warns once when prop key cardinality exceeds 100 distinct values', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      for (let i = 0; i < 100; i += 1) {
        mark.count('ps/test/card', { docId: `d-${i}` });
      }
      const startCalls = warnSpy.mock.calls.length;
      mark.count('ps/test/card', { docId: 'd-101' });
      mark.count('ps/test/card', { docId: 'd-102' });
      mark.count('ps/test/card', { docId: 'd-103' });
      const warns = warnSpy.mock.calls
        .slice(startCalls)
        .filter((args) => String(args[0]).includes('cardinality footgun'));
      expect(warns.length).toBe(1);
      expect(String(warns[0]?.[0])).toContain('ps/test/card');
      expect(String(warns[0]?.[0])).toContain('docId');
      expect(getCollector()?.counters['ps/test/card']?.total).toBe(103);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('warns in dev when name fails the regex', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      mark.count('Bad/Name/Here');
      const found = warnSpy.mock.calls.some((args) => String(args[0]).includes('mark.count name'));
      expect(found).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe('mark.histogram', () => {
  beforeEach(() => {
    getCollector()?.reset();
  });

  test('records a sample and emits a paired DevTools mark', () => {
    mark.histogram('ps/test/dur', { mode: 'WYSIWYG' }, 25);
    const snap = getHistogramSnapshot('ps/test/dur');
    expect(snap?.count).toBe(1);
    expect(snap?.min).toBe(25);
    expect(snap?.max).toBe(25);

    const entries = performance.getEntriesByName('ps/test/dur');
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const last = entries[entries.length - 1] as PerformanceMeasure;
    const detail = last.detail as { devtools: { properties?: Array<[string, string]> } };
    const asMap = Object.fromEntries(detail.devtools.properties ?? []);
    expect(asMap.durationMs).toBe('25');
    expect(asMap.mode).toBe('WYSIWYG');
  });

  test('histograms are independent by name', () => {
    for (let i = 0; i < 5; i += 1) mark.histogram('ps/test/a', {}, 10);
    for (let i = 0; i < 3; i += 1) mark.histogram('ps/test/b', {}, 50);
    expect(getHistogramSnapshot('ps/test/a')?.count).toBe(5);
    expect(getHistogramSnapshot('ps/test/b')?.count).toBe(3);
    expect(getHistogramSnapshot('ps/test/a')?.p50).toBe(10);
    expect(getHistogramSnapshot('ps/test/b')?.p50).toBe(50);
  });

  test('warns in dev when name fails the regex', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      mark.histogram('Bad/Name', {}, 1);
      const found = warnSpy.mock.calls.some((args) =>
        String(args[0]).includes('mark.histogram name'),
      );
      expect(found).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
