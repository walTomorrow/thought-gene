export const LAST_PROJECT_STORAGE_KEY = "thought-gene:lastProjectId";

export function readLastProjectId(): string | null {
  try {
    return localStorage.getItem(LAST_PROJECT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeLastProjectId(projectId: string): void {
  try {
    localStorage.setItem(LAST_PROJECT_STORAGE_KEY, projectId);
  } catch {
    // Ignore storage errors
  }
}

export function clearLastProjectId(): void {
  try {
    localStorage.removeItem(LAST_PROJECT_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
