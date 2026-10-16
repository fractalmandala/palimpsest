import { docStem, RESERVED_LOG_STEM } from '../../../constants/reserved-docs.ts';
import { definePsfRule } from '../psf-runner.ts';

const RESERVED_STEMS = ['index', RESERVED_LOG_STEM] as const;

export const reservedCasing = definePsfRule('reserved-casing', (_tree, file) => {
  const docName = file.data.psfDocName;
  if (docName === undefined) return;
  const stem = docStem(docName);
  const lower = stem.toLowerCase();
  if (!RESERVED_STEMS.includes(lower as (typeof RESERVED_STEMS)[number])) return;
  if (stem === lower) return;
  file.message(
    `This file is named "${stem}", but the OpenKnowledge Format only recognizes "${lower}". On a case-sensitive filesystem a consumer reads it as an ordinary concept document rather than the reserved file it is meant to be.`,
  );
});
