import { useCallback, useEffect, useState } from "react";
import {
  confirmBranchMerge,
  discardBranchMerge,
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
  reviewOpen: boolean;
  reviewPacket: MergePacket | null;
  reviewMergeId: string | null;
  warnings: string[];
  isLoadingHistory: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  isConfirming: boolean;
  error: string | null;
  openReview: () => void;
  closeReview: () => void;
  startMerge: () => Promise<void>;
  saveReview: (packet: MergePacket) => Promise<void>;
  confirmReview: (closeChildAfter: boolean) => Promise<void>;
  discardReview: () => Promise<void>;
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewPacket, setReviewPacket] = useState<MergePacket | null>(null);
  const [reviewMergeId, setReviewMergeId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const openDraftReview = useCallback(
    (merge: BranchMergeRecord, mergeWarnings: string[] = []) => {
      setReviewPacket(merge.packet);
      setReviewMergeId(merge.id);
      setWarnings(mergeWarnings);
      setReviewOpen(true);
    },
    [],
  );

  const startMerge = useCallback(async () => {
    if (!branch || !projectId || disabled || !canMerge) {
      return;
    }

    if (draft) {
      const resume = window.confirm(
        "A draft merge already exists. Open the existing draft? Click Cancel to replace it with a newly generated packet.",
      );
      if (resume) {
        openDraftReview(draft, warnings);
        return;
      }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateBranchMerge(branch.id, {
        projectId,
        replaceDraft: !!draft,
      });
      setDraft(result.merge);
      openDraftReview(result.merge, result.warnings);
      await loadHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate merge packet.";
      setError(message);
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
    openDraftReview,
  ]);

  const saveReview = useCallback(
    async (packet: MergePacket) => {
      if (!branch || !projectId || !reviewMergeId) {
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        const result = await updateBranchMerge(branch.id, reviewMergeId, {
          projectId,
          packet,
        });
        setDraft(result.merge);
        setReviewPacket(result.merge.packet);
        await loadHistory();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save merge draft.";
        setError(message);
      } finally {
        setIsSaving(false);
      }
    },
    [branch, projectId, reviewMergeId, loadHistory],
  );

  const confirmReview = useCallback(
    async (closeChildAfter: boolean) => {
      if (!branch || !projectId || !reviewMergeId || !reviewPacket) {
        return;
      }

      setIsConfirming(true);
      setError(null);

      try {
        await saveReview(reviewPacket);
        const result = await confirmBranchMerge(branch.id, reviewMergeId, {
          projectId,
          closeChildAfter,
        });
        setReviewOpen(false);
        setReviewPacket(null);
        setReviewMergeId(null);
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
      }
    },
    [
      branch,
      projectId,
      reviewMergeId,
      reviewPacket,
      saveReview,
      onConfirmed,
      loadHistory,
    ],
  );

  const discardReview = useCallback(async () => {
    if (!branch || !projectId || !reviewMergeId) {
      setReviewOpen(false);
      return;
    }

    setError(null);
    try {
      await discardBranchMerge(branch.id, reviewMergeId, projectId);
      setReviewOpen(false);
      setReviewPacket(null);
      setReviewMergeId(null);
      setDraft(null);
      setWarnings([]);
      await loadHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to discard merge draft.";
      setError(message);
    }
  }, [branch, projectId, reviewMergeId, loadHistory]);

  const openReview = useCallback(() => {
    if (draft) {
      openDraftReview(draft, warnings);
    }
  }, [draft, openDraftReview, warnings]);

  const closeReview = useCallback(() => {
    setReviewOpen(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    mergeHistory,
    draft,
    reviewOpen,
    reviewPacket,
    reviewMergeId,
    warnings,
    isLoadingHistory,
    isGenerating,
    isSaving,
    isConfirming,
    error,
    openReview,
    closeReview,
    startMerge,
    saveReview,
    confirmReview,
    discardReview,
    clearError,
  };
}
