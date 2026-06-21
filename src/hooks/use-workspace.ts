import { useCallback, useEffect, useState } from "react";
import { fetchWorkspace } from "../api/workspace-client";
import type { WorkspaceResponse } from "../types/message";

type UseWorkspaceResult = {
  workspace: WorkspaceResponse | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  clearError: () => void;
};

/**
 * Loads the default project, main branch, and persisted messages on mount.
 */
export function useWorkspace(): UseWorkspaceResult {
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchWorkspace();
      setWorkspace(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load workspace.";
      setError(message);
      setWorkspace(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { workspace, isLoading, error, reload, clearError };
}
