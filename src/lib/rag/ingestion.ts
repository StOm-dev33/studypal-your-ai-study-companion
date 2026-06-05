type ChunkOptions = {
  chunkSize?: number;
  overlap?: number;
  maxChunks?: number;
};

const MIN_BREAKPOINT_RATIO = 0.5;
const DEFAULT_CHUNK_SIZE = 900;
const DEFAULT_CHUNK_OVERLAP = 180;
const DEFAULT_MAX_CHUNKS = 500;

export function cleanMaterialText(input: string): string {
  return input
    .replaceAll("\0", "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkMaterialText(input: string, options: ChunkOptions = {}): string[] {
  // Defaults target retrieval-quality chunks with enough overlap for context continuity.
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_CHUNK_OVERLAP;
  const maxChunks = options.maxChunks ?? DEFAULT_MAX_CHUNKS;
  const text = cleanMaterialText(input);

  if (!text) return [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length && chunks.length < maxChunks) {
    const maxEnd = Math.min(cursor + chunkSize, text.length);
    const minChunkSize = Math.floor(chunkSize * MIN_BREAKPOINT_RATIO);
    let end = maxEnd;

    if (maxEnd < text.length) {
      const paragraphBreak = text.lastIndexOf("\n\n", maxEnd);
      const sentenceBreak = text.lastIndexOf(". ", maxEnd);
      const lineBreak = text.lastIndexOf("\n", maxEnd);

      const bestBreak = [paragraphBreak, sentenceBreak, lineBreak]
        // Keep each chunk at least MIN_BREAKPOINT_RATIO (50%) of target size.
        .filter((point) => point > cursor + minChunkSize)
        .sort((a, b) => b - a)[0];

      if (bestBreak) {
        end = bestBreak + 1;
      }
    }

    const chunk = text.slice(cursor, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= text.length) break;
    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks;
}
