import type { MergePacket } from "../../types/message";
import { getMergeDocumentSections } from "../../../shared/merge-display";

type MergePacketDocumentProps = {
  packet: MergePacket;
  className?: string;
};

export function MergePacketDocument({
  packet,
  className = "",
}: MergePacketDocumentProps) {
  const sections = getMergeDocumentSections(packet);

  return (
    <article className={`merge-doc ${className}`.trim()}>
      <header className="merge-doc-header">
        <p className="merge-doc-eyebrow">Merge packet</p>
        <h2 className="merge-doc-title">
          {packet.meta.childTitle} → {packet.meta.parentTitle}
        </h2>
        {packet.meta.childPurpose.trim() && (
          <p className="merge-doc-purpose">{packet.meta.childPurpose}</p>
        )}
      </header>

      {sections.map((section) => (
        <section key={section.id} className="merge-doc-section">
          <h3 className="merge-doc-section-title">{section.title}</h3>
          <div className="merge-doc-section-body">
            {section.items.map((item) => (
              <div key={item.id} className="merge-doc-item">
                {item.title.trim() && (
                  <h4 className="merge-doc-item-title">{item.title}</h4>
                )}
                {item.body.trim() && (
                  <p className="merge-doc-item-body">{item.body}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
