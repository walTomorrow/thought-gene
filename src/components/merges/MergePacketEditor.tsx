import { useEffect, useState } from "react";
import type { MergeItem, MergePacket } from "../../types/message";
import { newMergeItemId } from "../../../shared/merge";

type MergePacketEditorProps = {
  packet: MergePacket;
  disabled?: boolean;
  onChange: (packet: MergePacket) => void;
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

export function MergePacketEditor({
  packet,
  disabled = false,
  onChange,
}: MergePacketEditorProps) {
  const [draft, setDraft] = useState(packet);

  useEffect(() => {
    setDraft(packet);
  }, [packet]);

  function commit(next: MergePacket) {
    setDraft(next);
    onChange(next);
  }

  function setSectionItems(key: SectionKey, items: MergeItem[]) {
    commit(updateItems(draft, key, items));
  }

  function updateItem(
    key: SectionKey,
    itemId: string,
    field: "title" | "body",
    value: string,
  ) {
    const items = (draft[key] as MergeItem[] | undefined) ?? [];
    setSectionItems(
      key,
      items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addItem(key: SectionKey) {
    const items = (draft[key] as MergeItem[] | undefined) ?? [];
    setSectionItems(key, [
      ...items,
      { id: newMergeItemId(), title: "", body: "" },
    ]);
  }

  function removeItem(key: SectionKey, itemId: string) {
    const items = (draft[key] as MergeItem[] | undefined) ?? [];
    setSectionItems(
      key,
      items.filter((item) => item.id !== itemId),
    );
  }

  return (
    <div className="merge-editor">
      <label className="merge-editor-label" htmlFor="merge-summary">
        Executive summary
      </label>
      <textarea
        id="merge-summary"
        className="merge-editor-textarea"
        rows={4}
        value={draft.executiveSummary}
        disabled={disabled}
        onChange={(event) =>
          commit({ ...draft, executiveSummary: event.target.value })
        }
      />

      <label className="merge-editor-label" htmlFor="merge-continuity">
        Parent continuity note
      </label>
      <textarea
        id="merge-continuity"
        className="merge-editor-textarea"
        rows={2}
        value={draft.parentContinuityNote ?? ""}
        disabled={disabled}
        onChange={(event) =>
          commit({
            ...draft,
            parentContinuityNote: event.target.value || undefined,
          })
        }
      />

      {SECTIONS.map(({ key, label, optional }) => {
        const items = (draft[key] as MergeItem[] | undefined) ?? [];
        if (optional && items.length === 0) {
          return (
            <section key={key} className="merge-editor-section">
              <div className="merge-editor-section-header">
                <h3>{label}</h3>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => addItem(key)}
                >
                  Add item
                </button>
              </div>
            </section>
          );
        }

        return (
          <section key={key} className="merge-editor-section">
            <div className="merge-editor-section-header">
              <h3>{label}</h3>
              <button
                type="button"
                disabled={disabled}
                onClick={() => addItem(key)}
              >
                Add item
              </button>
            </div>
            {items.map((item) => (
              <div key={item.id} className="merge-editor-item">
                <input
                  className="merge-editor-input"
                  type="text"
                  placeholder="Title"
                  value={item.title}
                  disabled={disabled}
                  onChange={(event) =>
                    updateItem(key, item.id, "title", event.target.value)
                  }
                />
                <textarea
                  className="merge-editor-textarea"
                  rows={2}
                  placeholder="Details"
                  value={item.body}
                  disabled={disabled}
                  onChange={(event) =>
                    updateItem(key, item.id, "body", event.target.value)
                  }
                />
                <button
                  type="button"
                  className="merge-editor-remove"
                  disabled={disabled}
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
  );
}
