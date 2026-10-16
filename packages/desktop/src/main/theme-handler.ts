import type { PsThemeSource } from '../shared/bridge-contract.ts';
import { getLogger } from './desktop-logger.ts';

const VALID_THEME_SOURCES: ReadonlySet<PsThemeSource> = new Set(['system', 'light', 'dark']);

export function isOkThemeSource(value: unknown): value is PsThemeSource {
  return typeof value === 'string' && VALID_THEME_SOURCES.has(value as PsThemeSource);
}

type AppliedThemeSourceRecord = {
  readonly event: 'theme-source-set';
  readonly source: PsThemeSource;
  readonly prevSource: PsThemeSource;
  readonly trigger: 'ipc';
  readonly senderWindowId: number | null;
};

export type ThemeSourceRecord =
  | AppliedThemeSourceRecord
  | {
      readonly event: 'theme-source-set-rejected';
      readonly received: unknown;
      readonly reason: 'invalid-source';
      readonly senderWindowId: number | null;
    };

type ReceivedKind =
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'symbol'
  | 'function'
  | 'object'
  | 'array'
  | 'null'
  | 'undefined';

type DurableThemeSourceRecord =
  | AppliedThemeSourceRecord
  | {
      readonly event: 'theme-source-set-rejected';
      readonly receivedKind: ReceivedKind;
      readonly receivedSample: string | null;
      readonly reason: 'invalid-source';
      readonly senderWindowId: number | null;
    };

const RECEIVED_SAMPLE_MAX_CHARS = 64;

function classifyReceived(received: unknown): ReceivedKind {
  if (received === null) return 'null';
  if (Array.isArray(received)) return 'array';
  return typeof received;
}

function sampleReceived(received: unknown): string | null {
  return typeof received === 'string' ? received.slice(0, RECEIVED_SAMPLE_MAX_CHARS) : null;
}

export function emitThemeSourceRecord(record: ThemeSourceRecord): void {
  const durable: DurableThemeSourceRecord =
    record.event === 'theme-source-set-rejected'
      ? {
          event: record.event,
          reason: record.reason,
          senderWindowId: record.senderWindowId,
          receivedKind: classifyReceived(record.received),
          receivedSample: sampleReceived(record.received),
        }
      : record;

  try {
    console.warn(JSON.stringify(record));
  } catch {
    console.warn(JSON.stringify(durable));
  }
  getLogger('theme').info(durable, record.event);
}

interface ApplyThemeSourceDeps {
  getThemeSource: () => PsThemeSource;
  setThemeSource: (source: PsThemeSource) => void;
  emit: (record: ThemeSourceRecord) => void;
}

export function applyThemeSource(
  deps: ApplyThemeSourceDeps,
  source: PsThemeSource,
  senderWindowId: number | null,
): { ok: true } {
  if (!VALID_THEME_SOURCES.has(source)) {
    deps.emit({
      event: 'theme-source-set-rejected',
      received: source,
      reason: 'invalid-source',
      senderWindowId,
    });
    return { ok: true };
  }

  const prevSource = deps.getThemeSource();
  deps.setThemeSource(source);
  deps.emit({
    event: 'theme-source-set',
    source,
    prevSource,
    trigger: 'ipc',
    senderWindowId,
  });
  return { ok: true };
}
