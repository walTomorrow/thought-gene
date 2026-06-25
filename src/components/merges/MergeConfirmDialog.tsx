import { useEffect, useState } from "react";
import type { MergePacket } from "../../types/message";
import { getRememberBullets } from "../../../shared/merge-display";
import { MergePacketDocument } from "./MergePacketDocument";
import { MergePacketEditor } from "./MergePacketEditor";

type MergeConfirmDialogProps = {
  open: boolean;
  phase: "loading" | "confirm";
  packet: MergePacket | null;
  warnings: string[];
  disabled: boolean;
  isConfirming: boolean;
  onConfirm: (closeChildAfter: boolean) => Promise<void>;
  onCancel: () => void;
  onPacketChange: (packet: MergePacket) => void;
};

export function MergeConfirmDialog({
  open,
  phase,
  packet,
  warnings,
  disabled,
  isConfirming,
  onConfirm,
  onCancel,
  onPacketChange,
}: MergeConfirmDialogProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [closeChildAfter, setCloseChildAfter] = useState(false);

  useEffect(() => {
    if (open) {
      setReviewOpen(false);
      setEditing(false);
      setCloseChildAfter(false);
    }
  }, [open, packet?.meta.generatedAt]);

  if (!open) {
    return null;
  }

  const busy = disabled || isConfirming;
  const bullets = packet ? getRememberBullets(packet) : [];

  return (
    <div
      className="merge-dialog-backdrop"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="merge-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-dialog-title"
        aria-busy={phase === "loading"}
        onClick={(event) => event.stopPropagation()}
      >
        {phase === "loading" && (
          <div className="merge-dialog-loading">
            <div className="merge-dialog-spinner" aria-hidden="true" />
            <p className="merge-dialog-loading-text">Preparing merge…</p>
            <p className="merge-dialog-loading-hint">
              The assistant is summarizing what to carry into the parent branch.
            </p>
          </div>
        )}

        {phase === "confirm" && packet && (
          <>
            <p className="merge-dialog-eyebrow">Merge preview</p>
            <h2 id="merge-dialog-title" className="merge-dialog-title">
              Merge &ldquo;{packet.meta.childTitle}&rdquo; into{" "}
              {packet.meta.parentTitle}
            </h2>

            {warnings.length > 0 && (
              <ul className="merge-dialog-warnings" role="status">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}

            <p className="merge-dialog-lead">The assistant will remember:</p>
            <ul className="merge-remember-list">
              {bullets.map((bullet) => (
                <li key={bullet}>
                  <span className="merge-remember-check" aria-hidden="true">
                    ✓
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="merge-dialog-primary"
              disabled={busy || !packet.executiveSummary.trim()}
              onClick={() => void onConfirm(closeChildAfter)}
            >
              {isConfirming ? "Merging…" : "Merge & Continue"}
            </button>

            <button
              type="button"
              className="merge-dialog-secondary"
              aria-expanded={reviewOpen}
              disabled={busy}
              onClick={() => {
                setReviewOpen((value) => !value);
                if (reviewOpen) {
                  setEditing(false);
                }
              }}
            >
              Review Merge {reviewOpen ? "▲" : "▼"}
            </button>

            <button
              type="button"
              className="merge-dialog-muted"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </button>

            <label className="merge-dialog-checkbox">
              <input
                type="checkbox"
                checked={closeChildAfter}
                disabled={busy}
                onChange={(event) => setCloseChildAfter(event.target.checked)}
              />
              Close child branch after merge
            </label>

            {reviewOpen && (
              <div className="merge-dialog-review">
                <div className="merge-dialog-review-toolbar">
                  {!editing ? (
                    <button
                      type="button"
                      className="merge-dialog-edit"
                      disabled={busy}
                      onClick={() => setEditing(true)}
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="merge-dialog-edit"
                      disabled={busy}
                      onClick={() => setEditing(false)}
                    >
                      Done editing
                    </button>
                  )}
                </div>
                {editing ? (
                  <MergePacketEditor
                    packet={packet}
                    disabled={busy}
                    onChange={onPacketChange}
                  />
                ) : (
                  <MergePacketDocument packet={packet} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
