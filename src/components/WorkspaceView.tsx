import { useCallback, useEffect, useState } from "react";
import { BranchDetailsPanel } from "./branches/BranchDetailsPanel";
import { BranchList } from "./branches/BranchList";
import { ClosedBranchList } from "./branches/ClosedBranchList";
import { CreateBranchForm } from "./branches/CreateBranchForm";
import { ChatPanel } from "./chat/ChatPanel";
import { MergeConfirmDialog } from "./merges/MergeConfirmDialog";
import { useBranchMerge } from "../hooks/use-branch-merge";
import { useWorkspace } from "../hooks/use-workspace";
import { navigateToProjects } from "../lib/app-route";
import { markProjectOpened } from "../hooks/use-projects";

type WorkspaceViewProps = {
  projectId: string;
};

export function WorkspaceView({ projectId }: WorkspaceViewProps) {
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
  } = useWorkspace({ projectId });

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
    isSwitching ||
    isCreating ||
    isUpdating ||
    branchMerge.isGenerating ||
    branchMerge.isConfirming;

  const branchLabel = workspace
    ? workspace.isReadOnly
      ? `${workspace.branch.title} (closed)`
      : workspace.branch.title
    : "";

  const displayError = error ?? branchMerge.error;

  useEffect(() => {
    void markProjectOpened(projectId);
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="workspace-status" role="status">
        <p>Loading project…</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="workspace-status workspace-status-error" role="alert">
        <p>{displayError ?? "Project not found."}</p>
        <button type="button" onClick={() => navigateToProjects()}>
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <button
              type="button"
              className="workspace-back-link"
              onClick={() => navigateToProjects()}
            >
              ← Projects
            </button>
            <h1>{workspace.project.name}</h1>
            <p className="app-subtitle">{branchLabel}</p>
          </div>
        </div>
      </header>

      {displayError && (
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
            onResumeMergeDraft={branchMerge.resumeDraft}
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

      <MergeConfirmDialog
        open={branchMerge.dialogOpen}
        phase={branchMerge.dialogPhase}
        packet={branchMerge.mergePacket}
        warnings={branchMerge.warnings}
        disabled={branchBusy}
        isConfirming={branchMerge.isConfirming}
        onConfirm={branchMerge.confirmMerge}
        onCancel={branchMerge.closeDialog}
        onPacketChange={branchMerge.updatePacket}
      />
    </>
  );
}
