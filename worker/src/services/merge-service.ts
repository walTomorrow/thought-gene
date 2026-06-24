import { renderMergePacketMarkdown } from "../../../shared/render-merge-packet";
import type {
  ConfirmMergeResponse,
  GenerateMergeResponse,
  ListMergesResponse,
  MergePacket,
  UpdateMergeResponse,
} from "../../../shared/merge";
import { isRootBranch } from "../../../shared/workspace";
import { runMergePacketModel } from "../ai/run-merge-packet";
import {
  confirmBranchMerge,
  createDraftMerge,
  discardDraftMerge,
  findDraftMergeByChild,
  getBranchMergeById,
  getLastConfirmedMerge,
  getNextMergeSequence,
  listConfirmedMergesByChild,
  listMergesByChild,
  updateDraftMergePacket,
} from "../db/branch-merges";
import { getBranchById } from "../db/branches";
import {
  countChildMessagesAfter,
  insertMessage,
  listMessagesByBranch,
} from "../db/messages";
import { getProjectById } from "../db/projects";
import type { WorkerEnv } from "../types/env";
import { closeProjectBranch } from "./branch-service";
import {
  buildMergeContextStrings,
  normalizeMergePacket,
} from "./merge-context";

type MergeValidation = {
  child: NonNullable<Awaited<ReturnType<typeof getBranchById>>>;
  parent: NonNullable<Awaited<ReturnType<typeof getBranchById>>>;
};

async function validateBranchInProject(
  env: WorkerEnv,
  branchId: string,
  projectId: string,
) {
  const branch = await getBranchById(env.DB, branchId);
  if (!branch || branch.projectId !== projectId) {
    throw new Error("Branch not found for this project.");
  }
  return branch;
}

async function validateMergeBranches(
  env: WorkerEnv,
  childBranchId: string,
  projectId: string,
): Promise<MergeValidation> {
  const child = await getBranchById(env.DB, childBranchId);
  if (!child || child.projectId !== projectId) {
    throw new Error("Branch not found for this project.");
  }

  if (isRootBranch(child)) {
    throw new Error("The root branch cannot be merged.");
  }

  if (child.status !== "active") {
    throw new Error("Only active branches can be merged.");
  }

  if (!child.parentBranchId) {
    throw new Error("This branch has no parent to merge into.");
  }

  const parent = await getBranchById(env.DB, child.parentBranchId);
  if (!parent || parent.projectId !== projectId) {
    throw new Error("Parent branch not found for this project.");
  }

  if (parent.status !== "active") {
    throw new Error("Cannot merge into a closed parent branch.");
  }

  return { child, parent };
}

function buildWarnings(input: {
  childMessageCount: number;
  newMessagesSinceLastMerge: number;
  childTruncated: boolean;
}): string[] {
  const warnings: string[] = [];

  if (input.childMessageCount === 0) {
    warnings.push("This branch has no messages yet.");
  }

  if (input.newMessagesSinceLastMerge === 0 && input.childMessageCount > 0) {
    warnings.push(
      "No new chat messages since the last confirmed merge. The packet may repeat prior information.",
    );
  }

  if (input.childTruncated) {
    warnings.push(
      "The child conversation was truncated for the model context window. Review the packet carefully.",
    );
  }

  return warnings;
}

export async function listBranchMerges(
  env: WorkerEnv,
  childBranchId: string,
  projectId: string,
): Promise<ListMergesResponse> {
  await validateBranchInProject(env, childBranchId, projectId);

  const merges = await listMergesByChild(env.DB, childBranchId);
  const draft = await findDraftMergeByChild(env.DB, childBranchId);

  return { merges, draft };
}

