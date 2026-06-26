export function getProjectDeletePhrase(projectName: string): string {
  return `delete ${projectName}`;
}

export function isProjectDeletePhraseValid(
  input: string,
  projectName: string,
): boolean {
  return input === getProjectDeletePhrase(projectName);
}
