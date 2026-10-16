import type { ProblemType } from '../schemas/api/_envelope.ts';
import { ProblemTypeSchema } from '../schemas/api/_envelope.ts';

type RegistryDataShape = Readonly<Record<string, Readonly<Record<string, string>>>>;

const RAW_REGISTRY = {
  'ps:shell:spawn-cursor': {
    'urn:ps:error:cursor-not-installed': 'not-installed',
    'urn:ps:error:cursor-spawn-timeout': 'timeout',
    'urn:ps:error:cursor-spawn-failed': 'spawn-error',
    'urn:ps:error:invalid-request': 'invalid-path',
    'urn:ps:error:path-escape': 'invalid-path',
  },
} as const satisfies RegistryDataShape;

type RawRegistry = typeof RAW_REGISTRY;

export type IpcChannelWithUrn = keyof RawRegistry;

export type IpcChannelReason<C extends IpcChannelWithUrn> = RawRegistry[C][keyof RawRegistry[C]];

type Registry = {
  readonly [C in IpcChannelWithUrn]: Readonly<Partial<Record<ProblemType, IpcChannelReason<C>>>>;
};

export const URN_IPC_REGISTRY: Registry = RAW_REGISTRY;

export const URN_HTTP_ONLY: ReadonlySet<ProblemType> = new Set<ProblemType>([
  'urn:ps:error:concurrent-overwrite-refused',
  'urn:ps:error:malformed-upload',
  'urn:ps:error:collision-exhaustion',
  'urn:ps:error:storage-full',
  'urn:ps:error:storage-readonly',
  'urn:ps:error:storage-error',
  'urn:ps:error:no-file-received',
  'urn:ps:error:method-not-allowed',
  'urn:ps:error:unsupported-media-type',
  'urn:ps:error:payload-too-large',
  'urn:ps:error:request-timeout',
  'urn:ps:error:internal-server-error',
  'urn:ps:error:symlink-refused',
  'urn:ps:error:links-not-permitted',
  'urn:ps:error:derived-index-unavailable',
  'urn:ps:error:loopback-required',
  'urn:ps:error:invalid-origin',
  'urn:ps:error:url-not-allowed',
  'urn:ps:error:dir-outside-home',
  'urn:ps:error:concurrent-operation',
  'urn:ps:error:clone-failed',
  'urn:ps:error:clone-timeout',
  'urn:ps:error:server-start-failed',
  'urn:ps:error:reserved-doc-name',
  'urn:ps:error:target-not-found',
  'urn:ps:error:stale-target',
  'urn:ps:error:frontmatter-edit-not-supported',
  'urn:ps:error:invalid-frontmatter-patch',
  'urn:ps:error:frontmatter-malformed',
  'urn:ps:error:no-active-session',
  'urn:ps:error:too-many-agent-sessions',
  'urn:ps:error:disk-divergence',
  'urn:ps:error:stale-external-write',
  'urn:ps:error:store-refused',
  'urn:ps:error:doc-removed',
  'urn:ps:error:branch-switched',
  'urn:ps:error:doc-in-conflict',
  'urn:ps:error:no-conflict-tracked',
  'urn:ps:error:unresolved-conflict-markers',
  'urn:ps:error:no-blocking-changes',
  'urn:ps:error:doc-not-found',
  'urn:ps:error:doc-already-exists',
  'urn:ps:error:doc-not-open',
  'urn:ps:error:rollback-not-configured',
  'urn:ps:error:doc-not-available',
  'urn:ps:error:backlink-index-not-configured',
  'urn:ps:error:file-rescan-not-configured',
  'urn:ps:error:shadow-not-configured',
  'urn:ps:error:host-not-allowed',
  'urn:ps:error:principal-not-available',
  'urn:ps:error:not-found',
  'urn:ps:error:auth-failed',
  'urn:ps:error:no-project-dir',
  'urn:ps:error:non-github-origin',
  'urn:ps:error:server-open-failed',
  'urn:ps:error:sync-not-active',
  'urn:ps:error:project-repo-not-configured',
  'urn:ps:error:seed-prerequisite-missing',
  'urn:ps:error:seed-invalid-root',
  'urn:ps:error:tag-index-not-configured',
  'urn:ps:error:template-not-found',
  'urn:ps:error:unsupported-asset-type',
  'urn:ps:error:asset-not-found',
  'urn:ps:error:single-file-mode',
  'urn:ps:error:collab-server-not-running',
  'urn:ps:error:gateway-timeout',
  'urn:ps:error:handoff-target-not-installed',
  'urn:ps:error:handoff-spawn-timeout',
  'urn:ps:error:handoff-spawn-failed',
  'urn:ps:error:registry-unreachable',
  'urn:ps:error:config-not-writable',
  'urn:ps:error:audit-superseded',
  'urn:ps:error:theme-name-taken',
  'urn:ps:error:theme-name-invalid',
]);

export type UrnIpcLookup<C extends IpcChannelWithUrn> =
  | { kind: 'mapped'; channel: C; reason: IpcChannelReason<C> }
  | { kind: 'http-only' }
  | { kind: 'unknown'; problemType: string };

export function lookupUrnInRegistry<C extends IpcChannelWithUrn>(
  problemType: string,
  channel: C,
): UrnIpcLookup<C> {
  const parsed = ProblemTypeSchema.safeParse(problemType);
  if (!parsed.success) {
    return { kind: 'unknown', problemType };
  }
  const known: ProblemType = parsed.data;
  const channelMap = URN_IPC_REGISTRY[channel];
  const reason = channelMap[known];
  if (reason !== undefined) {
    return { kind: 'mapped', channel, reason };
  }
  if (URN_HTTP_ONLY.has(known)) {
    return { kind: 'http-only' };
  }
  return { kind: 'unknown', problemType };
}

export function assertNeverUrnIpcLookup(value: never): never {
  throw new Error(`Unhandled UrnIpcLookup: ${JSON.stringify(value)}`);
}
