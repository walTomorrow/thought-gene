import type { MergeItem, MergePacket } from "./merge";

const REMEMBER_BULLET_LIMIT = 5;

/** Short trust-building bullets for the confirm dialog. */
export function getRememberBullets(packet: MergePacket): string[] {
  if (packet.rememberBullets?.length) {
    return packet.rememberBullets
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, REMEMBER_BULLET_LIMIT);
  }

  const bullets: string[] = [];
  for (const item of packet.decisions) {
    if (item.title.trim()) {
      bullets.push(item.title.trim());
    }
  }
  for (const item of packet.deferredWork) {
    if (item.title.trim()) {
      bullets.push(`${item.title.trim()} deferred`);
    }
  }
  for (const item of packet.openQuestions) {
    if (item.title.trim()) {
      bullets.push(`${item.title.trim()} — still open`);
    }
  }

  if (bullets.length === 0 && packet.executiveSummary.trim()) {
    return [packet.executiveSummary.trim()];
  }

  return bullets.slice(0, REMEMBER_BULLET_LIMIT);
}

/** One-line teaser for the compact parent chat card. */
export function getMergeTeaser(packet: MergePacket): string {
  return packet.executiveSummary.trim();
}

export type MergeDocumentSection = {
  id: string;
  title: string;
  items: MergeItem[];
};

/** Document sections with content only (empty sections omitted). */
export function getMergeDocumentSections(
  packet: MergePacket,
): MergeDocumentSection[] {
  const sections: MergeDocumentSection[] = [];

  if (packet.executiveSummary.trim()) {
    sections.push({
      id: "summary",
      title: "Summary",
      items: [
        {
          id: "summary-body",
          title: "Overview",
          body: packet.executiveSummary.trim(),
        },
      ],
    });
  }

  if (packet.parentContinuityNote?.trim()) {
    sections.push({
      id: "continuity",
      title: "Parent continuity",
      items: [
        {
          id: "continuity-body",
          title: "Context",
          body: packet.parentContinuityNote.trim(),
        },
      ],
    });
  }

  const itemSections: [string, string, MergeItem[]][] = [
    ["decisions", "Decisions", packet.decisions],
    ["implementation", "Implementation details", packet.implementationDetails],
    ["assumptions", "Assumptions", packet.assumptions],
    ["open-questions", "Open questions", packet.openQuestions],
    ["deferred", "Deferred work", packet.deferredWork],
    ["risks", "Risks", packet.risks],
    ["next-steps", "Next steps", packet.nextSteps],
    ["rejected", "Rejected options", packet.rejectedOptions ?? []],
  ];

  for (const [id, title, items] of itemSections) {
    const filtered = items.filter(
      (item) => item.title.trim() || item.body.trim(),
    );
    if (filtered.length > 0) {
      sections.push({ id, title, items: filtered });
    }
  }

  return sections;
}
