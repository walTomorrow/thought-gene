/** localStorage key for the user's last-selected branch. */
export const ACTIVE_BRANCH_STORAGE_KEY = "thought-gene:activeBranchId";

export function readStoredBranchId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredBranchId(branchId: string): void {
  try {
    localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, branchId);
  } catch {
    // Ignore storage errors (private browsing, etc.)
  }
}

export function clearStoredBranchId(): void {
  try {
    localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
