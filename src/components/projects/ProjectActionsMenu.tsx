import { useEffect, useId, useRef, useState } from "react";
import type { ProjectListItem } from "../../../shared/projects";
import {
  getProjectDeletePhrase,
  isProjectDeletePhraseValid,
} from "../../lib/project-delete-confirmation";

type ProjectActionsMenuProps = {
  project: ProjectListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void | Promise<void>;
  disabled?: boolean;
  triggerClassName: string;
};

type PanelMode = "menu" | "delete";

export function ProjectActionsMenu({
  project,
  open,
  onOpenChange,
  onDelete,
  disabled = false,
  triggerClassName,
}: ProjectActionsMenuProps) {
  const menuId = useId();
  const deletePanelId = useId();
  const deleteTitleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<PanelMode>("menu");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const deletePhrase = getProjectDeletePhrase(project.name);
  const canDelete = isProjectDeletePhraseValid(confirmText, project.name);

  function closeMenu() {
    setMode("menu");
    setConfirmText("");
    setIsDeleting(false);
    onOpenChange(false);
  }

  function openMenu() {
    setMode("menu");
    setConfirmText("");
    onOpenChange(true);
  }

  function toggleMenu() {
    if (open) {
      closeMenu();
      return;
    }
    openMenu();
  }

  useEffect(() => {
    if (!open) {
      setMode("menu");
      setConfirmText("");
      setIsDeleting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "delete") {
      return;
    }
    confirmInputRef.current?.focus();
  }, [open, mode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const panelEl = panel;

    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusableElements() {
      return Array.from(
        panelEl.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);
    }

    const initialFocusable = getFocusableElements();
    if (mode === "menu") {
      initialFocusable[0]?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMode("menu");
        setConfirmText("");
        setIsDeleting(false);
        onOpenChange(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelEl.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setMode("menu");
      setConfirmText("");
      setIsDeleting(false);
      onOpenChange(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, mode, onOpenChange]);

  async function handleConfirmDelete() {
    if (!canDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete();
      closeMenu();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="project-actions">
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        disabled={disabled || isDeleting}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Actions for ${project.name}`}
        onClick={(event) => {
          event.stopPropagation();
          toggleMenu();
        }}
      >
        ⋮
      </button>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          className={`project-actions-popover${
            mode === "delete" ? " project-actions-popover-delete" : ""
          }`}
          role={mode === "menu" ? "menu" : undefined}
          aria-label={mode === "menu" ? `Actions for ${project.name}` : undefined}
          onClick={(event) => event.stopPropagation()}
        >
          {mode === "menu" ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="project-actions-item project-actions-item-disabled"
                disabled
                aria-disabled="true"
              >
                Rename
                <span className="project-actions-item-hint">Soon</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="project-actions-item project-actions-item-danger"
                onClick={() => {
                  setMode("delete");
                  setConfirmText("");
                }}
              >
                Delete Project
              </button>
            </>
          ) : (
            <div
              id={deletePanelId}
              role="dialog"
              aria-modal="false"
              aria-labelledby={deleteTitleId}
              className="project-actions-delete"
            >
              <h4 id={deleteTitleId} className="project-actions-delete-title">
                Delete project?
              </h4>
              <p className="project-actions-delete-body">
                This permanently removes all branches, messages, merges, and
                artifacts in this project.
              </p>
              <label className="project-actions-delete-label" htmlFor={`${menuId}-confirm`}>
                Type{" "}
                <code className="project-actions-delete-phrase">{deletePhrase}</code>{" "}
                to confirm
              </label>
              <input
                ref={confirmInputRef}
                id={`${menuId}-confirm`}
                type="text"
                className="project-actions-delete-input"
                value={confirmText}
                autoComplete="off"
                spellCheck={false}
                disabled={isDeleting}
                aria-describedby={`${deleteTitleId}`}
                onChange={(event) => setConfirmText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canDelete && !isDeleting) {
                    event.preventDefault();
                    void handleConfirmDelete();
                  }
                }}
              />
              <div className="project-actions-delete-actions">
                <button
                  type="button"
                  className="project-btn project-btn-ghost"
                  disabled={isDeleting}
                  onClick={closeMenu}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="project-btn project-btn-danger"
                  disabled={!canDelete || isDeleting}
                  onClick={() => void handleConfirmDelete()}
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
