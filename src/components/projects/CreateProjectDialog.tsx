import { useState, type FormEvent } from "react";

type CreateProjectDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; summary?: string }) => Promise<void>;
};

export function CreateProjectDialog({
  open,
  isSubmitting,
  onClose,
  onCreate,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || isSubmitting) {
      return;
    }

    await onCreate({
      name: name.trim(),
      summary: summary.trim() || undefined,
    });
    setName("");
    setSummary("");
  }

  return (
    <div
      className="project-dialog-backdrop"
      role="presentation"
      onClick={isSubmitting ? undefined : onClose}
    >
      <div
        className="project-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="create-project-title" className="project-dialog-title">
          New project
        </h2>
        <p className="project-dialog-lead">
          Start a new thinking space with a main branch.
        </p>
        <form className="project-dialog-form" onSubmit={handleSubmit}>
          <label className="project-dialog-label" htmlFor="project-name">
            Name
          </label>
          <input
            id="project-name"
            className="project-dialog-input"
            type="text"
            value={name}
            disabled={isSubmitting}
            placeholder="e.g. Recipe App"
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <label className="project-dialog-label" htmlFor="project-summary">
            Description
          </label>
          <textarea
            id="project-summary"
            className="project-dialog-textarea"
            rows={3}
            value={summary}
            disabled={isSubmitting}
            placeholder="What is this project about?"
            onChange={(event) => setSummary(event.target.value)}
          />
          <div className="project-dialog-actions">
            <button
              type="button"
              className="project-btn project-btn-muted"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="project-btn project-btn-primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
