import {openai} from './openai.js';

export async function detectSegmentBoundaries(sentenceUnits) {
  if (!Array.isArray(sentenceUnits) || sentenceUnits.length < 2) {
    return [];
  }

  // LLM에는 필요한 정보만 전달한다.
  // unitId + text만 사용한다.
  const transcript = sentenceUnits
    .map(unit => `${unit.unitId}|${unit.text}`)
    .join("\n");

  const PROMPT = 
`
You segment an educational video into continuous explanatory units.

Each segment:

- contains consecutive Sentence Units
- has one dominant role
- represents one coherent explanatory unit

Roles:

- frame: sets context, a problem, goal, or question
- definition: defines a concept or subject
- explanation: explains principles, reasons, processes, or causal relationships
- elaboration: expands an explanation with examples, analogies, comparisons, details, or applications
- evidence: presents data, experiments, observations, results, or supporting evidence
- summary: summarizes previous material or gives a key takeaway

Role describes the dominant function of the entire segment, not individual sentences.

Create a boundary only when a new, independent explanatory unit clearly begins.

A boundary may be caused by:

1. Concept Shift
   The main subject changes to a new independent subject that remains the focus for at least 2 consecutive Sentence Units.

2. Functional Shift
   The dominant explanatory purpose changes substantially and remains the main purpose of a sustained portion of the explanation.

A role change alone is NOT sufficient.

3. Explicit Transition
   A clear discourse transition begins a new explanatory unit.

**Keep the definition, mechanism, intermediate steps, and consequences of the same concept or causal explanation in one segment when they form one coherent explanation.**

Do not create a boundary for:

- a brief concept mention
- an example, analogy, comparison, or supporting detail
- a temporary role change
- a new sentence
- a change in wording
- **an intermediate step within the same explanation or process**

A transition sentence must not form its own segment; attach it to the adjacent segment.

Prefer under-segmentation. When uncertain, keep the Sentence Units together.

Every Sentence Unit must belong to exactly one segment.

Return the endUnitId and dominant role of every segment, including the final segment.

Input:
${transcript}
`

  const response = await openai.responses.parse({
  model: process.env.OPENAI_LEARNING_MODEL,

  temperature: 0,

  text: {
    format: {
      type: "json_schema",

      name: "video_segments",

      strict: true,

      schema: {
        type: "object",

        additionalProperties: false,

        properties: {
          segments: {
            type: "array",

            items: {
              type: "object",

              additionalProperties: false,

              properties: {
                endUnitId: {
                  type: "integer"
                },

                role: {
                  type: "string",

                  enum: [
                    "frame",
                    "definition",
                    "explanation",
                    "elaboration",
                    "evidence",
                    "summary"
                  ]
                }
              },

              required: [
                "endUnitId",
                "role"
              ]
            }
          }
        },

        required: [
          "segments"
        ]
      }
    }
  },

  input: PROMPT
});

  const rawSegments =
  response.output_parsed.segments;

    const segments =
    deduplicateSegmentBoundaries(rawSegments);

    console.log(
    "Raw segments:",
    rawSegments
    );

    console.log(
    "Deduplicated segments:",
    segments
    );

    return segments;
}

function deduplicateSegmentBoundaries(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const sorted = [...segments]
    .sort((a, b) => a.endUnitId - b.endUnitId);

  const result = [];

  for (const current of sorted) {
    const previous = result[result.length - 1];

    if (!previous) {
      result.push(current);
      continue;
    }

    // 두 Boundary가 1 SU 이내에 있으면 하나로 통합
    if (current.endUnitId - previous.endUnitId <= 1) {
      // 현재는 앞쪽 Boundary를 유지
      continue;
    }

    result.push(current);
  }

  return result;
}