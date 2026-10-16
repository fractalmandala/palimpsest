import '@/lib/desktop-bridge-types';

export function isNoteWindow(): boolean {
  if (typeof window === 'undefined') return false;
  return window.psDesktop?.config?.mode === 'note';
}
