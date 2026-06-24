import type { BranchSummary } from "../../types/message";

type ClosedBranchListProps = {
  branches: BranchSummary[];
  activeBranchId: string;
  disabled: boolean;
  onSelect: (branchId: string) => void;
};

export function ClosedBranchList({
  branches,
  activeBranchId,
  disabled,
  onSelect,
}: ClosedBranchListProps) {
  if (branches.length === 0) {
    return null;
  }

  return (
    <nav className="branch-list branch-list-closed" aria-label="Closed branches">
      <h2 className="branch-list-heading">Closed branches</h2>
      <ul>
        {branches.map((branch) => {
          const isActive = branch.id === activeBranchId;
          return (
            <li key={branch.id}>
              <button
                type="button"
                className={`branch-list-item branch-list-item-closed ${isActive ? "branch-list-item-active" : ""}`}
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
