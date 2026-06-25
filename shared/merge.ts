/**
 * Branch merge packet types shared by frontend and Worker.
 */

export type MergeItemConfidence = "high" | "medium" | "low";

export type MergeItem = {
  id: string;
  title: string;
  body: string;
  confidence?: MergeItemConfidence;
  sourceHint?: string;
};

export type MergePacketMeta = {
  childBranchId: string;
  childTitle: string;
  childPurpose: string;
  parentBranchId: string;
  parentTitle: string;
  generatedAt: string;
  mergeSequence: number;
  priorMergeIds?: string[];
};

export type MergePacket = {
  version: 1;
  meta: MergePacketMeta;
  executiveSummary: string;
  decisions: MergeItem[];
  implementationDetails: MergeItem[];
  assumptions: MergeItem[];
  openQuestions: MergeItem[];
  deferredWork: MergeItem[];
  risks: MergeItem[];
  nextSteps: MergeItem[];
  rejectedOptions?: MergeItem[];
  parentContinuityNote?: string;
  /** Short bullets for the merge confirm dialog (3–5 items). */
  rememberBullets?: string[];
};

export type BranchMergeStatus = "draft" | "confirmed" | "discarded";

export type BranchMergeRecord = {
  id: string;
  projectId: string;
  childBranchId: string;
  parentBranchId: string;
  mergeSequence: number;
  status: BranchMergeStatus;
  packet: MergePacket;
  renderedMarkdown: string | null;
  parentMessageId: string | null;
  closeChildAfter: boolean;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
};

export type BranchMergeSummary = {
  id: string;
  mergeSequence: number;
  status: BranchMergeStatus;
  parentBranchId: string;
  parentMessageId: string | null;
  confirmedAt: string | null;
  createdAt: string;
};

export type GenerateMergeRequest = {
  projectId: string;
  replaceDraft?: boolean;
};

export type GenerateMergeResponse = {
  merge: BranchMergeRecord;
  warnings: string[];
};

export type UpdateMergeRequest = {
  projectId: string;
  packet: MergePacket;
};

export type UpdateMergeResponse = {
  merge: BranchMergeRecord;
};

export type ConfirmMergeRequest = {
  projectId: string;
  closeChildAfter?: boolean;
};

export type ConfirmMergeResponse = {
  merge: BranchMergeRecord;
  parentMessageId: string;
  parentBranchId: string;
};

export type ListMergesResponse = {
  merges: BranchMergeSummary[];
  draft: BranchMergeRecord | null;
};

export type GetMergeResponse = {
  merge: BranchMergeRecord;
};

export function newMergeItemId(): string {
  return crypto.randomUUID();
}
