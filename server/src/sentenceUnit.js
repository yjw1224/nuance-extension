import {openai} from './openai.js'

const SU_LENGTH_LIMIT = 65;
const SU_WORD_LIMIT = 10;

// ==================================================
// Main
// ==================================================

export async function reconstructSentenceUnits(
  subtitles
) {

  const suTimerStart = performance.now();

  // -----------------------------------------------
  // 1. Build fragments
  // -----------------------------------------------

  const fragments =
    buildFragments(subtitles);

  // console.log(
  //   "Fragments:",
  //   fragments.length
  // );

  // console.log(
  // fragments.slice(0, 15).map(
  //     fragment => ({
  //       id: fragment.fragmentId,
  //       subtitleId: fragment.subtitleId,
  //       text: fragment.text
  //     })
  //   )
  // );


  // -----------------------------------------------
  // 2. LLM boundary detection
  // -----------------------------------------------

  const input =
    fragments
      .map(
        fragment =>
          `${fragment.fragmentId}: ${fragment.text}`
      )
      .join("\n");

  const response =
    await openai.responses.parse({

      model:
        process.env.OPENAI_TRANSLATION_MODEL,

      // temperature: 0,
      reasoning: { effort: "none" },

      text: {

        format: {

          type: "json_schema",

          name: "sentence_boundaries",

          strict: true,

          schema: {

            type: "object",

            additionalProperties: false,

            properties: {

              boundaries: {

                type: "array",

                items: {

                  type: "integer"

                }

              }

            },

            required: [
              "boundaries"
            ]

          }

        }

      },

      input: `You reconstruct Sentence Units from subtitle fragments.

A Sentence Unit (SU) is the basic text unit used for subtitle and transcript processing.

Do not analyze concepts, roles, topics, or explanation structure.

Rules:

Priority order:
1. Hard constraint: never create a Sentence Unit longer than ${SU_WORD_LIMIT} words. If a sentence or fragment exceeds this length, split it at the nearest subtitleId-safe boundary before the limit is exceeded.
2. Hard constraint: never split within a single original subtitle. Each Sentence Unit must stay within one original subtitleId boundary; do not break a subtitle into smaller subtitle-level pieces.
3. Hard constraint: never split solely at an arbitrary character position. Only split at a genuine linguistic boundary, and keep each resulting Sentence Unit within the same original subtitleId.
4. Keep fragments together when they form one sentence or utterance.
5. Split when a complete sentence or independent utterance ends.
6. Use punctuation as the strongest boundary signal.
7. If punctuation is missing, infer boundaries from grammatical and linguistic completeness.
8. One fragment may contain multiple sentence units.
9. Multiple fragments may form one sentence unit.
10. Preserve the original text. Do not rewrite, summarize, or translate.
11. Do not merge unrelated utterances.
12. Do not merge non-speech captions such as [music], [applause], or [sound effect] into speech.

Return only the fragment IDs that end each Sentence Unit.

Input:

${input}
`
    });

  const boundaries =
    response.output_parsed.boundaries;

  console.log(
    "Boundaries:",
    boundaries
  );


  // -----------------------------------------------
  // 3. Build Sentence Units
  // -----------------------------------------------

  const units =
    reconcileMissingSubtitleIds(
      enforceHardLengthConstraint(
        buildSentenceUnits(
          fragments,
          boundaries
        ),
        fragments
      ),
      fragments
    );


  // -----------------------------------------------
  // 4. Resolve overlapping timeframes
  // -----------------------------------------------

  resolveOverlaps(units);


  // -----------------------------------------------
  // 5. Validate
  // -----------------------------------------------

  validateSentenceUnits(units);

  const suMs = Number((performance.now() - suTimerStart).toFixed(2));

  console.table({
    sentenceUnitReconstructionMs: suMs,
    inputSubtitleCount: subtitles.length,
    outputSentenceUnitCount: units.length
  });

  return units;
}


// ==================================================
// Fragment Builder
// ==================================================

