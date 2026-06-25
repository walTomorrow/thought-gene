import type { MergeItem, MergePacket } from "./merge";
import { getMergeTeaser } from "./merge-display";

function renderItems(items: MergeItem[]): string {
  if (items.length === 0) {
    return "_None._\n";
  }

  return items
    .map((item) => {
      const confidence = item.confidence ? ` _(${item.confidence} confidence)_` : "";
      return `- **${item.title}**${confidence} — ${item.body}`;
    })
    .join("\n");
}

/**
 * Renders a merge packet as markdown for insertion into the parent branch chat.
 */
export function renderMergePacketMarkdown(packet: MergePacket): string {
  const { meta } = packet;
  const lines: string[] = [
    `**Merged from branch:** ${meta.childTitle} · Merge #${meta.mergeSequence}`,
    `**Purpose:** ${meta.childPurpose}`,
    "",
    "## Summary",
    packet.executiveSummary.trim(),
    "",
  ];

  if (packet.parentContinuityNote?.trim()) {
    lines.push("## Parent continuity", packet.parentContinuityNote.trim(), "");
  }

  const sections: [string, MergeItem[]][] = [
    ["Decisions", packet.decisions],
    ["Implementation details", packet.implementationDetails],
    ["Assumptions", packet.assumptions],
    ["Open questions", packet.openQuestions],
    ["Deferred work", packet.deferredWork],
    ["Risks", packet.risks],
    ["Next steps", packet.nextSteps],
  ];

  if (packet.rejectedOptions && packet.rejectedOptions.length > 0) {
    sections.push(["Rejected options", packet.rejectedOptions]);
  }

  for (const [heading, items] of sections) {
    lines.push(`## ${heading}`, renderItems(items), "");
  }

  lines.push(
    "---",
    `_Child branch: ${meta.childTitle}_`,
  );

  return lines.join("\n").trim();
}

/** Compact text stored on the parent chat message (teaser only). */
export function renderMergeCardContent(packet: MergePacket): string {
  return getMergeTeaser(packet);
}
