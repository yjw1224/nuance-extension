import { openai } from "./openai.js";
import { translateInto } from "./language.js";

function chunkArray(array, chunkSize = 10) {

  const chunks = [];

  for (
    let i = 0;
    i < array.length;
    i += chunkSize
  ) {
    chunks.push(
      array.slice(i, i + chunkSize)
    );
  }

  return chunks;
}

async function translateChunk(
  transcript,
  context,
  chunkIndex
) {

  const transcriptText =
    JSON.stringify(

      transcript.map(
        sentence => ({

          sentenceId:
            sentence.sentenceId,

          text:
            sentence.text

        })
      ),

      null,

      2

    );

  const response =
    await openai.responses.create({

      model: process.env.OPENAI_MODEL,

      input: `
You are a professional subtitle translator.

Use the Translation Context Memory below as the highest-priority reference.

Follow all terminology, style, disambiguation, and translation rules defined in the memory.

Requirements:

- Prioritize meaning over literal wording.
- Use natural and native-sounding ${translateInto}.
- Preserve intended meaning and tone.
- Maintain terminology consistency throughout the video.
- Adapt idioms and expressions naturally.
- Keep company names, product names, and proper nouns unchanged when appropriate.
- Translate every subtitle line.
- Preserve subtitle order.
- Do not omit information.
- Do not add explanations or notes.

IMPORTANT:

Return ONLY a valid JSON array.

Format:

[
  {
    "sentenceId": 0,
    "translatedText": "..."
  }
]

Rules:

- Return ONLY JSON.
- No markdown.
- No explanation.
- No extra text.
- Keep every sentenceId exactly.
- Return exactly one object per input subtitle.

Translation Context Memory:

${context}

Subtitles:

${transcriptText}
`
    });

  console.log(
    `\n=== CHUNK ${chunkIndex + 1} ===`
  );

  console.log(
    JSON.stringify(
      response.usage,
      null,
      2
    )
  );
  
  let translated;

  try {

    translated =
      JSON.parse(
        response.output_text
      );

  }

  catch (error) {

    console.log(
      "\n=== RAW GPT OUTPUT ===\n"
    );

    console.log(
      response.output_text
    );

    throw new Error(
      "Invalid JSON from GPT"
    );

  }

  const translatedMap =
  new Map(
    translated.map(
      item => [
        item.sentenceId,
        item.translatedText
      ]
    )
  );

  // 번호 누락 에러!
  for (const sentence of transcript) {

    if (
      !translatedMap.has(
        sentence.sentenceId
      )
    ) {
      throw new Error(
        `Missing translation for sentenceId ${sentence.sentenceId}`
      );
    }
  }

  if (
    translatedMap.size !==
    transcript.length
  ) {

    console.log(
      "\n=== INPUT ===\n"
    );

    console.log(
      transcript.map(
        t =>
          `[${t.sentenceId}] ${t.text}`
      )
    );

    console.log(
      "\n=== OUTPUT ===\n"
    );

    console.log(
      response.output_text
    );

    throw new Error(
      "Translation ID count mismatch"
    );
  }

  return {

    translation:

      transcript.map(
        sentence => ({

          sentenceId:
            sentence.sentenceId,

          start:
            sentence.start,

          duration:
            sentence.duration,

          subtitleIds:
            sentence.subtitleIds,

          text:
            translatedMap.get(
              sentence.sentenceId
            )

        })
      ),

    usage:
      response.usage

  };
}

export async function translateTranscript(
  transcriptSentence,
  context
) {

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const chunks =
    chunkArray(
      transcriptSentence,
      12
    );

  console.log(
    `\n총 ${chunks.length}개 청크로 분할`
  );

  console.log(
    chunks.map(
      chunk => chunk.length
    )
  );

  const results =
  await Promise.all(

    chunks.map(

      (chunk, index) =>

        translateChunk(
          chunk,
          context,
          index
        )

    )

  );

  for (const result of results) {

    totalInputTokens +=
      result.usage.input_tokens;

    totalOutputTokens +=
      result.usage.output_tokens;

  }

  const translation =
    results.flatMap(
      result =>
        result.translation
    );

  return {

    translation,

    usage: {

      inputTokens:
        totalInputTokens,

      outputTokens:
        totalOutputTokens

    },

    chunkCount:
      chunks.length

  };
}