/**
 * Build final Segments from Sentence Units and
 * LLM-generated segment boundaries.
 *
 * Input:
 *   sentenceUnits
 *   [
 *     {
 *       unitId,
 *       start,
 *       end,
 *       subtitleIds,
 *       text
 *     }
 *   ]
 *
 *   boundaries
 *   [
 *     {
 *       endUnitId,
 *       role
 *     }
 *   ]
 *
 * Output:
 *   [
 *     {
 *       id,
 *       start,
 *       end,
 *       subtitleIds,
 *       text,
 *       concept,
 *       role
 *     }
 *   ]
 *
 * Concept is intentionally null here.
 * Concept extraction is a separate step.
 */

export function buildSegments(
  sentenceUnits,
  boundaries
) {
  if (
    !Array.isArray(sentenceUnits) ||
    sentenceUnits.length === 0
  ) {
    return [];
  }

  if (
    !Array.isArray(boundaries) ||
    boundaries.length === 0
  ) {
    return [];
  }

  // --------------------------------
  // 1. Normalize boundaries
  // --------------------------------

  const sortedBoundaries = [...boundaries]
    .sort(
      (a, b) =>
        a.endUnitId - b.endUnitId
    );

  // --------------------------------
  // 2. Validate boundary sequence
  // --------------------------------

  const lastUnitId =
    sentenceUnits[
      sentenceUnits.length - 1
    ].unitId;

  const validBoundaries =
    sortedBoundaries.filter(
      boundary =>
        Number.isInteger(
          boundary.endUnitId
        ) &&
        boundary.endUnitId >=
          sentenceUnits[0].unitId &&
        boundary.endUnitId <=
          lastUnitId
    );

  if (validBoundaries.length === 0) {
    return [];
  }

  // --------------------------------
  // 3. Build segments
  // --------------------------------

  const segments = [];

  let startIndex = 0;

  for (
    let i = 0;
    i < validBoundaries.length;
    i++
  ) {
    const boundary =
      validBoundaries[i];

    const endIndex =
      sentenceUnits.findIndex(
        unit =>
          unit.unitId ===
          boundary.endUnitId
      );

    if (endIndex < startIndex) {
      continue;
    }

    const units =
      sentenceUnits.slice(
        startIndex,
        endIndex + 1
      );

    if (units.length === 0) {
      continue;
    }

    // --------------------------------
    // 4. Timeframe
    // --------------------------------

    const start =
      units[0].start;

    const end =
      units[units.length - 1].end;

    // --------------------------------
    // 5. Subtitle IDs
    // --------------------------------

    const subtitleIds =
      [
        ...new Set(
          units.flatMap(
            unit =>
              Array.isArray(
                unit.subtitleIds
              )
                ? unit.subtitleIds
                : []
          )
        )
      ];

    // --------------------------------
    // 6. Text
    // --------------------------------

    const text =
      units
        .map(unit => unit.text)
        .filter(
          text =>
            typeof text === "string" &&
            text.trim().length > 0
        )
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    // --------------------------------
    // 7. Create Segment
    // --------------------------------

    segments.push({
      id:
        `S${String(
          segments.length + 1
        ).padStart(3, "0")}`,

      start,

      end,

      subtitleIds,

      text,

      concept: null,

      role:
        boundary.role
    });

    // Next segment starts after
    // this boundary.
    startIndex =
      endIndex + 1;
  }

  // --------------------------------
  // 8. Safety check
  // --------------------------------

  if (
    startIndex <
    sentenceUnits.length
  ) {
    console.warn(
      "Segment construction left uncovered Sentence Units:",
      sentenceUnits.length -
        startIndex
    );
  }

  return segments;
}