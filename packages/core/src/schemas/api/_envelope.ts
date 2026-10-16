import type { StandardSchemaV1 } from '@standard-schema/spec';
import { z } from 'zod';

import { URN_UUID_RE } from './_shared.ts';
import { isValidBranchName } from './share.ts';

export const ServerInfoBootSchema = z.object({
  startedAt: z.string().min(1),
  httpListenMs: z.number().nonnegative().optional(),
  seedWalkMs: z.number().nonnegative().optional(),
  indexesMs: z.number().nonnegative().optional(),
  readyMs: z.number().nonnegative().optional(),
  fileCount: z.number().nonnegative().optional(),
});
export type ServerInfoBoot = z.infer<typeof ServerInfoBootSchema>;

export const ServerInfoSuccessSchema = z
  .object({
    serverInstanceId: z.string().min(1),
    currentBranch: z.string().min(1).optional(),
    currentDiskAckSVs: z.record(z.string().min(1), z.string().min(1)).optional(),
    boot: ServerInfoBootSchema.optional(),
    collabClients: z.number().int().nonnegative().optional(),
    runtimeVersion: z.string().min(1).optional(),
    protocolVersion: z.number().int().positive().optional(),
  })
  .loose() satisfies StandardSchemaV1;
export type ServerInfoSuccess = z.infer<typeof ServerInfoSuccessSchema>;

export const PrincipalSuccessSchema = z
  .object({
    id: z.string().min(1),
    display_name: z.string().min(1),
    display_email: z.string(),
    source: z.enum(['git-config', 'synthesized']),
    created_at: z.string().min(1),
  })
  .loose() satisfies StandardSchemaV1;
export type PrincipalSuccess = z.infer<typeof PrincipalSuccessSchema>;

export const ApiConfigSuccessSchema = z
  .object({
    collabUrl: z.string().nullable(),
    previewUrl: z.string().nullable(),
    port: z.number(),
    singleFile: z.boolean().default(false),
  })
  .loose() satisfies StandardSchemaV1;
export type ApiConfigSuccess = z.infer<typeof ApiConfigSuccessSchema>;

export const ProblemTypeSchema = z.enum([
  'urn:ps:error:malformed-upload',
  'urn:ps:error:collision-exhaustion',
  'urn:ps:error:storage-full',
  'urn:ps:error:storage-readonly',
  'urn:ps:error:storage-error',
  'urn:ps:error:no-file-received',
  'urn:ps:error:path-escape',
  'urn:ps:error:symlink-refused',
  'urn:ps:error:links-not-permitted',
  'urn:ps:error:method-not-allowed',
  'urn:ps:error:invalid-request',
  'urn:ps:error:unsupported-media-type',
  'urn:ps:error:payload-too-large',
  'urn:ps:error:request-timeout',
  'urn:ps:error:internal-server-error',
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
  'urn:ps:error:doc-in-conflict',
  'urn:ps:error:concurrent-overwrite-refused',
  'urn:ps:error:unresolved-conflict-markers',
  'urn:ps:error:no-conflict-tracked',
  'urn:ps:error:no-blocking-changes',
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
  'urn:ps:error:cursor-not-installed',
  'urn:ps:error:cursor-spawn-timeout',
  'urn:ps:error:cursor-spawn-failed',
  'urn:ps:error:handoff-target-not-installed',
  'urn:ps:error:handoff-spawn-timeout',
  'urn:ps:error:handoff-spawn-failed',
  'urn:ps:error:registry-unreachable',
  'urn:ps:error:config-not-writable',
  'urn:ps:error:audit-superseded',
  'urn:ps:error:theme-name-taken',
  'urn:ps:error:theme-name-invalid',
]) satisfies StandardSchemaV1;
export type ProblemType = z.infer<typeof ProblemTypeSchema>;

export function assertNeverProblemType(value: never): never {
  throw new Error(`Unexpected ProblemType variant: ${JSON.stringify(value)}`);
}

/**
 * UPSTREAM(RFC 9457): this schema is the repo's single statement of the
 * problem+json contract every API error body conforms to — `type` a
 * `urn:ps:error:<kebab>` URN, `title` required and non-empty (stricter than
 * the spec, which allows omission), `status` equal to the HTTP status,
 * `instance` a `urn:uuid:` per emit (§3.1.5 wants a URI reference, which is
 * why the regex is narrower than a bare UUID) and mirrored into the log line,
 * `detail` optional free text, and `.loose()` so §3.2 extension members
 * survive. Producers and consumers derive from here.
 */
export const ProblemDetailsSchema = z
  .object({
    type: ProblemTypeSchema,
    title: z.string().min(1),
    status: z.number().int().min(400).max(599),
    instance: z.string().regex(URN_UUID_RE, 'instance must be urn:uuid:<uuid>').optional(),
    detail: z.string().optional(),
  })
  .loose() satisfies StandardSchemaV1;
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

export const UploadRequestSchema = z
  .object({
    parentDocName: z.string().min(1),
    placement: z.enum(['configured-attachments', 'parent-dir']).default('configured-attachments'),
    agentId: z.string().min(1).optional(),
    agentName: z.string().min(1).optional(),
  })
  .loose() satisfies StandardSchemaV1;
export type UploadRequest = z.infer<typeof UploadRequestSchema>;

export const UploadAssetSuccessSchema = z
  .object({
    src: z.string().min(1),
    path: z.string().min(1).optional(),
    deduped: z.boolean().optional(),
  })
  .loose() satisfies StandardSchemaV1;
export type UploadAssetSuccess = z.infer<typeof UploadAssetSuccessSchema>;

export const LocalOpCloneRequestSchema = z
  .object({
    url: z.string().min(1),
    dir: z.string().min(1),
    branch: z.string().min(1).refine(isValidBranchName, 'invalid branch name').optional(),
  })
  .loose() satisfies StandardSchemaV1;
export type LocalOpCloneRequest = z.infer<typeof LocalOpCloneRequestSchema>;

export const StreamingProblemEventSchema = z
  .object({
    type: z.literal('error'),
    problem: ProblemDetailsSchema,
  })
  .loose() satisfies StandardSchemaV1;
export type StreamingProblemEvent = z.infer<typeof StreamingProblemEventSchema>;
