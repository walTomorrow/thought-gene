import { useCallback, useEffect, useState } from "react";
import { createBranch } from "../api/branches-client";
import { fetchWorkspace } from "../api/workspace-client";
import {
  clearStoredBranchId,
  readStoredBranchId,
  writeStoredBranchId,
} from "../lib/branch-storage";
import type { CreateBranchRequest, WorkspaceResponse } from "../types/message";

type UseWorkspaceResult = {
  workspace: WorkspaceResponse | null;
  isLoading: boolean;
  isSwitching: boolean;
  isCreating: boolean;
  error: string | null;
  selectBranch: (branchId: string) => Promise<void>;
  createBranch: (input: Omit<CreateBranchRequest, "projectId">) => Promise<void>;
  reload: () => Promise<void>;
  clearError: () => void;
};

/**
 * Loads workspace on mount and manages branch selection + creation.
 */
export function useWorkspace(): UseWorkspaceResult {
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async (branchId?: string) => {
    const data = await fetchWorkspace(branchId);

    if (branchId && data.branch.id !== branchId) {
      clearStoredBranchId();
    } else {
      writeStoredBranchId(data.branch.id);
    }

    setWorkspace(data);
    return data;
  }, []);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const storedBranchId = readStoredBranchId();
      await loadWorkspace(storedBranchId ?? undefined);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load workspace.";
      setError(message);
      setWorkspace(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadWorkspace]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectBranch = useCallback(
    async (branchId: string) => {
      if (!branchId || workspace?.branch.id === branchId) {
        return;
      }

      setIsSwitching(true);
      setError(null);

      try {
        await loadWorkspace(branchId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to switch branch.";
        setError(message);
      } finally {
        setIsSwitching(false);
      }
    },
    [loadWorkspace, workspace?.branch.id],
  );

  const createProjectBranch = useCallback(
    async (input: Omit<CreateBranchRequest, "projectId">) => {
      if (!workspace) {
        return;
      }

      setIsCreating(true);
      setError(null);

      try {
        const { branch } = await createBranch({
          projectId: workspace.project.id,
          title: input.title,
          purpose: input.purpose,
          parentBranchId: input.parentBranchId ?? workspace.branch.id,
        });
        await loadWorkspace(branch.id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create branch.";
        setError(message);
      } finally {
        setIsCreating(false);
      }
    },
    [loadWorkspace, workspace],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    workspace,
    isLoading,
    isSwitching,
    isCreating,
    error,
    selectBranch,
    createBranch: createProjectBranch,
    reload,
    clearError,
  };
}
