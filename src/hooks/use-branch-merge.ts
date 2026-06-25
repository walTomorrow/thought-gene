import { useCallback, useEffect, useRef, useState } from "react";
import {
  confirmBranchMerge,
  generateBranchMerge,
  listBranchMerges,
  updateBranchMerge,
} from "../api/merges-client";
import type {
  BranchMergeRecord,
  BranchMergeSummary,
  MergePacket,
} from "../types/message";
import { isRootBranch } from "../types/message";
import type { BranchRecord } from "../types/message";

type UseBranchMergeOptions = {
  branch: BranchRecord | null;
  projectId: string | null;
  disabled: boolean;
  onConfirmed: (result: {
    parentBranchId: string;
    parentMessageId: string;
  }) => Promise<void>;
};

type UseBranchMergeResult = {
  mergeHistory: BranchMergeSummary[];
  draft: BranchMergeRecord | null;
  dialogOpen: boolean;
  dialogPhase: "loading" | "confirm";
  mergePacket: MergePacket | null;
  mergeId: string | null;
  warnings: string[];
  isLoadingHistory: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  isConfirming: boolean;
  error: string | null;
  startMerge: () => Promise<void>;
  resumeDraft: () => void;
  closeDialog: () => void;
  updatePacket: (packet: MergePacket) => void;
  confirmMerge: (closeChildAfter: boolean) => Promise<void>;
  clearError: () => void;
};

export function useBranchMerge({
  branch,
  projectId,
  disabled,
  onConfirmed,
}: UseBranchMergeOptions): UseBranchMergeResult {
  const [mergeHistory, setMergeHistory] = useState<BranchMergeSummary[]>([]);
  const [draft, setDraft] = useState<BranchMergeRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPhase, setDialogPhase] = useState<"loading" | "confirm">(
    "loading",
  );
  const [mergePacket, setMergePacket] = useState<MergePacket | null>(null);
  const [mergeId, setMergeId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const packetDirtyRef = useRef(false);

  const canMerge =
    !!branch &&
    !!projectId &&
    !isRootBranch(branch) &&
    branch.status === "active" &&
    !!branch.parentBranchId;

  const loadHistory = useCallback(async () => {
    if (!branch || !projectId || isRootBranch(branch)) {
      setMergeHistory([]);
      setDraft(null);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const result = await listBranchMerges(branch.id, projectId);
      setMergeHistory(result.merges.filter((merge) => merge.status === "confirmed"));
      setDraft(result.draft);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load merge history.";
      setError(message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [branch, projectId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const openConfirmDialog = useCallback(
    (merge: BranchMergeRecord, mergeWarnings: string[] = []) => {
      setMergePacket(merge.packet);
      setMergeId(merge.id);
      setWarnings(mergeWarnings);
      setDialogPhase("confirm");
      setDialogOpen(true);
      packetDirtyRef.current = false;
    },
    [],
  );

  const startMerge = useCallback(async () => {
    if (!branch || !projectId || disabled || !canMerge) {
      return;
    }

    setError(null);

    if (draft) {
      openConfirmDialog(draft, warnings);
      return;
    }

    setDialogOpen(true);
    setDialogPhase("loading");

    setIsGenerating(true);

    try {
      const result = await generateBranchMerge(branch.id, {
        projectId,
        replaceDraft: false,
      });
      setDraft(result.merge);
      openConfirmDialog(result.merge, result.warnings);
      await loadHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate merge packet.";
      setError(message);
      setDialogOpen(false);
    } finally {
      setIsGenerating(false);
    }
  }, [
    branch,
    projectId,
    disabled,
    canMerge,
    draft,
    warnings,
    loadHistory,
    openConfirmDialog,
  ]);

  const resumeDraft = useCallback(() => {
    if (draft) {
      openConfirmDialog(draft, warnings);
    }
  }, [draft, openConfirmDialog, warnings]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const updatePacket = useCallback((packet: MergePacket) => {
    setMergePacket(packet);
    packetDirtyRef.current = true;
  }, []);

  const confirmMerge = useCallback(
    async (closeChildAfter: boolean) => {
      if (!branch || !projectId || !mergeId || !mergePacket) {
        return;
      }

      setIsConfirming(true);
      setError(null);

      try {
        if (packetDirtyRef.current) {
          setIsSaving(true);
          const result = await updateBranchMerge(branch.id, mergeId, {
            projectId,
            packet: mergePacket,
          });
          setDraft(result.merge);
          setMergePacket(result.merge.packet);
          packetDirtyRef.current = false;
          setIsSaving(false);
        }

        const result = await confirmBranchMerge(branch.id, mergeId, {
          projectId,
          closeChildAfter,
        });
        setDialogOpen(false);
        setMergePacket(null);
        setMergeId(null);
        setDraft(null);
        setWarnings([]);
        await onConfirmed({
          parentBranchId: result.parentBranchId,
          parentMessageId: result.parentMessageId,
        });
        await loadHistory();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to confirm merge.";
        setError(message);
      } finally {
        setIsConfirming(false);
        setIsSaving(false);
      }
    },
    [branch, projectId, mergeId, mergePacket, onConfirmed, loadHistory],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    mergeHistory,
    draft,
    dialogOpen,
    dialogPhase,
    mergePacket,
    mergeId,
    warnings,
    isLoadingHistory,
    isGenerating,
    isSaving,
    isConfirming,
    error,
    startMerge,
    resumeDraft,
    closeDialog,
    updatePacket,
    confirmMerge,
    clearError,
  };
}