function buildFragments(
  subtitles
) {

  const fragments = [];

  let fragmentId = 0;

  for (const subtitle of subtitles) {

    const text =
      subtitle.text;

    // ---------------------------------------------
    // Split at explicit sentence punctuation
    // ---------------------------------------------

    const parts =
      splitBySentencePunctuation(text);

    for (const part of parts) {

      if (!part.text.trim()) {
        continue;
      }

      fragments.push({

        fragmentId:
          fragmentId++,

        subtitleId:
          subtitle.sentenceId,

        start:
          subtitle.start,

        end:
          subtitle.start +
          subtitle.duration,

        text:
          part.text.trim()

      });
    }
  }

  return fragments;
}


// ==================================================
// Explicit punctuation splitter
// ==================================================

function splitBySentencePunctuation(
  text
) {

  const parts = [];

  let cursor = 0;

  for (
    let i = 0;
    i < text.length;
    i++
  ) {

    const char =
      text[i];

    if (
      char !== "." &&
      char !== "?" &&
      char !== "!"
    ) {
      continue;
    }

    const end =
      i + 1;

    const part =
      text.slice(
        cursor,
        end
      );

    parts.push({

      text:
        part,

      explicitBoundary:
        true

    });

    cursor =
      end;
  }

  // Remaining text
  if (
    cursor <
    text.length
  ) {

    parts.push({

      text:
        text.slice(cursor),

      explicitBoundary:
        false

    });
  }

  return parts;
}


// ==================================================
// Sentence Unit Builder
// ==================================================

function buildSentenceUnits(
  fragments,
  boundaries
) {

  const boundarySet =
    new Set(boundaries);

  const units = [];

  let currentFragments = [];

  let unitId = 0;


  for (const fragment of fragments) {

    currentFragments.push(
      fragment
    );


    // ---------------------------------------------
    // Sentence boundary
    // ---------------------------------------------

    if (
      boundarySet.has(
        fragment.fragmentId
      )
    ) {

      units.push(
        createSentenceUnit(
          unitId++,
          currentFragments
        )
      );

      currentFragments = [];
    }
  }


  // ---------------------------------------------
  // Remaining fragments
  // ---------------------------------------------

  if (
    currentFragments.length > 0
  ) {

    units.push(
      createSentenceUnit(
        unitId++,
        currentFragments
      )
    );
  }


  return units;
}


// ==================================================
// Create one Sentence Unit
// ==================================================

function createSentenceUnit(
  unitId,
  fragments
) {

  const subtitleIds =
    [
      ...new Set(
        fragments.map(
          fragment =>
            fragment.subtitleId
        )
      )
    ];


  const start =
    Math.min(
      ...fragments.map(
        fragment =>
          fragment.start
      )
    );


  const end =
    Math.max(
      ...fragments.map(
        fragment =>
          fragment.end
      )
    );


  const text =
    fragments
      .map(
        fragment =>
          fragment.text
      )
      .join(" ")
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  return {
    unitId,

    sourceStart: start,
    sourceEnd: end,

    subtitleIds,

    text
  };
}

