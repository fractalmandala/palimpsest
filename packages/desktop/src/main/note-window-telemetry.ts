import { withSpanSync } from '@palimpsest/server';
import type { NoteWindowEntryPoint } from './note-window-registry.ts';

export function recordNoteWindowOpened(info: { entryPoint: NoteWindowEntryPoint }): void {
  withSpanSync(
    'ps.desktop.noteWindowOpened',
    { attributes: { 'ps.desktop.note_entry_point': info.entryPoint } },
    () => undefined,
  );
}
