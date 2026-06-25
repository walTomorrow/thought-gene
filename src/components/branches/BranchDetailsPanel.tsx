import { useEffect, useState, type FormEvent } from "react";
import type { BranchRecord } from "../../types/message";
import { isRootBranch } from "../../types/message";
import type { BranchMergeSummary } from "../../types/message";
import { MergeHistoryList } from "./MergeHistoryList";

type BranchDetailsPanelProps = {
  branch: BranchRecord;
  isReadOnly: boolean;
  disabled: boolean;
  canMerge: boolean;
  hasDraft: boolean;
  isGeneratingMerge: boolean;
  onUpdate: (input: { title: string; purpose: string }) => Promise<void>;
  onClose: () => Promise<void>;
  onReopen: () => Promise<void>;
  onMerge: () => Promise<void>;
  onResumeMergeDraft: () => void;
  mergeHistory: BranchMergeSummary[];
  mergeHistoryLoading: boolean;
};

export function BranchDetailsPanel({
  branch,
  isReadOnly,
  disabled,
  canMerge,
  hasDraft,
  isGeneratingMerge,
  onUpdate,
  onClose,
  onReopen,
  onMerge,
  onResumeMergeDraft,
  mergeHistory,
  mergeHistoryLoading,
}: BranchDetailsPanelProps) {
  const [title, setTitle] = useState(branch.title);
  const [purpose, setPurpose] = useState(branch.purpose);

  useEffect(() => {
    setTitle(branch.title);
    setPurpose(branch.purpose);
  }, [branch.id, branch.title, branch.purpose]);

  const canEdit = !isReadOnly;
  const canClose = !isReadOnly && !isRootBranch(branch);
  const canMergeToParent = canMerge && !isRootBranch(branch) && !!branch.parentBranchId;
  const isDirty =
    title.trim() !== branch.title || purpose.trim() !== branch.purpose;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || !isDirty) {
      return;
    }

    await onUpdate({ title: title.trim(), purpose: purpose.trim() });
  }

  return (
    <section className="branch-details" aria-label="Branch details">
      <h2 className="branch-details-heading">Current branch</h2>

      {isReadOnly && (
        <p className="branch-details-readonly" role="status">
          This branch is closed. History is read-only.
        </p>
      )}

      <form className="branch-details-form" onSubmit={handleSubmit}>
        <label className="branch-details-label" htmlFor="branch-details-title">
          Title
        </label>
        <input
          id="branch-details-title"
          className="branch-details-input"
          type="text"
          value={title}
          disabled={disabled || !canEdit}
          onChange={(event) => setTitle(event.target.value)}
        />

        <label className="branch-details-label" htmlFor="branch-details-purpose">
          Purpose
        </label>
        <textarea
          id="branch-details-purpose"
          className="branch-details-textarea"
          rows={2}
          value={purpose}
          disabled={disabled || !canEdit}
          onChange={(event) => setPurpose(event.target.value)}
        />

        {canEdit && (
          <button
            className="branch-details-save"
            type="submit"
            disabled={disabled || !isDirty || !title.trim() || !purpose.trim()}
          >
            Save changes
          </button>
        )}
      </form>

      <div className="branch-details-actions">
        {canMergeToParent && (
          <>
            <button
              className="branch-details-merge"
              type="button"
              disabled={disabled || isGeneratingMerge}
              onClick={() => void onMerge()}
            >
              {isGeneratingMerge ? "Preparing merge…" : "Merge to parent"}
            </button>
            {hasDraft && (
              <button
                className="branch-details-merge-draft"
                type="button"
                disabled={disabled || isGeneratingMerge}
                onClick={onResumeMergeDraft}
              >
                Resume merge
              </button>
            )}
          </>
        )}
        {canClose && (
          <button
            className="branch-details-close"
            type="button"
            disabled={disabled}
            onClick={() => void onClose()}
          >
            Close branch
          </button>
        )}
        {isReadOnly && (
          <button
            className="branch-details-reopen"
            type="button"
            disabled={disabled}
            onClick={() => void onReopen()}
          >
            Reopen branch
          </button>
        )}
      </div>

      {!isRootBranch(branch) && (
        <MergeHistoryList merges={mergeHistory} isLoading={mergeHistoryLoading} />
      )}
    </section>
  );
}
