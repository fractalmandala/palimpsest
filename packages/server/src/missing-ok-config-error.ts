import { currentCliCommandName } from '@palimpsest/core';

export type MissingPsConfigKind = 'okdir' | 'config';

export function missingPsConfigMessage(): string {
  return `Palimpsest config not found at .ps/config.yml. Run ${currentCliCommandName()} init to scaffold OK in this directory.`;
}

export class MissingPsConfigError extends Error {
  readonly kind: MissingPsConfigKind;
  readonly projectDir: string;
  constructor(kind: MissingPsConfigKind, projectDir: string, options?: { cause?: unknown }) {
    super(missingPsConfigMessage(), options);
    this.name = 'MissingPsConfigError';
    this.kind = kind;
    this.projectDir = projectDir;
  }
}
