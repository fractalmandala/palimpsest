import { MarkdownManager, sharedExtensions } from '@palimpsest/core';
import { getSchema } from '@tiptap/core';

export const mdManager = new MarkdownManager({
  extensions: sharedExtensions,
  deriveStructuralFreshness: true,
});

export const schema = getSchema(sharedExtensions);
