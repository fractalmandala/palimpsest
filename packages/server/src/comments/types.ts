import type { CommentThreadMeta } from '@palimpsest/core';

export {
  type Anchor,
  type CommentTarget,
  type CommentThreadMeta,
  CommentThreadMetaSchema,
  type PropertyPath,
} from '@palimpsest/core';

export type CommentThreadPatch = Partial<
  Pick<CommentThreadMeta, 'docName' | 'anchor' | 'state' | 'queued' | 'latestComment' | 'updatedAt'>
>;