function buildTextFromFragments(
  fragments
) {

  return fragments
    .map(
      fragment =>
        fragment.text
    )
    .join(" ")
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function reconcileMissingSubtitleIds(
  units,
  fragments
) {

  const coveredSubtitleIds =
    new Set(
      units.flatMap(
        unit =>
          unit.subtitleIds
      )
    );

  const missingSubtitleIds =
    [
      ...new Set(
        fragments
          .map(
            fragment =>
              fragment.subtitleId
          )
          .filter(
            subtitleId =>
              !coveredSubtitleIds.has(subtitleId)
          )
      )
    ];

  if (
    missingSubtitleIds.length === 0
  ) {
    return units;
  }

  const missingUnits =
    missingSubtitleIds.map(
      (subtitleId, index) =>
        createSentenceUnit(
          units.length + index,
          fragments.filter(
            fragment =>
              fragment.subtitleId === subtitleId
          )
        )
    );

  return [
    ...units,
    ...missingUnits
  ].sort(
    (a, b) =>
      a.sourceStart - b.sourceStart
  );
}

function enforceHardLengthConstraint(
  units,
  fragments
) {

  const nextUnits = [];

  for (const unit of units) {

    if (
      !unit.text ||
      unit.text.length <= SU_LENGTH_LIMIT
    ) {
      nextUnits.push(unit);
      continue;
    }

    const orderedFragments =
      fragments.filter(
        fragment =>
          unit.subtitleIds.includes(fragment.subtitleId)
      );

    if (
      orderedFragments.length === 0
    ) {
      nextUnits.push(unit);
      continue;
    }

    const subtitleGroups = [];

    for (const fragment of orderedFragments) {
      const lastGroup =
        subtitleGroups[subtitleGroups.length - 1];

      if (
        !lastGroup ||
        lastGroup.subtitleId !== fragment.subtitleId
      ) {
        subtitleGroups.push({
          subtitleId: fragment.subtitleId,
          fragments: [fragment]
        });
        continue;
      }

      lastGroup.fragments.push(fragment);
    }

    let currentFragments = [];

    for (const subtitleGroup of subtitleGroups) {
      const candidateFragments =
        currentFragments.concat(subtitleGroup.fragments);

      const candidateText =
        buildTextFromFragments(candidateFragments);

      if (
        candidateText.length <= SU_LENGTH_LIMIT
      ) {
        currentFragments = candidateFragments;
        continue;
      }

      if (
        currentFragments.length > 0
      ) {
        nextUnits.push(
          createSentenceUnit(
            nextUnits.length,
            currentFragments
          )
        );
        currentFragments = [];
      }

      const subtitleGroupText =
        buildTextFromFragments(subtitleGroup.fragments);

      if (
        subtitleGroupText.length <= SU_LENGTH_LIMIT
      ) {
        currentFragments = subtitleGroup.fragments;
      } else {
        nextUnits.push(
          createSentenceUnit(
            nextUnits.length,
            subtitleGroup.fragments
          )
        );
      }
    }

    if (
      currentFragments.length > 0
    ) {
      nextUnits.push(
        createSentenceUnit(
          nextUnits.length,
          currentFragments
        )
      );
    }
  }

  return nextUnits;
}


// ==================================================
// Overlap Resolver
// ==================================================

function resolveOverlaps(units) {

  if (units.length === 0) {
    return units;
  }

  // --------------------------------------------
  // First start
  // --------------------------------------------

  units[0].start =
    units[0].sourceStart;


  // --------------------------------------------
  // Calculate every boundary independently
  // --------------------------------------------

  const boundaries = [];

  for (
    let i = 0;
    i < units.length - 1;
    i++
  ) {

    const current =
      units[i];

    const next =
      units[i + 1];


    // No overlap
    if (
      current.sourceEnd <=
      next.sourceStart
    ) {

      boundaries.push(
        current.sourceEnd
      );

      continue;
    }


    // Overlap
    const overlapStart =
      Math.max(
        current.sourceStart,
        next.sourceStart
      );

    const overlapEnd =
      Math.min(
        current.sourceEnd,
        next.sourceEnd
      );


    const midpoint =
      (
        overlapStart +
        overlapEnd
      ) / 2;


    boundaries.push(
      midpoint
    );
  }


  // --------------------------------------------
  // Apply boundaries
  // --------------------------------------------

  for (
    let i = 0;
    i < units.length - 1;
    i++
  ) {

    units[i].end =
      boundaries[i];

    units[i + 1].start =
      boundaries[i];
  }


  // Last unit
  units[
    units.length - 1
  ].end =
    units[
      units.length - 1
    ].sourceEnd;


  return units;
}


// ==================================================
// Validation
// ==================================================

function validateSentenceUnits(
  units
) {

  for (
    let i = 0;
    i < units.length - 1;
    i++
  ) {

    const current =
      units[i];

    const next =
      units[i + 1];


    // Time validation
    if (
      current.end >
      next.start
    ) {

      console.warn(
        "Unresolved SU overlap:",
        current.unitId,
        next.unitId
      );
    }


    // Empty text validation
    if (
      !current.text ||
      current.text.length === 0
    ) {

      console.warn(
        "Empty SU:",
        current.unitId
      );
    }

    if (
      current.text &&
      current.text.length > SU_LENGTH_LIMIT
    ) {
      console.warn(
        "Oversized SU still exceeds hard limit:",
        current.unitId,
        current.text.length,
        current.subtitleIds
      );
    }
  }
}