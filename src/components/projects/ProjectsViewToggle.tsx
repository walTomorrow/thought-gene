import type { ProjectsViewMode } from "../../lib/app-route";

type ProjectsViewToggleProps = {
  mode: ProjectsViewMode;
  onChange: (mode: ProjectsViewMode) => void;
};

export function ProjectsViewToggle({
  mode,
  onChange,
}: ProjectsViewToggleProps) {
  return (
    <div
      className="projects-view-toggle"
      role="group"
      aria-label="Project view mode"
    >
      <button
        type="button"
        className={`projects-view-toggle-btn ${mode === "cards" ? "projects-view-toggle-btn-active" : ""}`}
        aria-pressed={mode === "cards"}
        onClick={() => onChange("cards")}
      >
        <span className="projects-view-toggle-icon" aria-hidden="true">
          ⊞
        </span>
        Cards
      </button>
      <button
        type="button"
        className={`projects-view-toggle-btn ${mode === "list" ? "projects-view-toggle-btn-active" : ""}`}
        aria-pressed={mode === "list"}
        onClick={() => onChange("list")}
      >
        <span className="projects-view-toggle-icon" aria-hidden="true">
          ☰
        </span>
        List
      </button>
    </div>
  );
}
