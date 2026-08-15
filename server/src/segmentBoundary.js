import { openai } from './openai.js';

const ROLE_GUIDANCE = {
  frame:
    "Find the subject or idea being introduced, framed, or questioned.",

  definition:
    "Find the concept or subject being defined.",

  explanation:
    "Find the main concept whose principles, reasons, process, or causal relations are explained.",

  elaboration:
    "Find the existing concept being expanded by examples, comparisons, details, or applications.",

  evidence:
    "Find the concept or claim that the evidence supports.",

  summary:
    "Find the main concept or idea being summarized."
};

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

A segment is a consecutive sequence of Sentence Units that expresses
one coherent explanatory unit with one dominant role.

Roles:
- frame: context, problem, goal, or question
- definition: concept definition
- explanation: principle, process, reason, or causal relationship
- elaboration: example, comparison, detail, or application
- evidence: data, observation, result, or supporting evidence
- summary: recap or key takeaway

Create a boundary only when the current explanatory unit has ended
and a new independent explanatory unit begins.

Create a boundary only for:
1. Concept Shift — the main subject changes to a new independent subject.
2. Functional Shift — the main explanatory purpose changes substantially.
3. Explicit Transition — a clear transition starts a new explanatory unit.

Do not create a boundary for a sentence change, wording change,
brief concept mention, example, supporting detail, or temporary role change.

Keep related definitions, mechanisms, steps, examples, and consequences
in the same segment when they form one coherent explanation.

When uncertain, do not split.

Every Sentence Unit must belong to exactly one segment.
Return the endUnitId and dominant role of every segment.

Role guidance:

frame:
${ROLE_GUIDANCE.frame}

definition:
${ROLE_GUIDANCE.definition}

explanation:
${ROLE_GUIDANCE.explanation}

elaboration:
${ROLE_GUIDANCE.elaboration}

evidence:
${ROLE_GUIDANCE.evidence}

summary:
${ROLE_GUIDANCE.summary}

Concept rules:

- Return at most one concept per segment.
- Prefer the specific knowledge target actually discussed.
- Do not choose examples or supporting concepts.
- Do not choose a concept merely because it is mentioned.
- Return null for both concept and displayName if there is no clear knowledge target.

- concept must be a concise noun or noun phrase that uniquely identifies
  the knowledge target.
- Prefer the shortest standard term that preserves the full identity
  and meaning of the knowledge target.
- Do NOT shorten a concept if doing so changes it into a broader,
  different, or less specific concept.
- Preserve established names of theories, philosophies, principles,
  methods, models, frameworks, mechanisms, and technical terms.
- A distinctive modifier is part of the concept when removing it
  changes the identity or meaning of the knowledge target.
- Prefer specificity over brevity when the two conflict.

- Do not replace a specific knowledge target with a broad topic that
  merely contains it.
- Do not generalize a concept to a broader category for the sake of
  making the name shorter.
- Do not combine multiple concepts into one concept name.
- Do not add explanatory context, purpose, consequence, or application
  to concept.

- displayName must identify the same knowledge target as concept.
- displayName may be more descriptive than concept so that it is understandable when shown alone in a Timeline UI.
- displayName must not introduce a broader or different knowledge target.
- Keep displayName concise; use only the context necessary for a learner to understand what the timeline item refers to.

- concept and displayName must use the language of the segment.
- Do not invent concepts or terminology not supported by the Sentence Units.

Return the endUnitId, dominant role, concept, and displayName of every segment, including the final segment.

Input:
${transcript}
`;

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
                },

                concept: {
                  type: [
                    "string",
                    "null"
                  ]
                },

                displayName: {
                  type: [
                    "string",
                    "null"
                  ]
                }
              },

              required: [
                "endUnitId",
                "role",
                "concept",
                "displayName"
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