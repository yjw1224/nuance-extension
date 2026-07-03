function sanitizeGPTOutput(text) {

  return text

    // Markdown 제거
    .replaceAll("```json", "")
    .replaceAll("```", "")

    // LaTeX inline math
    .replaceAll("\\(", "(")
    .replaceAll("\\)", ")")
    .replaceAll("\\[", "[")
    .replaceAll("\\]", "]")

    // Zero-width 문자 제거
    .replace(/[\u200B-\u200D\uFEFF]/g, "")

    .replace(
    /\\([^"\\/bfnrtu])/g,
    "$1"
    )

    .trim();

}

function extractJsonArray(text) {

  const start =
    text.indexOf("[");

  const end =
    text.lastIndexOf("]");

  if (
    start === -1 ||
    end === -1
  ) {

    throw new Error(
      "No JSON array found."
    );

  }

  return text.slice(
    start,
    end + 1
  );

}

export function parseGPTJson(text) {

  const cleaned =
    sanitizeGPTOutput(
      text
    );

  const json =
    extractJsonArray(
      cleaned
    );

  return JSON.parse(
    json
  );

}