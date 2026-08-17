import { openai } from "./openai.js";
import { translateInto } from "./language.js";

const CHUNK_SIZE = 8;

function chunkArray(array, chunkSize = CHUNK_SIZE) {
  const chunks = [];

  chunks.push(array.slice(0, 8));

  for (let i = 8; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

async function translateChunk(transcript, context, _chunkIndex, targetLanguage = translateInto) {
  let retryCount = 0;

  const transcriptText = JSON.stringify(
    transcript.map((sentence) => [sentence.sentenceId, sentence.text]),
    null,
    2
  );

  const response = await openai.responses.parse({
    model: process.env.OPENAI_TRANSLATION_MODEL,
    // temperature: 0,
    reasoning: { effort: "none" },
    
    text: {
      format: {
        type: "json_schema",
        name: "subtitle_translation",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            translations: {
              type: "array",
              minItems: transcript.length,
              maxItems: transcript.length,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  sentenceId: { type: "integer" },
                  translatedText: { type: "string" }
                },
                required: ["sentenceId", "translatedText"]
              }
            }
          },
          required: ["translations"]
        }
      }
    },
    input: `You are a professional subtitle translator.
Translate each subtitle into natural ${targetLanguage}.
Use the Translation Context Memory as the highest-priority reference for terminology, style, and disambiguation.

Rules:
- Preserve the original meaning and tone.
- Translate only the text field.
- Return exactly one translation for every input subtitle.
- Never omit, duplicate, merge, split, reorder, or invent subtitles.
- Preserve the original sentenceId and output order.
- Use neighboring subtitles only for context; translate only the current subtitle text.
- Keep proper nouns when appropriate.
- Do not invent information beyond the provided subtitles and Translation Context Memory.
- The number of output translations MUST exactly equal the number of input subtitles.

Translation Context Memory:
${context}

Input:
${transcriptText}
`
  });

  let translated;

  try {
    translated = response.output_parsed.translations;
  } catch (error) {
    throw new Error("Invalid structured output from GPT");
  }

  const inputIdSet = new Set(
    transcript.map((sentence) => Number(sentence.sentenceId))
  );

  const translatedMap = new Map();
  for (const item of translated) {
    const sentenceId = Number(item?.sentenceId);

    if (!Number.isInteger(sentenceId)) {
      continue;
    }

    if (!inputIdSet.has(sentenceId)) {
      continue;
    }

    if (translatedMap.has(sentenceId)) {
      continue;
    }

    translatedMap.set(sentenceId, String(item?.translatedText ?? ""));
  }

  for (const sentence of transcript) {
    if (!translatedMap.has(sentence.sentenceId)) {
      retryCount++;

      let success = false;

      for (let i = 0; i < 2; i++) {
        try {
          const retry = await translateOneSubtitle(sentence, context, targetLanguage);
          translatedMap.set(Number(sentence.sentenceId), retry.translatedText);
          success = true;
          break;
        } catch (error) {
          console.error(error);
        }
      }

      if (!success) {
        throw new Error(`Retry failed for sentenceId ${sentence.sentenceId}`);
      }
    }
  }

  const missingSentenceIds = transcript
    .map((sentence) => Number(sentence.sentenceId))
    .filter((sentenceId) => !translatedMap.has(sentenceId));

  if (missingSentenceIds.length > 0) {
    throw new Error("Translation ID count mismatch");
  }

  return {
    translation: transcript.map((sentence) => ({
      sentenceId: sentence.sentenceId,
      start: sentence.start,
      duration: sentence.duration,
      subtitleIds: sentence.subtitleIds,
      text: translatedMap.get(sentence.sentenceId)
    })),
    usage: response.usage,
    retryCount
  };
}

async function translateOneSubtitle(sentence, context, targetLanguage = translateInto) {
  if (!sentence.text.trim()) {
    return {
      sentenceId: sentence.sentenceId,
      translatedText: ""
    };
  }

  const response = await openai.responses.parse({
    model: process.env.OPENAI_MODEL,
    temperature: 0,
    text: {
      format: {
        type: "json_schema",
        name: "subtitle_translation",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            translations: {
              type: "array",
              minItems: 1,
              maxItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  sentenceId: { type: "integer" },
                  translatedText: { type: "string" }
                },
                required: ["sentenceId", "translatedText"]
              }
            }
          },
          required: ["translations"]
        }
      }
    },
    input: `
You are a professional subtitle translator.

Translate this subtitle into natural ${targetLanguage}.

Use the Translation Context Memory.

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
    const parsed = response.output_parsed;

    if (!parsed || !Array.isArray(parsed.translations) || parsed.translations.length !== 1) {
      throw new Error("Invalid translation format");
    }

    const { sentenceId, translatedText } = parsed.translations[0];

    return {
      sentenceId,
      translatedText
    };
  } catch (error) {
    throw error;
  }
}

export async function translateTranscript(
  transcriptSentence,
  context,
  onChunk = () => {},
  targetLanguage = translateInto
) {
  const start = Date.now();

  let ttfs = null;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalRetryCount = 0;

  const chunks = chunkArray(transcriptSentence, CHUNK_SIZE);

  const promises = chunks.map((chunk, index) =>
    translateChunk(chunk, context, index, targetLanguage).then((result) => {
      if (ttfs === null) {
        ttfs = Date.now() - start;
      }
      onChunk(result);
      return result;
    })
  );

  const results = await Promise.all(promises);

  for (const result of results) {
    totalInputTokens += result.usage.input_tokens;
    totalOutputTokens += result.usage.output_tokens;
    totalRetryCount += result.retryCount;
  }

  const translation = results.flatMap((result) => result.translation);

  return {
    translation,
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens
    },
    chunkCount: chunks.length,
    ttfs,
    retryCount: totalRetryCount
  };
}
