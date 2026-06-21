import { openai } from "./openai.js";
import { translateInto } from "../data/language.js";

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
    transcript
      .map(
        sentence =>
          `[${sentence.sentenceId}] ${sentence.text}`
      )
      .join("\n");

  const response =
    await openai.responses.create({

      model: "gpt-4.1-mini",

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

- Keep every ID exactly as provided.
- Output one translated line for each input line.
- Preserve all IDs.
- Do not remove IDs.
- Do not create new IDs.
- Do not merge IDs.
- Do not split IDs.

Example:

[0] Hello world.
[1] How are you?

↓

[0] 안녕하세요.
[1] 잘 지내시나요?

Translation Context Memory:

${context}

Subtitles:

${transcriptText}

Output only the translation.
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

  const translatedMap =
    new Map();

  const lines =
    response.output_text
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

  const idRegex =
    /^\[(\d+)\]\s*(.*)$/;

  for (const line of lines) {

    const match =
      line.match(idRegex);

    if (!match) continue;

    translatedMap.set(
      Number(match[1]),
      match[2]
    );
  }
  // console.log(
  //   "\n=== RAW GPT OUTPUT ===\n"
  // );

  // console.log(
  //   response.output_text
  // );

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

  return transcript.map(
    sentence => ({

      sentenceId:
        sentence.sentenceId,

      subtitleIds:
        sentence.subtitleIds,

      translatedText:
        translatedMap.get(
          sentence.sentenceId
        )
    })
  );
}

export async function translateTranscript(
  transcriptSentence,
  context
) {

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

  const translations =
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

  return translations.flat();
}