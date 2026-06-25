import { useEffect, useState } from "react";
import { getBranchMerge } from "../../api/merges-client";
import type { MergePacket } from "../../types/message";
import { MergePacketDocument } from "./MergePacketDocument";

type MergeChatCardProps = {
  projectId: string;
  mergeId: string;
  teaser: string;
  childTitle?: string;
  highlighted?: boolean;
  messageId: string;
};

export function MergeChatCard({
  projectId,
  mergeId,
  teaser,
  childTitle,
  highlighted = false,
  messageId,
}: MergeChatCardProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [packet, setPacket] = useState<MergePacket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (packet) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void getBranchMerge(mergeId, projectId)
      .then((result) => {
        if (!cancelled) {
          setPacket(result.merge.packet);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load merge details.";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [packet, mergeId, projectId]);

  const displayChildTitle = childTitle ?? packet?.meta.childTitle;

  return (
    <article
      className={`merge-chat-card ${reviewOpen ? "merge-chat-card-expanded" : ""} ${highlighted ? "message-bubble-highlighted" : ""}`}
      aria-label="Merged branch"
      data-message-id={messageId}
    >
      <div className="merge-chat-card-icon" aria-hidden="true">
        ⎇
      </div>
      <div className="merge-chat-card-body">
        <p className="merge-chat-card-label">
          Merged from:{" "}
          <strong>{displayChildTitle ?? (isLoading ? "…" : "child branch")}</strong>
        </p>
        <p className="merge-chat-card-teaser">{teaser}</p>
        <button
          type="button"
          className="merge-chat-card-toggle"
          aria-expanded={reviewOpen}
          onClick={() => setReviewOpen((value) => !value)}
        >
          Review Merge {reviewOpen ? "▲" : "▼"}
        </button>
        {reviewOpen && (
          <div className="merge-chat-card-details">
            {isLoading && !packet && (
              <p className="merge-chat-card-status">Loading merge details…</p>
            )}
            {error && !packet && (
              <p className="merge-chat-card-status merge-chat-card-error" role="alert">
                {error}
              </p>
            )}
            {packet && <MergePacketDocument packet={packet} />}
          </div>
        )}
      </div>
    </article>
  );
}
