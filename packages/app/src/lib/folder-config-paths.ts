export function frontmatterYamlPath(folderPath: string): string {
  return folderPath === '' ? '.ps/frontmatter.yml' : `${folderPath}/.ps/frontmatter.yml`;
}
