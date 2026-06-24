import type { BranchSummary } from "../../types/message";

type BranchListProps = {
  branches: BranchSummary[];
  activeBranchId: string;
  disabled: boolean;
  onSelect: (branchId: string) => void;
};

export function BranchList({
  branches,
  activeBranchId,
  disabled,
  onSelect,
}: BranchListProps) {
  if (branches.length === 0) {
    return null;
  }

  return (
    <nav className="branch-list" aria-label="Branches">
      <h2 className="branch-list-heading">Branches</h2>
      <ul>
        {branches.map((branch) => {
          const isActive = branch.id === activeBranchId;
          return (
            <li key={branch.id}>
              <button
                type="button"
                className={`branch-list-item ${isActive ? "branch-list-item-active" : ""}`}
                disabled={disabled || isActive}
                aria-current={isActive ? "true" : undefined}
                onClick={() => onSelect(branch.id)}
              >
                <span className="branch-list-item-title">{branch.title}</span>
                <span className="branch-list-item-purpose">{branch.purpose}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
