import { afterEach, describe, expect, test, vi } from 'vitest';
import { getCollector } from './collector';
import { BUNDLED_TRACKS, mark } from './mark';

function captureBreadcrumbs() {
  const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  return {
    parsed(): Array<Record<string, unknown>> {
      return spy.mock.calls.flatMap(([first]) => {
        if (typeof first !== 'string') return [];
        try {
          return [JSON.parse(first) as Record<string, unknown>];
        } catch {
          return [];
        }
      });
    },
    spy,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  getCollector()?.reset();
});

describe('marks routed into diagnostic bundles', () => {
  test('a scroll-restore mark writes a breadcrumb keyed by the mark name', () => {
    const { parsed } = captureBreadcrumbs();
    mark('ps/scroll-restore/abandoned', {
      docName: 'notes/tall',
      target: 4200,
      scrollTop: 120,
      scrollHeight: 4800,
      clientHeight: 900,
      anchorMeasurable: true,
    });
    expect(parsed()).toEqual([
      {
        event: 'ps/scroll-restore/abandoned',
        docName: 'notes/tall',
        target: 4200,
        scrollTop: 120,
        scrollHeight: 4800,
        clientHeight: 900,
        anchorMeasurable: true,
      },
    ]);
  });

  test('a mark with no props still reaches the log', () => {
    const { parsed } = captureBreadcrumbs();
    mark('ps/scroll-restore/phase1-success');
    expect(parsed()).toEqual([{ event: 'ps/scroll-restore/phase1-success' }]);
  });

  test('the caret-reveal coords failure carries the document and the surface into the breadcrumb', () => {
    const { parsed } = captureBreadcrumbs();
    mark('ps/caret-reveal/coords-failed', { docName: 'notes/tall', surface: 'wysiwyg' });
    expect(parsed()).toEqual([
      {
        event: 'ps/caret-reveal/coords-failed',
        docName: 'notes/tall',
        surface: 'wysiwyg',
      },
    ]);
  });

  test('an unlisted track writes no breadcrumb', () => {
    const { spy } = captureBreadcrumbs();
    mark('ps/nav/hash-change', { docName: 'notes/a' });
    mark('ps/sync/resolve', { docName: 'notes/a' });
    expect(spy).not.toHaveBeenCalled();
  });

  test('every mark still reaches the collector, listed or not', () => {
    captureBreadcrumbs();
    mark('ps/scroll-restore/cross-mode', { docName: 'notes/a' });
    mark('ps/nav/hash-change', { docName: 'notes/a' });
    const names = getCollector()
      ?.marks.toArray()
      .map((m) => m.name);
    expect(names).toContain('ps/scroll-restore/cross-mode');
    expect(names).toContain('ps/nav/hash-change');
  });

  test('the allowlist holds exactly the families that are safe to write per emission', () => {
    expect([...BUNDLED_TRACKS]).toEqual(['ps/caret-reveal', 'ps/scroll-restore']);
  });

  test('membership is by whole track, so a lookalike prefix does not opt in', () => {
    const { spy } = captureBreadcrumbs();
    mark('ps/scroll/restore-ish', { docName: 'notes/a' });
    expect(spy).not.toHaveBeenCalled();
  });

  test('the breadcrumb does not depend on the DevTools measure API existing', () => {
    const { parsed } = captureBreadcrumbs();
    Object.defineProperty(performance, 'measure', { value: undefined, configurable: true });
    try {
      mark('ps/scroll-restore/phase2-success', { docName: 'notes/a', target: 100 });
    } finally {
      Reflect.deleteProperty(performance, 'measure');
    }
    expect(typeof performance.measure).toBe('function');
    expect(parsed()).toEqual([
      { event: 'ps/scroll-restore/phase2-success', docName: 'notes/a', target: 100 },
    ]);
  });
});
