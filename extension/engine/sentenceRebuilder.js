export function rebuildSentences(lines) {

  const sentences = [];

  let buffer = "";
  let subtitleIds = [];
  let sentenceId = 0;

  const endRegex = /[.?!]$/;

  for (const line of lines) {

    const cleaned = line.text.trim();

    if (!cleaned) continue;

    subtitleIds.push(line.id);

    if (buffer) {
      buffer += " " + cleaned;
    } else {
      buffer = cleaned;
    }

    if (endRegex.test(cleaned)) {
      sentences.push({
        sentenceId,
        text: buffer,
        subtitleIds
      });

      sentenceId++;
      buffer = "";
      subtitleIds = [];
    }
  }

  if (buffer) {
    sentences.push({
      sentenceId,
      text: buffer,
      subtitleIds
    });
  }

  return sentences;
}