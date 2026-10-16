import { registerCustomTheme } from '@pierre/diffs';
import { PS_SYNTAX_THEME_NAME, psSyntaxTheme } from './ps-syntax-theme';

let registered = false;

export function psPierreTheme(): string {
  if (!registered) {
    registerCustomTheme(PS_SYNTAX_THEME_NAME, () => Promise.resolve(psSyntaxTheme));
    registered = true;
  }
  return PS_SYNTAX_THEME_NAME;
}
