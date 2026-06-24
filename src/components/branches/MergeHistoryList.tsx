import type { BranchMergeSummary } from "../../types/message";

type MergeHistoryListProps = {
  merges: BranchMergeSummary[];
  isLoading: boolean;
};

export function MergeHistoryList({ merges, isLoading }: MergeHistoryListProps) {
  if (isLoading) {
    return (
      <section className="merge-history" aria-label="Merge history">
        <h2 className="merge-history-heading">Merge history</h2>
        <p className="merge-history-status" role="status">
          Loading…
        </p>
      </section>
    );
  }

  if (merges.length === 0) {
    return null;
  }

  return (
    <section className="merge-history" aria-label="Merge history">
      <h2 className="merge-history-heading">Merge history</h2>
      <ul className="merge-history-list">
        {merges.map((merge) => (
          <li key={merge.id} className="merge-history-item">
            <span className="merge-history-item-title">
              Merge #{merge.mergeSequence}
            </span>
            <span className="merge-history-item-meta">
              {merge.confirmedAt
                ? new Date(merge.confirmedAt).toLocaleString()
                : "Draft"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
