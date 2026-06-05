type ChunkOptions = {
  chunkSize?: number;
  overlap?: number;
  maxChunks?: number;
};

export function cleanMaterialText(input: string): string {
  return input
    .replace(/\u0000/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkMaterialText(input: string, options: ChunkOptions = {}): string[] {
  const chunkSize = options.chunkSize ?? 900;
  const overlap = options.overlap ?? 180;
  const maxChunks = options.maxChunks ?? 500;
  const text = cleanMaterialText(input);

  if (!text) return [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length && chunks.length < maxChunks) {
    const maxEnd = Math.min(cursor + chunkSize, text.length);
    let end = maxEnd;

    if (maxEnd < text.length) {
      const paragraphBreak = text.lastIndexOf("\n\n", maxEnd);
      const sentenceBreak = text.lastIndexOf(". ", maxEnd);
      const lineBreak = text.lastIndexOf("\n", maxEnd);

      const bestBreak = [paragraphBreak, sentenceBreak, lineBreak]
        .filter((point) => point > cursor + Math.floor(chunkSize * 0.5))
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
