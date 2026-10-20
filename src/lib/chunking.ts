import type { Chunk, DocumentRecord } from "@/types/audit";
import { normalizeWhitespace, slugify } from "@/lib/text";

export const MAX_CHUNK_CHARS = 1_500;
export const CHUNK_OVERLAP_CHARS = 200;

type Section = { heading: string; paragraphs: string[] };

function parseSections(content: string, fallbackTitle: string): Section[] {
  const sections: Section[] = [];
  let heading = fallbackTitle;
  let paragraphs: string[] = [];

  const flush = () => {
    const clean = paragraphs.map(normalizeWhitespace).filter(Boolean);
    if (clean.length) sections.push({ heading, paragraphs: clean });
    paragraphs = [];
  };

  for (const block of content.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const lines = block.split("\n");
    const headingMatch = lines[0]?.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      flush();
      heading = normalizeWhitespace(headingMatch[1]);
      const remainder = lines.slice(1).join(" ").trim();
      if (remainder) paragraphs.push(remainder);
    } else {
      paragraphs.push(lines.join(" "));
    }
  }
  flush();
  return sections;
}

function splitSection(paragraphs: string[]) {
  const parts: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) parts.push(current.trim());
  };

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }
    if (`${current}\n\n${paragraph}`.length <= MAX_CHUNK_CHARS) {
      current = `${current}\n\n${paragraph}`;
      continue;
    }
    pushCurrent();
    const overlap = current.slice(-CHUNK_OVERLAP_CHARS);
    current = `${overlap}\n\n${paragraph}`;
  }
  pushCurrent();
  return parts;
}

export function chunkDocument(document: DocumentRecord): Chunk[] {
  let ordinal = 0;
  return parseSections(document.content, document.title).flatMap((section) =>
    splitSection(section.paragraphs).map((content, localIndex) => ({
      chunkId: `${document.documentId}:${slugify(section.heading)}:${localIndex}`,
      documentId: document.documentId,
      policyKey: document.policyKey,
      title: document.title,
      version: document.version,
      effectiveFrom: document.effectiveFrom,
      status: document.status,
      section: section.heading,
      ordinal: ordinal++,
      content,
    })),
  );
}
