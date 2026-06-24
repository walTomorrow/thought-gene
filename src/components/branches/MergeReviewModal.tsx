import { useEffect, useState } from "react";
import type { MergeItem, MergePacket } from "../../types/message";
import { newMergeItemId } from "../../../shared/merge";

type MergeReviewModalProps = {
  open: boolean;
  packet: MergePacket | null;
  warnings: string[];
  disabled: boolean;
  isSaving: boolean;
  isConfirming: boolean;
  onSave: (packet: MergePacket) => Promise<void>;
  onConfirm: (closeChildAfter: boolean) => Promise<void>;
  onDiscard: () => Promise<void>;
  onClose: () => void;
};

type SectionKey =
  | "decisions"
  | "implementationDetails"
  | "assumptions"
  | "openQuestions"
  | "deferredWork"
  | "risks"
  | "nextSteps"
  | "rejectedOptions";

const SECTIONS: { key: SectionKey; label: string; optional?: boolean }[] = [
  { key: "decisions", label: "Decisions" },
  { key: "implementationDetails", label: "Implementation details" },
  { key: "assumptions", label: "Assumptions" },
  { key: "openQuestions", label: "Open questions" },
  { key: "deferredWork", label: "Deferred work" },
  { key: "risks", label: "Risks" },
  { key: "nextSteps", label: "Next steps" },
  { key: "rejectedOptions", label: "Rejected options", optional: true },
];

function updateItems(
  packet: MergePacket,
  key: SectionKey,
  items: MergeItem[],
): MergePacket {
  return {
    ...packet,
    [key]: items,
    rejectedOptions:
      key === "rejectedOptions" ? items : packet.rejectedOptions,
  };
}

export function MergeReviewModal({
  open,
  packet,
  warnings,
  disabled,
  isSaving,
  isConfirming,
  onSave,
  onConfirm,
  onDiscard,
  onClose,
}: MergeReviewModalProps) {
  const [draft, setDraft] = useState<MergePacket | null>(packet);
  const [closeChildAfter, setCloseChildAfter] = useState(false);

  useEffect(() => {
    setDraft(packet);
    setCloseChildAfter(false);
  }, [packet, open]);

  if (!open || !draft) {
    return null;
  }

  const activeDraft = draft;
  const busy = disabled || isSaving || isConfirming;

  function setSectionItems(key: SectionKey, items: MergeItem[]) {
    setDraft((current: MergePacket | null) =>
      current ? updateItems(current, key, items) : current,
    );
  }

  function updateItem(
    key: SectionKey,
    itemId: string,
    field: "title" | "body",
    value: string,
  ) {
    const items = (activeDraft[key] as MergeItem[] | undefined) ?? [];
    setSectionItems(
      key,
      items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addItem(key: SectionKey) {
    const items = (activeDraft[key] as MergeItem[] | undefined) ?? [];
    setSectionItems(key, [
      ...items,
      { id: newMergeItemId(), title: "", body: "" },
    ]);
  }

  function removeItem(key: SectionKey, itemId: string) {
    const items = (activeDraft[key] as MergeItem[] | undefined) ?? [];
    setSectionItems(
      key,
      items.filter((item) => item.id !== itemId),
    );
  }

  return (
    <div className="merge-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="merge-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="merge-modal-header">
          <h2 id="merge-modal-title">
            Review merge packet · #{draft.meta.mergeSequence}
          </h2>
          <p className="merge-modal-subtitle">
            Merging <strong>{draft.meta.childTitle}</strong> into{" "}
            <strong>{draft.meta.parentTitle}</strong>
          </p>
        </header>

        {warnings.length > 0 && (
          <ul className="merge-modal-warnings" role="status">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        <div className="merge-modal-body">
          <label className="merge-modal-label" htmlFor="merge-summary">
            Executive summary
          </label>
          <textarea
            id="merge-summary"
            className="merge-modal-textarea"
            rows={4}
            value={draft.executiveSummary}
            disabled={busy}
            onChange={(event) =>
              setDraft({ ...activeDraft, executiveSummary: event.target.value })
            }
          />

          <label className="merge-modal-label" htmlFor="merge-continuity">
            Parent continuity note
          </label>
          <textarea
            id="merge-continuity"
            className="merge-modal-textarea"
            rows={2}
            value={draft.parentContinuityNote ?? ""}
            disabled={busy}
            onChange={(event) =>
              setDraft({
                ...activeDraft,
                parentContinuityNote: event.target.value || undefined,
              })
            }
          />

          {SECTIONS.map(({ key, label, optional }) => {
            const items = (activeDraft[key] as MergeItem[] | undefined) ?? [];
            if (optional && items.length === 0) {
              return (
                <section key={key} className="merge-modal-section">
                  <div className="merge-modal-section-header">
                    <h3>{label}</h3>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => addItem(key)}
                    >
                      Add item
                    </button>
                  </div>
                </section>
              );
            }

            return (
              <section key={key} className="merge-modal-section">
                <div className="merge-modal-section-header">
                  <h3>{label}</h3>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => addItem(key)}
                  >
                    Add item
                  </button>
                </div>
                {items.map((item) => (
                  <div key={item.id} className="merge-modal-item">
                    <input
                      className="merge-modal-input"
                      type="text"
                      placeholder="Title"
                      value={item.title}
                      disabled={busy}
                      onChange={(event) =>
                        updateItem(key, item.id, "title", event.target.value)
                      }
                    />
                    <textarea
                      className="merge-modal-textarea"
                      rows={2}
                      placeholder="Details"
                      value={item.body}
                      disabled={busy}
                      onChange={(event) =>
                        updateItem(key, item.id, "body", event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="merge-modal-remove"
                      disabled={busy}
                      onClick={() => removeItem(key, item.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </section>
            );
          })}
        </div>

        <footer className="merge-modal-footer">
          <label className="merge-modal-checkbox">
            <input
              type="checkbox"
              checked={closeChildAfter}
              disabled={busy}
              onChange={(event) => setCloseChildAfter(event.target.checked)}
            />
            Close child branch after merge
          </label>

          <div className="merge-modal-actions">
            <button type="button" disabled={busy} onClick={() => void onDiscard()}>
              Discard draft
            </button>
            <button type="button" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSave(activeDraft)}
            >
              {isSaving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              className="merge-modal-confirm"
              disabled={busy || !activeDraft.executiveSummary.trim()}
              onClick={() => void onConfirm(closeChildAfter)}
            >
              {isConfirming ? "Confirming…" : "Confirm merge"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
