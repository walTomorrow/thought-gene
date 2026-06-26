import { useCallback, useEffect, useState } from "react";
import {
  closeBranch as closeBranchApi,
  createBranch,
  reopenBranch as reopenBranchApi,
  updateBranch as updateBranchApi,
} from "../api/branches-client";
import { fetchWorkspace } from "../api/workspace-client";
import {
  clearStoredBranchId,
  readStoredBranchId,
  writeStoredBranchId,
} from "../lib/branch-storage";
import type { CreateBranchRequest, WorkspaceResponse } from "../types/message";
import { isRootBranch } from "../types/message";

type UseWorkspaceOptions = {
  projectId: string;
};

type UseWorkspaceResult = {
  workspace: WorkspaceResponse | null;
  isLoading: boolean;
  isSwitching: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
  selectBranch: (branchId: string) => Promise<void>;
  createBranch: (input: Omit<CreateBranchRequest, "projectId">) => Promise<void>;
  updateBranch: (input: { title: string; purpose: string }) => Promise<void>;
  closeBranch: () => Promise<void>;
  reopenBranch: () => Promise<void>;
  reload: () => Promise<void>;
  clearError: () => void;
};

/**
 * Loads workspace for a specific project and manages branch selection.
 */
export function useWorkspace({
  projectId,
}: UseWorkspaceOptions): UseWorkspaceResult {
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(
    async (branchId?: string) => {
      const data = await fetchWorkspace(projectId, branchId);

      if (branchId && data.branch.id !== branchId) {
        clearStoredBranchId();
      } else {
        writeStoredBranchId(data.branch.id);
      }

      setWorkspace(data);
      return data;
    },
    [projectId],
  );

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

  const updateProjectBranch = useCallback(
    async (input: { title: string; purpose: string }) => {
      if (!workspace) {
        return;
      }

      setIsUpdating(true);
      setError(null);

      try {
        await updateBranchApi(workspace.branch.id, {
          projectId: workspace.project.id,
          title: input.title,
          purpose: input.purpose,
        });
        await loadWorkspace(workspace.branch.id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update branch.";
        setError(message);
      } finally {
        setIsUpdating(false);
      }
    },
    [loadWorkspace, workspace],
  );

  const closeProjectBranch = useCallback(async () => {
    if (!workspace || workspace.isReadOnly) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await closeBranchApi(workspace.branch.id, {
        projectId: workspace.project.id,
      });

      const rootBranch = workspace.branches.find((b) => isRootBranch(b));
      const fallbackBranchId = rootBranch?.id ?? workspace.branches[0]?.id;
      await loadWorkspace(fallbackBranchId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to close branch.";
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  }, [loadWorkspace, workspace]);

  const reopenProjectBranch = useCallback(async () => {
    if (!workspace || !workspace.isReadOnly) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await reopenBranchApi(workspace.branch.id, {
        projectId: workspace.project.id,
      });
      await loadWorkspace(workspace.branch.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reopen branch.";
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  }, [loadWorkspace, workspace]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    workspace,
    isLoading,
    isSwitching,
    isCreating,
    isUpdating,
    error,
    selectBranch,
    createBranch: createProjectBranch,
    updateBranch: updateProjectBranch,
    closeBranch: closeProjectBranch,
    reopenBranch: reopenProjectBranch,
    reload,
    clearError,
  };
}
