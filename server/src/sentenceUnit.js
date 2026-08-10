import {openai} from './openai.js'


// ==================================================
// Main
// ==================================================

export async function reconstructSentenceUnits(
  subtitles
) {

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

  const SU_LENGTH_LIMIT = 100;

  const response =
    await openai.responses.parse({

      model:
        process.env.OPENAI_LEARNING_MODEL,

      temperature: 0,

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

1. Keep fragments together when they form one sentence or utterance.
2. Split when a complete sentence or independent utterance ends.
3. Use punctuation as the strongest boundary signal.
4. If punctuation is missing, infer boundaries from grammatical and linguistic completeness.
5. One fragment may contain multiple sentence units.
6. Multiple fragments may form one sentence unit.
7. Preserve the original text. Do not rewrite, summarize, or translate.
8. Do not merge unrelated utterances.
9. Do not merge non-speech captions such as [music], [applause], or [sound effect] into speech.
10. Prefer sentence units of ${SU_LENGTH_LIMIT} characters or fewer.
11. If a sentence exceeds ${SU_LENGTH_LIMIT} characters, split it at the nearest natural linguistic boundary without breaking a clause, phrase, or unfinished construction.
12. Never split solely at an arbitrary character position.

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
    buildSentenceUnits(
      fragments,
      boundaries
    );


  // -----------------------------------------------
  // 4. Resolve overlapping timeframes
  // -----------------------------------------------

  resolveOverlaps(units);


  // -----------------------------------------------
  // 5. Validate
  // -----------------------------------------------

  validateSentenceUnits(units);


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
  }
}