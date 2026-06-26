export type ProjectsViewMode = "cards" | "list";

export const PROJECTS_VIEW_STORAGE_KEY = "thought-gene:projectsView";

export function readProjectsViewMode(): ProjectsViewMode {
  try {
    const value = localStorage.getItem(PROJECTS_VIEW_STORAGE_KEY);
    return value === "list" ? "list" : "cards";
  } catch {
    return "cards";
  }
}

export function writeProjectsViewMode(mode: ProjectsViewMode): void {
  try {
    localStorage.setItem(PROJECTS_VIEW_STORAGE_KEY, mode);
  } catch {
    // Ignore
  }
}

export type AppRoute =
  | { screen: "projects" }
  | { screen: "workspace"; projectId: string };

function parseHashRoute(hash: string): AppRoute {
  const path = hash.replace(/^#/, "").replace(/^\//, "");
  const match = /^project\/([^/]+)$/.exec(path);
  if (match?.[1]) {
    return { screen: "workspace", projectId: decodeURIComponent(match[1]) };
  }
  return { screen: "projects" };
}

export function readAppRoute(): AppRoute {
  if (typeof window === "undefined") {
    return { screen: "projects" };
  }
  return parseHashRoute(window.location.hash);
}

export function navigateToProjects(): void {
  window.location.hash = "#/projects";
}

export function navigateToProject(projectId: string): void {
  window.location.hash = `#/project/${encodeURIComponent(projectId)}`;
}
