import { openai } from "./openai.js";

import { translateInto } from "./language.js";

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

  const response =
    await openai.responses.create({
      model: process.env.OPENAI_CONTEXT_MODEL,

      input:
`Create a Translation Context Memory for ${translateInto} subtitle translation.

Analyze the video title and transcript.

Return ONLY the template below.

TOPIC
Topic:
Domain:
Tone:

KEY TERMS (max 8)
- 
- 
- 

TERM DISAMBIGUATION (max 3)
Term:
Meaning:
Avoid:
Use:

Term:
Meaning:
Avoid:
Use:

TRANSLATION RULES
-
-
-

STYLE GUIDE
Ending:
Register:
Prefer:
Avoid:

Rules:

- Fill only with information supported by the title or transcript.
- Omit empty fields.
- Include only important terms and ambiguous words.
- Keep the entire output under 120 words.

Video Title:
${videoTitle}

Transcript:
${transcriptText}`
    });

  console.log(
    JSON.stringify(
      response.usage,
      null,
      2
    )
  );

  return {
    context: response.output_text,
    usage: response.usage
  };
}