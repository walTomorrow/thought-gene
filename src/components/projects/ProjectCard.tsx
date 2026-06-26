import type { ProjectListItem } from "../../../shared/projects";
import { formatRelativeTime, truncateText } from "../../lib/format-relative-time";
import { ProjectActionsMenu } from "./ProjectActionsMenu";
import { ProjectFeaturedBadge } from "./ProjectFeaturedBadge";
import { ProjectMemoryBadges } from "./ProjectMemoryBadges";

type ProjectCardProps = {
  project: ProjectListItem;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onDelete: () => void | Promise<void>;
  disabled?: boolean;
  featured?: boolean;
};

export function ProjectCard({
  project,
  menuOpen,
  onMenuOpenChange,
  onOpen,
  onDelete,
  disabled = false,
  featured = false,
}: ProjectCardProps) {
  return (
    <article className="project-card">
      <button
        type="button"
        className="project-card-main"
        disabled={disabled}
        onClick={onOpen}
      >
        <div className="project-card-title-row">
          <h3 className="project-card-title">{project.name}</h3>
          {featured && <ProjectFeaturedBadge />}
        </div>
        <p className="project-card-desc">
          {project.summary?.trim() ||
            "No description yet — open to start thinking."}
        </p>
        <p className="project-card-meta">
          Updated {formatRelativeTime(project.updatedAt)}
          <span className="project-dot" aria-hidden="true">
            ·
          </span>
          {project.branchCount} branch{project.branchCount === 1 ? "" : "es"}
        </p>
        {project.lastActivity && (
          <p className="project-card-activity">
            {truncateText(project.lastActivity, 80)}
          </p>
        )}
        <ProjectMemoryBadges memory={project.memory} />
      </button>
      <ProjectActionsMenu
        project={project}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onDelete={onDelete}
        disabled={disabled}
        triggerClassName="project-card-menu"
      />
    </article>
  );
}
