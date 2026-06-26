import type { ProjectListItem } from "../../../shared/projects";
import { formatRelativeTime, truncateText } from "../../lib/format-relative-time";
import { ProjectActionsMenu } from "./ProjectActionsMenu";
import { ProjectMemoryBadges } from "./ProjectMemoryBadges";

type ProjectListRowProps = {
  project: ProjectListItem;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onDelete: () => void | Promise<void>;
  disabled?: boolean;
};

export function ProjectListRow({
  project,
  menuOpen,
  onMenuOpenChange,
  onOpen,
  onDelete,
  disabled = false,
}: ProjectListRowProps) {
  return (
    <div className="project-list-row">
      <button
        type="button"
        className="project-list-row-main"
        disabled={disabled}
        onClick={onOpen}
      >
        <span className="project-list-row-icon" aria-hidden="true">
          ◈
        </span>
        <span className="project-list-row-content">
          <span className="project-list-row-title">{project.name}</span>
          <span className="project-list-row-desc">
            {truncateText(
              project.summary?.trim() || "No description yet.",
              100,
            )}
          </span>
          <span className="project-list-row-meta">
            Updated {formatRelativeTime(project.updatedAt)}
            <span className="project-dot" aria-hidden="true">
              ·
            </span>
            {project.branchCount} branches
          </span>
        </span>
        <ProjectMemoryBadges memory={project.memory} inline />
      </button>
      <ProjectActionsMenu
        project={project}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onDelete={onDelete}
        disabled={disabled}
        triggerClassName="project-list-row-menu"
      />
    </div>
  );
}
