import type { StoredMessage } from "../../../shared/chat";
import type { MergePacket } from "../../../shared/merge";
import { newMergeItemId } from "../../../shared/merge";

const PARENT_TAIL_LIMIT = 8;
const CHILD_MESSAGE_LIMIT = 40;
const CHILD_CHAR_BUDGET = 12000;

function formatMessages(messages: StoredMessage[], label: string): string {
  if (messages.length === 0) {
    return `${label}: (none)`;
  }

  return [
    label,
    ...messages.map(
      (message) => `[${message.role}] ${message.content.trim()}`,
    ),
  ].join("\n");
}

function trimChildMessages(messages: StoredMessage[]): {
  text: string;
  truncated: boolean;
} {
  const recent = messages.slice(-CHILD_MESSAGE_LIMIT);
  let text = formatMessages(recent, "Child messages");
  let truncated = messages.length > recent.length;

  if (text.length > CHILD_CHAR_BUDGET) {
    const tail = recent.slice(-15);
    text = [
      `Child messages (showing last ${tail.length} of ${messages.length}):`,
      ...tail.map((message) => `[${message.role}] ${message.content.trim()}`),
    ].join("\n");
    truncated = true;
  }

  return { text, truncated };
}

function summarizePriorMerge(packet: MergePacket): string {
  return [
    `Merge #${packet.meta.mergeSequence}:`,
    packet.executiveSummary.trim(),
    packet.decisions.length > 0
      ? `Decisions: ${packet.decisions.map((item) => item.title).join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMergeContextStrings(input: {
  projectName: string;
  projectSummary: string | null;
  parentTitle: string;
  parentPurpose: string;
  parentMessages: StoredMessage[];
  childTitle: string;
  childPurpose: string;
  childMessages: StoredMessage[];
  priorPackets: MergePacket[];
  mergeSequence: number;
}): {
  parentMessagesTail: string;
  childMessages: string;
  priorMergeSummaries: string;
  childTruncated: boolean;
} {
  const parentTail = input.parentMessages.slice(-PARENT_TAIL_LIMIT);
  const childPrepared = trimChildMessages(input.childMessages);

  return {
    parentMessagesTail: formatMessages(parentTail, "Parent recent messages"),
    childMessages: childPrepared.text,
    priorMergeSummaries: input.priorPackets.map(summarizePriorMerge).join("\n\n"),
    childTruncated: childPrepared.truncated,
  };
}

export function normalizeMergePacket(
  packet: MergePacket,
  input: {
    childBranchId: string;
    childTitle: string;
    childPurpose: string;
    parentBranchId: string;
    parentTitle: string;
    mergeSequence: number;
    priorMergeIds: string[];
  },
): MergePacket {
  const withIds = (items: MergePacket["decisions"]) =>
    (items ?? []).map((item) => ({
      ...item,
      id: item.id || newMergeItemId(),
      title: item.title?.trim() ?? "",
      body: item.body?.trim() ?? "",
    }));

  return {
    version: 1,
    meta: {
      childBranchId: input.childBranchId,
      childTitle: input.childTitle,
      childPurpose: input.childPurpose,
      parentBranchId: input.parentBranchId,
      parentTitle: input.parentTitle,
      generatedAt: new Date().toISOString(),
      mergeSequence: input.mergeSequence,
      priorMergeIds: input.priorMergeIds,
    },
    executiveSummary: packet.executiveSummary?.trim() ?? "",
    decisions: withIds(packet.decisions),
    implementationDetails: withIds(packet.implementationDetails),
    assumptions: withIds(packet.assumptions),
    openQuestions: withIds(packet.openQuestions),
    deferredWork: withIds(packet.deferredWork),
    risks: withIds(packet.risks),
    nextSteps: withIds(packet.nextSteps),
    rejectedOptions: packet.rejectedOptions
      ? withIds(packet.rejectedOptions)
      : undefined,
    parentContinuityNote: packet.parentContinuityNote?.trim() || undefined,
  };
}
