const DOCS_URL_BASE =
  'https://github.com/fractalmandala/palimpsest/blob/main/lint-plugins/ps-rules/README.md';

export function docsUrl(ruleName) {
  return `${DOCS_URL_BASE}#${ruleName}`;
}
