export function isOkDesktopHost(): boolean {
  return typeof window !== 'undefined' && window.psDesktop != null;
}

export function isTerminalSettingsAvailable(): boolean {
  return isOkDesktopHost() && window.psDesktop?.config.ptyAvailable === true;
}

export function isSpellcheckLanguageSelectionAvailable(): boolean {
  return isOkDesktopHost() && window.psDesktop?.platform !== 'darwin';
}
