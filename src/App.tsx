import { useCallback, useState } from "react";
import { BranchDetailsPanel } from "./components/branches/BranchDetailsPanel";
import { BranchList } from "./components/branches/BranchList";
import { ClosedBranchList } from "./components/branches/ClosedBranchList";
import { CreateBranchForm } from "./components/branches/CreateBranchForm";
import { MergeReviewModal } from "./components/branches/MergeReviewModal";
import { ChatPanel } from "./components/chat/ChatPanel";
import { useBranchMerge } from "./hooks/use-branch-merge";
import { useWorkspace } from "./hooks/use-workspace";

export default function App() {
  const {
    workspace,
    isLoading,
    isSwitching,
    isCreating,
    isUpdating,
    error,
    selectBranch,
    createBranch,
    updateBranch,
    closeBranch,
    reopenBranch,
    reload,
    clearError,
  } = useWorkspace();

  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    null,
  );

  const handleMergeConfirmed = useCallback(
    async (result: { parentBranchId: string; parentMessageId: string }) => {
      setHighlightMessageId(result.parentMessageId);
      await selectBranch(result.parentBranchId);
    },
    [selectBranch],
  );

  const branchMerge = useBranchMerge({
    branch: workspace?.branch ?? null,
    projectId: workspace?.project.id ?? null,
    disabled: isSwitching || isCreating || isUpdating,
    onConfirmed: handleMergeConfirmed,
  });

  const branchBusy =
    isSwitching || isCreating || isUpdating || branchMerge.isGenerating;

  const branchLabel = workspace
    ? workspace.isReadOnly
      ? `${workspace.branch.title} (closed)`
      : workspace.branch.title
    : "";

  const displayError = error ?? branchMerge.error;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Thought Gene</h1>
        <p className="app-subtitle">
          {workspace
            ? `${workspace.project.name} · ${branchLabel}`
            : "Loading workspace…"}
        </p>
      </header>
      <main className="app-main">
        {isLoading && (
          <div className="workspace-status" role="status">
            <p>Loading conversation…</p>
          </div>
        )}

        {!isLoading && displayError && (
          <div className="workspace-status workspace-status-error" role="alert">
            <p>{displayError}</p>
            <button type="button" onClick={() => void reload()}>
              Retry
            </button>
            <button
              type="button"
              onClick={() => {
                clearError();
                branchMerge.clearError();
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {!isLoading && workspace && (
          <div className="workspace-layout">
            <aside className="branch-sidebar">
              <BranchList
                branches={workspace.branches}
                activeBranchId={workspace.branch.id}
                disabled={branchBusy}
                onSelect={(branchId) => {
                  setHighlightMessageId(null);
                  void selectBranch(branchId);
                }}
              />
              <ClosedBranchList
                branches={workspace.closedBranches}
                activeBranchId={workspace.branch.id}
                disabled={branchBusy}
                onSelect={(branchId) => {
                  setHighlightMessageId(null);
                  void selectBranch(branchId);
                }}
              />
              <CreateBranchForm
                disabled={branchBusy || workspace.isReadOnly}
                onCreate={createBranch}
              />
              <BranchDetailsPanel
                branch={workspace.branch}
                isReadOnly={workspace.isReadOnly}
                disabled={branchBusy}
                canMerge={!workspace.isReadOnly}
                hasDraft={!!branchMerge.draft}
                isGeneratingMerge={branchMerge.isGenerating}
                onUpdate={updateBranch}
                onClose={closeBranch}
                onReopen={reopenBranch}
                onMerge={branchMerge.startMerge}
                onResumeMergeDraft={branchMerge.openReview}
                mergeHistory={branchMerge.mergeHistory}
                mergeHistoryLoading={branchMerge.isLoadingHistory}
              />
            </aside>
            <div className="workspace-chat">
              {isSwitching && (
                <div className="workspace-status workspace-status-inline" role="status">
                  <p>Switching branch…</p>
                </div>
              )}
              <ChatPanel
                key={workspace.branch.id}
                projectId={workspace.project.id}
                branchId={workspace.branch.id}
                initialMessages={workspace.messages}
                disabled={branchBusy}
                readOnly={workspace.isReadOnly}
                highlightMessageId={highlightMessageId}
              />
            </div>
          </div>
        )}
      </main>

      <MergeReviewModal
        open={branchMerge.reviewOpen}
        packet={branchMerge.reviewPacket}
        warnings={branchMerge.warnings}
        disabled={branchBusy}
        isSaving={branchMerge.isSaving}
        isConfirming={branchMerge.isConfirming}
        onSave={branchMerge.saveReview}
        onConfirm={branchMerge.confirmReview}
        onDiscard={branchMerge.discardReview}
        onClose={branchMerge.closeReview}
      />
    </div>
  );
}
