import type {
  ArtifactRecord,
  ArtifactStatus,
  ArtifactType,
  CreateArtifactResponse,
  GetArtifactResponse,
  ListArtifactsResponse,
  UpdateArtifactResponse,
} from "../../../shared/artifact";
import type { WorkerEnv } from "../types/env";
import {
  createArtifact,
  getArtifactById,
  listArtifacts,
  updateArtifact,
} from "../db/artifacts";
import { getBranchMergeById } from "../db/branch-merges";
import { branchBelongsToProject, getBranchById } from "../db/branches";
import { getMessageById } from "../db/messages";
import { getProjectById } from "../db/projects";

type ProvenanceInput = {
  sourceBranchId?: string | null;
  sourceMergeId?: string | null;
  sourceMessageId?: string | null;
};

async function validateProject(env: WorkerEnv, projectId: string) {
  const project = await getProjectById(env.DB, projectId);
  if (!project) {
    throw new Error("Project not found.");
  }
  return project;
}

async function validateProvenance(
  env: WorkerEnv,
  projectId: string,
  input: ProvenanceInput,
) {
  if (input.sourceBranchId) {
    const belongs = await branchBelongsToProject(
      env.DB,
      input.sourceBranchId,
      projectId,
    );
    if (!belongs) {
      throw new Error("Source branch not found for this project.");
    }
  }

  if (input.sourceMergeId) {
    const merge = await getBranchMergeById(env.DB, input.sourceMergeId);
    if (!merge || merge.projectId !== projectId) {
      throw new Error("Source merge not found for this project.");
    }
  }

  if (input.sourceMessageId) {
    const message = await getMessageById(env.DB, input.sourceMessageId);
    if (!message || message.projectId !== projectId) {
      throw new Error("Source message not found for this project.");
    }
  }
}

async function getArtifactForProject(
  env: WorkerEnv,
  artifactId: string,
  projectId: string,
): Promise<ArtifactRecord> {
  const artifact = await getArtifactById(env.DB, artifactId);
  if (!artifact || artifact.projectId !== projectId) {
    throw new Error("Artifact not found for this project.");
  }
  return artifact;
}

export async function listProjectArtifacts(
  env: WorkerEnv,
  filters: {
    projectId: string;
    sourceBranchId?: string;
    type?: ArtifactType;
    status?: ArtifactStatus;
  },
): Promise<ListArtifactsResponse> {
  await validateProject(env, filters.projectId);

  if (filters.sourceBranchId) {
    const belongs = await branchBelongsToProject(
      env.DB,
      filters.sourceBranchId,
      filters.projectId,
    );
    if (!belongs) {
      throw new Error("Branch not found for this project.");
    }
  }

  const artifacts = await listArtifacts(env.DB, filters);
  return { artifacts };
}

export async function listBranchArtifacts(
  env: WorkerEnv,
  branchId: string,
  projectId: string,
  filters: {
    type?: ArtifactType;
    status?: ArtifactStatus;
  },
): Promise<ListArtifactsResponse> {
  await validateProject(env, projectId);

  const branch = await getBranchById(env.DB, branchId);
  if (!branch || branch.projectId !== projectId) {
    throw new Error("Branch not found for this project.");
  }

  const artifacts = await listArtifacts(env.DB, {
    projectId,
    sourceBranchId: branchId,
    type: filters.type,
    status: filters.status,
  });

  return { artifacts };
}

export async function getProjectArtifact(
  env: WorkerEnv,
  artifactId: string,
  projectId: string,
): Promise<GetArtifactResponse> {
  const artifact = await getArtifactForProject(env, artifactId, projectId);
  return { artifact };
}

export async function createProjectArtifact(
  env: WorkerEnv,
  input: {
    projectId: string;
    type: ArtifactType;
    title: string;
    body: string;
    reasoning: string | null;
    assumptions: ArtifactRecord["assumptions"];
    risks: ArtifactRecord["risks"];
    constraints: ArtifactRecord["constraints"];
    rejectedOptions: ArtifactRecord["rejectedOptions"];
    status: ArtifactStatus;
    sourceBranchId: string | null;
    sourceMergeId: string | null;
    sourceMessageId: string | null;
  },
): Promise<CreateArtifactResponse> {
  await validateProject(env, input.projectId);
  await validateProvenance(env, input.projectId, {
    sourceBranchId: input.sourceBranchId,
    sourceMergeId: input.sourceMergeId,
    sourceMessageId: input.sourceMessageId,
  });

  const artifact = await createArtifact(env.DB, input);
  return { artifact };
}

export async function updateProjectArtifact(
  env: WorkerEnv,
  artifactId: string,
  input: {
    projectId: string;
    type?: ArtifactType;
    status?: ArtifactStatus;
    title?: string;
    body?: string;
    reasoning?: string | null;
    assumptions?: ArtifactRecord["assumptions"];
    risks?: ArtifactRecord["risks"];
    constraints?: ArtifactRecord["constraints"];
    rejectedOptions?: ArtifactRecord["rejectedOptions"];
    sourceBranchId?: string | null;
    sourceMergeId?: string | null;
    sourceMessageId?: string | null;
  },
): Promise<UpdateArtifactResponse> {
  await getArtifactForProject(env, artifactId, input.projectId);
  await validateProvenance(env, input.projectId, {
    sourceBranchId: input.sourceBranchId,
    sourceMergeId: input.sourceMergeId,
    sourceMessageId: input.sourceMessageId,
  });

  const artifact = await updateArtifact(env.DB, artifactId, input);
  if (!artifact) {
    throw new Error("Artifact not found for this project.");
  }

  return { artifact };
}

export async function resolveProjectArtifact(
  env: WorkerEnv,
  artifactId: string,
  projectId: string,
  reasoning?: string,
): Promise<UpdateArtifactResponse> {
  const existing = await getArtifactForProject(env, artifactId, projectId);

  if (existing.status === "resolved") {
    return { artifact: existing };
  }

  const artifact = await updateArtifact(env.DB, artifactId, {
    status: "resolved",
    reasoning:
      reasoning !== undefined
        ? reasoning
        : existing.reasoning,
  });

  if (!artifact) {
    throw new Error("Artifact not found for this project.");
  }

  return { artifact };
}

export async function dropProjectArtifact(
  env: WorkerEnv,
  artifactId: string,
  projectId: string,
  reasoning?: string,
): Promise<UpdateArtifactResponse> {
  const existing = await getArtifactForProject(env, artifactId, projectId);

  if (existing.status === "dropped") {
    return { artifact: existing };
  }

  const artifact = await updateArtifact(env.DB, artifactId, {
    status: "dropped",
    reasoning:
      reasoning !== undefined
        ? reasoning
        : existing.reasoning,
  });

  if (!artifact) {
    throw new Error("Artifact not found for this project.");
  }

  return { artifact };
}
