// server/src/subtitlePreprocessor.js

/**
 * Subtitle preprocessing.
 *
 * IMPORTANT:
 * - This module performs NO semantic processing.
 * - It does NOT reconstruct Sentence Units.
 * - It does NOT merge subtitles.
 * - It does NOT split subtitles.
 * - It only removes formatting noise and invalid subtitle entries.
 *
 * Input:
 * [
 *   {
 *     sentenceId: Number,
 *     start: Number,
 *     duration: Number,
 *     subtitleIds: Number[],
 *     text: String
 *   }
 * ]
 *
 * Output:
 * Same structure, with cleaned `text`.
 */

export function preprocessSubtitles(subtitles) {

  if (!Array.isArray(subtitles)) {
    throw new TypeError(
      "subtitles must be an array"
    );
  }

  return subtitles
    .filter(isValidSubtitle)
    .map(cleanSubtitle)
    .filter(subtitle => subtitle.text.length > 0);
}


// --------------------------------------------------
// Validation
// --------------------------------------------------

function isValidSubtitle(subtitle) {

  if (!subtitle || typeof subtitle !== "object") {
    return false;
  }

  if (
    typeof subtitle.sentenceId !== "number" ||
    typeof subtitle.start !== "number" ||
    typeof subtitle.duration !== "number"
  ) {
    return false;
  }

  if (typeof subtitle.text !== "string") {
    return false;
  }

  return true;
}


// --------------------------------------------------
// Cleaning
// --------------------------------------------------

function cleanSubtitle(subtitle) {

  let text = subtitle.text;

  // 1. Normalize Unicode
  text = text.normalize("NFC");

  // 2. Normalize whitespace
  text = text
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 3. Remove subtitle formatting tags
  text = removeFormattingTags(text);

  // 4. Remove non-semantic bracket annotations
  text = removeBracketAnnotations(text);

  // 5. Normalize whitespace again
  text = text
    .replace(/\s+/g, " ")
    .trim();

  return {
    ...subtitle,
    text
  };
}


// --------------------------------------------------
// Formatting tags
// --------------------------------------------------

function removeFormattingTags(text) {

  return text
    // HTML-like tags
    .replace(/<[^>]*>/g, "")

    // ASS / subtitle formatting tags
    .replace(/\{\\[^}]*\}/g, "")

    // Common zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}


// --------------------------------------------------
// Bracket annotations
// --------------------------------------------------

function removeBracketAnnotations(text) {

  return text
    // [Music], [Applause], [Laughter], etc.
    .replace(
      /\[(?:music|applause|laughter|laughing|clapping|cheering|noise|inaudible|silence)\]/gi,
      ""
    )

    // (Music), (Applause), etc.
    .replace(
      /\((?:music|applause|laughter|laughing|clapping|cheering|noise|inaudible|silence)\)/gi,
      ""
    )

    // Generic bracketed annotation.
    // IMPORTANT:
    // Only remove brackets that look like non-speech annotations.
    .replace(
      /\[(?:[^\]]{1,40})\]/g,
      match => {
        const content =
          match.slice(1, -1).trim();

        return isLikelyAnnotation(content)
          ? ""
          : match;
      }
    )

    .replace(
      /\((?:[^)]{1,40})\)/g,
      match => {
        const content =
          match.slice(1, -1).trim();

        return isLikelyAnnotation(content)
          ? ""
          : match;
      }
    );
}


// --------------------------------------------------
// Annotation heuristic
// --------------------------------------------------

function isLikelyAnnotation(content) {

  const annotationPatterns = [

    /^(music|applause|laughter|laughing|clapping|cheering)$/i,

    /^(background music|background noise)$/i,

    /^(inaudible|unintelligible)$/i,

    /^(silence|pause)$/i,

    /^(crowd|audience)$/i,

    /^(noise|sound)$/i,

    /^(singing)$/i,

    /^(speaking in .*?)$/i

  ];

  return annotationPatterns.some(
    pattern => pattern.test(content)
  );
}