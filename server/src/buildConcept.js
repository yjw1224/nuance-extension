import {openai} from './openai.js';

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

export async function buildConcepts(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return [];
  }

  const segmentsInput = segments
    .map(segment =>
      JSON.stringify({
        id: segment.id,
        role: segment.role,
        text: segment.text
      })
    )
    .join("\n");

  const prompt = `
Assign one dominant concept to each Segment.

A Concept is the main subject being explained in the Segment.
It is not simply a word or concept that appears in the text.

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

Rules:

- Return at most one concept per Segment.
- Prefer the specific concept actually discussed.
- Do not choose examples or supporting concepts.
- Do not choose a concept merely because it is mentioned.
- Return null if there is no clear explanatory target.
- Use a concise noun or noun phrase.
- Keep the concept in the language used by the Segment.
- Do not invent concepts not supported by the text.

Input:
${segmentsInput}
`;

  const response = await openai.responses.parse({
    model: process.env.OPENAI_LEARNING_MODEL,

    temperature: 0,

    text: {
      format: {
        type: "json_schema",

        name: "segment_concepts",

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
                  id: {
                    type: "string"
                  },

                  concept: {
                    type: [
                      "string",
                      "null"
                    ]
                  }
                },

                required: [
                  "id",
                  "concept"
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

    input: prompt
  });

  const concepts =
    response.output_parsed.segments;

  const conceptMap =
    new Map(
      concepts.map(item => [
        item.id,
        item.concept
      ])
    );

  return segments.map(segment => ({
    ...segment,
    concept:
      conceptMap.get(segment.id) ?? null
  }));
}