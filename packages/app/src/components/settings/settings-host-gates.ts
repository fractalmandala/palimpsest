export function isPsDesktopHost(): boolean {
  return typeof window !== 'undefined' && window.psDesktop != null;
}

export function isTerminalSettingsAvailable(): boolean {
  return isPsDesktopHost() && window.psDesktop?.config.ptyAvailable === true;
}

export function isSpellcheckLanguageSelectionAvailable(): boolean {
  return isPsDesktopHost() && window.psDesktop?.platform !== 'darwin';
}
