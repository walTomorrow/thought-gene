import { useState } from "react";
import type { ProjectListItem } from "../../../shared/projects";
import {
  readProjectsViewMode,
  writeProjectsViewMode,
  type ProjectsViewMode,
} from "../../lib/app-route";
import { formatRelativeTime, truncateText } from "../../lib/format-relative-time";
import { markProjectOpened, useProjects } from "../../hooks/use-projects";
import { clearStoredBranchId } from "../../lib/branch-storage";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { ProjectActionsMenu } from "./ProjectActionsMenu";
import { ProjectCard } from "./ProjectCard";
import { ProjectListRow } from "./ProjectListRow";
import { ProjectMemoryBadges } from "./ProjectMemoryBadges";
import { ProjectsViewToggle } from "./ProjectsViewToggle";

type ProjectsPageProps = {
  onOpenProject: (projectId: string) => void;
};

export function ProjectsPage({ onOpenProject }: ProjectsPageProps) {
  const {
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
  } = useProjects();

  const [viewMode, setViewMode] = useState<ProjectsViewMode>(readProjectsViewMode);
  const [createOpen, setCreateOpen] = useState(false);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(
    null,
  );

  const otherProjects = continueProject
    ? projects.filter((project) => project.id !== continueProject.id)
    : projects;

  function handleViewChange(mode: ProjectsViewMode) {
    setViewMode(mode);
    writeProjectsViewMode(mode);
  }

  async function handleOpen(project: ProjectListItem) {
    clearStoredBranchId();
    await markProjectOpened(project.id);
    onOpenProject(project.id);
  }

  async function handleDelete(projectId: string) {
    await removeProject(projectId);
    setOpenMenuProjectId((current) => (current === projectId ? null : current));
  }

  async function handleCreate(input: { name: string; summary?: string }) {
    const result = await createNewProject(input);
    if (result) {
      clearStoredBranchId();
      setCreateOpen(false);
      onOpenProject(result.projectId);
    }
  }

  return (
    <div className="projects-page">
      <header className="projects-header">
        <div className="projects-brand">
          <span className="projects-brand-mark" aria-hidden="true">
            ◈
          </span>
          <span className="projects-brand-name">Thought Gene</span>
        </div>
        <nav className="projects-nav" aria-label="Primary">
          <span className="projects-nav-active">Projects</span>
        </nav>
        <button
          type="button"
          className="project-btn project-btn-primary"
          onClick={() => setCreateOpen(true)}
        >
          New Project
        </button>
      </header>

      {error && (
        <div className="projects-status projects-status-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void reload()}>
            Retry
          </button>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      )}

      {isLoading && (
        <div className="projects-status" role="status">
          <p>Loading projects…</p>
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <div className="projects-empty">
          <h2>Welcome to Thought Gene</h2>
          <p>
            Create your first project to start branching ideas, merging work, and
            building project memory.
          </p>
          <button
            type="button"
            className="project-btn project-btn-primary"
            onClick={() => setCreateOpen(true)}
          >
            Create your first project
          </button>
        </div>
      )}

      {!isLoading && continueProject && (
        <section className="projects-continue">
          <h2 className="projects-section-label">Continue Working</h2>
          <div className="projects-continue-shell">
            <button
              type="button"
              className="projects-continue-card"
              disabled={isDeleting}
              onClick={() => void handleOpen(continueProject)}
            >
              <h3 className="projects-continue-title">{continueProject.name}</h3>
              <p className="projects-continue-desc">
                {continueProject.summary?.trim() ||
                  "Pick up where you left off."}
              </p>
              <p className="projects-continue-meta">
                Updated {formatRelativeTime(continueProject.updatedAt)}
                {continueProject.lastActivity && (
                  <>
                    <span className="project-dot" aria-hidden="true">
                      ·
                    </span>
                    {truncateText(continueProject.lastActivity, 72)}
                  </>
                )}
              </p>
              <ProjectMemoryBadges memory={continueProject.memory} inline />
            </button>
            <ProjectActionsMenu
              project={continueProject}
              open={openMenuProjectId === continueProject.id}
              onOpenChange={(open) =>
                setOpenMenuProjectId(open ? continueProject.id : null)
              }
              onDelete={() => handleDelete(continueProject.id)}
              disabled={isDeleting}
              triggerClassName="project-card-menu"
            />
          </div>
        </section>
      )}

      {!isLoading && otherProjects.length > 0 && (
        <section className="projects-all">
          <div className="projects-all-header">
            <h2 className="projects-section-label">All Projects</h2>
            <ProjectsViewToggle mode={viewMode} onChange={handleViewChange} />
          </div>

          {viewMode === "cards" ? (
            <div className="projects-grid">
              {otherProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  disabled={isDeleting}
                  menuOpen={openMenuProjectId === project.id}
                  onMenuOpenChange={(open) =>
                    setOpenMenuProjectId(open ? project.id : null)
                  }
                  onOpen={() => void handleOpen(project)}
                  onDelete={() => handleDelete(project.id)}
                />
              ))}
            </div>
          ) : (
            <div className="projects-list">
              {otherProjects.map((project) => (
                <ProjectListRow
                  key={project.id}
                  project={project}
                  disabled={isDeleting}
                  menuOpen={openMenuProjectId === project.id}
                  onMenuOpenChange={(open) =>
                    setOpenMenuProjectId(open ? project.id : null)
                  }
                  onOpen={() => void handleOpen(project)}
                  onDelete={() => handleDelete(project.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <CreateProjectDialog
        open={createOpen}
        isSubmitting={isCreating}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
