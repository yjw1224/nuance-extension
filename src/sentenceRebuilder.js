export function rebuildSentences(lines) {

  if (typeof lines === "string") {
    lines = lines
      .split("\n")
      .filter(Boolean);
  }

  const sentences = [];

  let buffer = "";

  const endRegex = /[.?!]$/;

  for (const line of lines) {

    const cleaned = line.trim();

    if (!cleaned) continue;

    if (buffer) {
      buffer += " " + cleaned;
    } else {
      buffer = cleaned;
    }

    if (endRegex.test(cleaned)) {
      sentences.push(buffer);
      buffer = "";
    }
  }

  if (buffer) {
    sentences.push(buffer);
  }

  return sentences;
}