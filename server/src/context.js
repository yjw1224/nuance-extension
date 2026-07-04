import { openai } from "./openai.js";

import { translateFrom, translateInto } from "./language.js";

export async function generateContext(
  videoTitle,
  transcriptSentence
) {
  /** 맨 앞 n문장만을 컨텍스트에 적용 */
  const CONTEXT_SUBTITLE_LIMIT = 50;

  const transcriptText =
    transcriptSentence
      .slice(0, CONTEXT_SUBTITLE_LIMIT)
      .map(sentence => sentence.text)
      .join("\n");

const response = await openai.responses.parse({
  model: process.env.OPENAI_CONTEXT_MODEL,

  text: {
    format: {
      type: "json_schema",
      name: "translation_context_memory",
      strict: true,

      schema: {
        type: "object",
        additionalProperties: false,

        properties: {

          summary: {
            type: "string"
          },

          terminology: {
            type: "array",
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                source: {
                  type: "string"
                },
                target: {
                  type: "string"
                },
                priority: {
                  type: "integer",
                  minimum: 1,
                  maximum: 3
                }
              },
              required: [
                "source",
                "target",
                "priority"
              ]
            }
          },

          ambiguousTerms: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                term: {
                  type: "string"
                },
                meaning: {
                  type: "string"
                }
              },
              required: [
                "term",
                "meaning"
              ]
            }
          },

          narration: {
            type: "string"
          }

        },

        required: [
          "summary",
          "terminology",
          "ambiguousTerms",
          "narration"
        ]
      }
    }
  },

  input: `
Extract translation memory for subtitle translation into ${translateInto}.

Return only information that will improve translation accuracy and consistency.

Rules:

- Summary: describe the video's topic in 1 sentences for translation context only.
- Terminology: extract up to 8 important source-language (${translateFrom}) terms that appear in the transcript. Provide the preferred ${translateInto} translation and assign a priority:
  1 = essential for translation consistency across the video,
  2 = important,
  3 = useful but optional.
- AmbiguousTerms: include only words that could reasonably be mistranslated in this video's context.
- Narration: describe the speaking style in a few words.

If information is unavailable, return "" or [].

Video Title:
${videoTitle}

Transcript:
${transcriptText}
`
});

  console.log(response.output_parsed);

  return {
    context: formatContext(response.output_parsed),
    usage: response.usage
  };
}

function formatContext(context) {

  const out = [];

  if (context.summary) {
    out.push(`Summary: ${context.summary}`);
  }

  if (context.terminology.length) {
    out.push(
      "Terminology:\n" +
      context.terminology
        .sort((a, b) => a.priority - b.priority)
        .map(x =>
          `P${x.priority}: ${x.source} → ${x.target}`
        )
        .join("\n")
    );
  }

  if (context.ambiguousTerms.length) {
    out.push(
      "Ambiguous:\n" +
      context.ambiguousTerms
        .map(x => `${x.term} = ${x.meaning}`)
        .join("\n")
    );
  }

  if (context.narration) {
    out.push(`Narration: ${context.narration}`);
  }

  return out.join("\n\n");

}