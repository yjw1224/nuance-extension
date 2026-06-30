import { openai } from "./openai.js";
import { translateInto } from "./language.js";

function chunkArray(
  array,
  chunkSize = 12
) {

  const chunks = [];

  // 첫 청크는 8문장
  chunks.push(
    array.slice(0, 8)
  );

  for (
    let i = 8;
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

        sentence => [

          sentence.sentenceId,

          sentence.text

        ]
      ),

      null,

      2

    );

  const response =
    await openai.responses.create({

      model: process.env.OPENAI_MODEL,

      temperature: 0,

      input: `
You are a professional subtitle translator.

Translate each subtitle into natural ${translateInto}.

Use the Translation Context Memory as the highest-priority reference for terminology, style, and disambiguation.

Rules:
- Preserve the original meaning and tone.
- Adjacent subtitles may belong to the same sentence. Use neighboring subtitles only to understand context.
- Return exactly one output entry for every input subtitle.
- Keep the original sentenceId for every subtitle.
- Do not merge, split, omit, or reorder subtitles.
- Translate only the text field.
- Keep proper nouns when appropriate.
- If a subtitle is incomplete, use neighboring subtitles only to understand the context, but translate only the available text.
- Do not invent information beyond the provided subtitles and Translation Context Memory.

Translation Context Memory:
${context}

Input:
${transcriptText}

Return only a JSON array in the same order and structure as the input:

[
  [0, "..."]
]`
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
      translated.map(([sentenceId, translatedText]) => [
        Number(sentenceId),
        translatedText
      ])
    );

  // 번호 누락 에러!
  for (const sentence of transcript) {

    if (!translatedMap.has(sentence.sentenceId)) {

      console.log(
        `Retry sentenceId ${sentence.sentenceId}`
      );

      let success = false;

      for (
        let i = 0;
        i < 2;
        i++
      ) {

        try {

          const retry =
            await translateOneSubtitle(
              sentence,
              context
            );

          translatedMap.set(
            Number(retry.sentenceId),
            retry.translatedText
          );

          success = true;

          break;

        }

        catch (error) {

          console.log(
            `Retry ${i + 1} failed`
          );
          console.error(error)

        }

      }

      if (!success) {

        throw new Error(
          `Retry failed for sentenceId ${sentence.sentenceId}`
        );

      }

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

async function translateOneSubtitle(
  sentence,
  context
) {
  if (!sentence.text.trim()) {
    return {
      sentenceId: sentence.sentenceId,
      translatedText: ""
    };
  }

  const response =
    await openai.responses.create({

      model: process.env.OPENAI_MODEL,

      temperature: 0,

      input: `
You are a professional subtitle translator.

Translate this subtitle into natural ${translateInto}.

Use the Translation Context Memory.

Return ONLY JSON.

[
  ${sentence.sentenceId},
  "..."
]

Translation Context Memory:

${context}

Subtitle:

${JSON.stringify({
  sentenceId: sentence.sentenceId,
  text: sentence.text
})}
`

    });

    

  try {
    const translated =
      JSON.parse(response.output_text);

    if (
      !Array.isArray(translated) ||
      translated.length !== 2 ||
      typeof translated[0] !== "number" ||
      typeof translated[1] !== "string"
    ) {
      throw new Error("Invalid translation format");
    }

    const [sentenceId, translatedText] =
      translated;

    return {
      sentenceId,
      translatedText
    };
  }
  catch(error){

      console.log("\n=== RETRY INPUT ===");
      console.log(sentence);

      console.log("\n=== RETRY OUTPUT ===");
      console.log(response.output_text);

      throw error;

  }

}

export async function translateTranscript(
  transcriptSentence,
  context,
  onChunk = () => {}
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

  const promises =
    chunks.map(
      (chunk, index) =>
        translateChunk(
          chunk,
          context,
          index
        )
        .then(result => {
          onChunk(result);
          return result;
        })
    );

  const results =
    await Promise.all(
      promises
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