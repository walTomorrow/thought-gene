import { useCallback, useEffect, useState } from "react";
import {
  createProject,
  deleteProject,
  listProjects,
  openProject,
} from "../api/projects-client";
import type { ProjectListItem } from "../../shared/projects";
import { readLastProjectId, writeLastProjectId } from "../lib/project-storage";

type UseProjectsResult = {
  projects: ProjectListItem[];
  continueProject: ProjectListItem | null;
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createNewProject: (input: {
    name: string;
    summary?: string;
  }) => Promise<{ projectId: string; rootBranchId: string } | null>;
  removeProject: (projectId: string) => Promise<boolean>;
  clearError: () => void;
};

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listProjects();
      setProjects(result.projects);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load projects.";
      setError(message);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const continueProject = (() => {
    const lastId = readLastProjectId();
    if (lastId) {
      const match = projects.find((project) => project.id === lastId);
      if (match) {
        return match;
      }
    }
    return projects[0] ?? null;
  })();

  const createNewProject = useCallback(
    async (input: { name: string; summary?: string }) => {
      setIsCreating(true);
      setError(null);

      try {
        const result = await createProject(input);
        writeLastProjectId(result.project.id);
        await reload();
        return {
          projectId: result.project.id,
          rootBranchId: result.rootBranchId,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create project.";
        setError(message);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [reload],
  );

  const removeProject = useCallback(
    async (projectId: string) => {
      setIsDeleting(true);
      setError(null);

      try {
        await deleteProject(projectId);
        await reload();
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete project.";
        setError(message);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [reload],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    projects,
    continueProject,
    isLoading,
    isCreating,
    isDeleting,
    error,
    reload,
    createNewProject,
    removeProject,
    clearError,
  };
}

export async function markProjectOpened(projectId: string): Promise<void> {
  writeLastProjectId(projectId);
  await openProject(projectId);
}