export async function generateBranchMerge(
  env: WorkerEnv,
  childBranchId: string,
  projectId: string,
  replaceDraft = false,
): Promise<GenerateMergeResponse> {
  const { child, parent } = await validateMergeBranches(
    env,
    childBranchId,
    projectId,
  );

  const existingDraft = await findDraftMergeByChild(env.DB, childBranchId);
  if (existingDraft && !replaceDraft) {
    const error = new Error("A draft merge already exists for this branch.");
    (error as Error & { code: string }).code = "DRAFT_EXISTS";
    throw error;
  }

  if (existingDraft && replaceDraft) {
    await discardDraftMerge(env.DB, existingDraft.id);
  }

  const project = await getProjectById(env.DB, projectId);
  if (!project) {
    throw new Error("Project not found.");
  }

  const priorMerges = await listConfirmedMergesByChild(env.DB, childBranchId);
  const mergeSequence = await getNextMergeSequence(env.DB, childBranchId);

  const [parentMessages, childMessages] = await Promise.all([
    listMessagesByBranch(env.DB, parent.id),
    listMessagesByBranch(env.DB, child.id),
  ]);

  const contextStrings = buildMergeContextStrings({
    projectName: project.name,
    projectSummary: project.summary,
    parentTitle: parent.title,
    parentPurpose: parent.purpose,
    parentMessages,
    childTitle: child.title,
    childPurpose: child.purpose,
    childMessages,
    priorPackets: priorMerges.map((merge) => merge.packet),
    mergeSequence,
  });

  const lastConfirmed = await getLastConfirmedMerge(env.DB, childBranchId);
  const newMessagesSinceLastMerge = lastConfirmed?.confirmedAt
    ? await countChildMessagesAfter(
        env.DB,
        childBranchId,
        lastConfirmed.confirmedAt,
      )
    : childMessages.filter((message) => message.messageKind === "chat").length;

  const rawPacket = await runMergePacketModel(env, {
    projectName: project.name,
    projectSummary: project.summary,
    parentTitle: parent.title,
    parentPurpose: parent.purpose,
    parentMessagesTail: contextStrings.parentMessagesTail,
    childTitle: child.title,
    childPurpose: child.purpose,
    childMessages: contextStrings.childMessages,
    priorMergeSummaries: contextStrings.priorMergeSummaries,
    mergeSequence,
  });

  const packet = normalizeMergePacket(rawPacket, {
    childBranchId: child.id,
    childTitle: child.title,
    childPurpose: child.purpose,
    parentBranchId: parent.id,
    parentTitle: parent.title,
    mergeSequence,
    priorMergeIds: priorMerges.map((merge) => merge.id),
  });

  const merge = await createDraftMerge(env.DB, {
    projectId,
    childBranchId: child.id,
    parentBranchId: parent.id,
    mergeSequence,
    packet,
  });

  const warnings = buildWarnings({
    childMessageCount: childMessages.filter((message) => message.messageKind === "chat")
      .length,
    newMessagesSinceLastMerge,
    childTruncated: contextStrings.childTruncated,
  });

  return { merge, warnings };
}

export async function updateBranchMerge(
  env: WorkerEnv,
  childBranchId: string,
  mergeId: string,
  projectId: string,
  packet: MergePacket,
): Promise<UpdateMergeResponse> {
  await validateMergeBranches(env, childBranchId, projectId);

  const merge = await getBranchMergeById(env.DB, mergeId);
  if (!merge || merge.childBranchId !== childBranchId) {
    throw new Error("Merge not found for this branch.");
  }

  if (merge.status !== "draft") {
    throw new Error("Only draft merges can be edited.");
  }

  const parent = await getBranchById(env.DB, merge.parentBranchId);
  const child = await getBranchById(env.DB, childBranchId);
  if (!parent || !child) {
    throw new Error("Branch not found.");
  }

  const normalized = normalizeMergePacket(packet, {
    childBranchId: child.id,
    childTitle: child.title,
    childPurpose: child.purpose,
    parentBranchId: parent.id,
    parentTitle: parent.title,
    mergeSequence: merge.mergeSequence,
    priorMergeIds: packet.meta.priorMergeIds ?? [],
  });

  const updated = await updateDraftMergePacket(env.DB, mergeId, normalized);
  if (!updated) {
    throw new Error("Failed to update merge draft.");
  }

  return { merge: updated };
}

export async function confirmBranchMergeDraft(
  env: WorkerEnv,
  childBranchId: string,
  mergeId: string,
  projectId: string,
  closeChildAfter = false,
): Promise<ConfirmMergeResponse> {
  const { parent } = await validateMergeBranches(
    env,
    childBranchId,
    projectId,
  );

  const merge = await getBranchMergeById(env.DB, mergeId);
  if (!merge || merge.childBranchId !== childBranchId) {
    throw new Error("Merge not found for this branch.");
  }

  if (merge.status !== "draft") {
    throw new Error("Only draft merges can be confirmed.");
  }

  const renderedMarkdown = renderMergePacketMarkdown(merge.packet);
  const parentMessage = await insertMessage(env.DB, {
    projectId,
    branchId: parent.id,
    role: "system",
    content: renderedMarkdown,
    messageKind: "merge_packet",
    mergeId: merge.id,
  });

  const confirmed = await confirmBranchMerge(env.DB, {
    mergeId: merge.id,
    renderedMarkdown,
    parentMessageId: parentMessage.id,
    closeChildAfter,
  });

  if (!confirmed) {
    throw new Error("Failed to confirm merge.");
  }

  if (closeChildAfter) {
    await closeProjectBranch(env, childBranchId, projectId);
  }

  return {
    merge: confirmed,
    parentMessageId: parentMessage.id,
    parentBranchId: parent.id,
  };
}

export async function discardBranchMergeDraft(
  env: WorkerEnv,
  childBranchId: string,
  mergeId: string,
  projectId: string,
): Promise<void> {
  await validateBranchInProject(env, childBranchId, projectId);

  const merge = await getBranchMergeById(env.DB, mergeId);
  if (!merge || merge.childBranchId !== childBranchId) {
    throw new Error("Merge not found for this branch.");
  }

  if (merge.status !== "draft") {
    throw new Error("Only draft merges can be discarded.");
  }

  await discardDraftMerge(env.DB, mergeId);
}

// Re-export type for route usage
