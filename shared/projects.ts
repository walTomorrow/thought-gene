import type { ProjectRecord } from "./workspace";

export type { ProjectRecord };

export type ProjectMemoryCounts = {
  decisions: number;
  openQuestions: number;
  deferredWork: number;
};

export type ProjectListItem = ProjectRecord & {
  branchCount: number;
  memory: ProjectMemoryCounts;
  lastActivity: string | null;
};

export type ListProjectsResponse = {
  projects: ProjectListItem[];
};

export type CreateProjectRequest = {
  name: string;
  summary?: string;
};

export type CreateProjectResponse = {
  project: ProjectRecord;
  rootBranchId: string;
};

export type DeleteProjectRequest = {
  projectId: string;
};

export type DeleteProjectResponse = {
  ok: true;
};
