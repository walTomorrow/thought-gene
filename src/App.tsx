import { useEffect, useState } from "react";
import { ProjectsPage } from "./components/projects/ProjectsPage";
import { WorkspaceView } from "./components/WorkspaceView";
import {
  navigateToProject,
  readAppRoute,
  type AppRoute,
} from "./lib/app-route";

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => readAppRoute());

  useEffect(() => {
    function handleHashChange() {
      setRoute(readAppRoute());
    }

    if (!window.location.hash) {
      window.location.hash = "#/projects";
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (route.screen === "workspace") {
    return (
      <div className="app">
        <main className="app-main">
          <WorkspaceView projectId={route.projectId} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <main className="app-main app-main-projects">
        <ProjectsPage
          onOpenProject={(projectId) => navigateToProject(projectId)}
        />
      </main>
    </div>
  );
}
