import type { ProjectMemoryCounts } from "../../../shared/projects";

type ProjectMemoryBadgesProps = {
  memory: ProjectMemoryCounts;
  inline?: boolean;
};

export function ProjectMemoryBadges({
  memory,
  inline = false,
}: ProjectMemoryBadgesProps) {
  return (
    <div
      className={`project-memory ${inline ? "project-memory-inline" : ""}`}
      aria-label="Project memory summary"
    >
      <span>📌 {memory.decisions}</span>
      <span>❓ {memory.openQuestions}</span>
      <span>🚧 {memory.deferredWork}</span>
    </div>
  );
}
