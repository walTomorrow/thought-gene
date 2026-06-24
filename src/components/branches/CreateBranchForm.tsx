import { useState, type FormEvent } from "react";

type CreateBranchFormProps = {
  disabled: boolean;
  onCreate: (input: { title: string; purpose: string }) => Promise<void>;
};

export function CreateBranchForm({ disabled, onCreate }: CreateBranchFormProps) {
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedPurpose = purpose.trim();
    if (!trimmedTitle || !trimmedPurpose) {
      return;
    }

    await onCreate({ title: trimmedTitle, purpose: trimmedPurpose });
    setTitle("");
    setPurpose("");
  }

  return (
    <form className="create-branch-form" onSubmit={handleSubmit}>
      <h2 className="create-branch-heading">New branch</h2>
      <label className="create-branch-label" htmlFor="branch-title">
        Title
      </label>
      <input
        id="branch-title"
        className="create-branch-input"
        type="text"
        placeholder="e.g. Data Storage"
        value={title}
        disabled={disabled}
        onChange={(event) => setTitle(event.target.value)}
      />
      <label className="create-branch-label" htmlFor="branch-purpose">
        Purpose
      </label>
      <textarea
        id="branch-purpose"
        className="create-branch-textarea"
        rows={2}
        placeholder="What question or topic does this branch explore?"
        value={purpose}
        disabled={disabled}
        onChange={(event) => setPurpose(event.target.value)}
      />
      <button
        className="create-branch-submit"
        type="submit"
        disabled={disabled || !title.trim() || !purpose.trim()}
      >
        Create branch
      </button>
    </form>
  );
}
