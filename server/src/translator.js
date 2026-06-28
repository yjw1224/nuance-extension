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

      temperature: 0,

      input: `
      You are a professional subtitle translator.

Translate every subtitle into natural ${translateInto}.

Use the Translation Context Memory as the highest-priority reference for terminology, style and disambiguation.

Rules:

- Preserve meaning and tone.
- Do not omit, merge or split subtitles.
- If a subtitle is incomplete, translate it as-is.
- Keep every sentenceId unchanged.
- Translate only the text.
- Keep proper nouns when appropriate.

Return ONLY this JSON array:

[
  {
    "sentenceId": 0,
    "translatedText": "..."
  }
]

The number of output objects MUST equal the number of input objects.
Every input sentenceId MUST appear exactly once.

Translation Context Memory:

${context}

Subtitles:

${transcriptText}`
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
    translated.map(item => [
      Number(item.sentenceId),
      item.translatedText
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

  const response =
    await openai.responses.create({

      model: process.env.OPENAI_MODEL,

      temperature: 0,

      input: `
You are a professional subtitle translator.

Translate this subtitle into natural ${translateInto}.

Use the Translation Context Memory.

Return ONLY JSON.

{
  "sentenceId": ${sentence.sentenceId},
  "translatedText": "..."
}

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

      return JSON.parse(response.output_text);

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