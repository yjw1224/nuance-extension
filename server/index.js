import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { generateContext } from "./src/context.js";
import { translateTranscript } from "./src/translator.js";
import { saveBenchmark }
  from "./src/benchmark.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json());

app.post("/translate", async (req, res) => {

  const startTime =
    Date.now();

  res.setHeader(
    "Content-Type",
    "text/plain; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  try {

    const {

      videoId,

      title,

      sentenceSubtitles

    } = req.body;

    const t0 = Date.now();

    const {

      context,

      usage:
        contextUsage

    } =
      await generateContext(
        title,
        sentenceSubtitles
      );
    
    const contextMs = Date.now() - t0;

    console.log(
      "Context:", contextMs
    );

    const t1 = Date.now();

    const {
      translation,
      usage:
        translationUsage,
      chunkCount,
      ttfs,
      retryCount
    } =
    await translateTranscript(
      sentenceSubtitles,
      context,
      chunk => {

        res.write(
          JSON.stringify(chunk)
          + "\n\n"
        );

      }
    );

    const translationMs = Date.now() - t1;

    console.log(
      "Translation:", translationMs
    );

    const totalMs = contextMs + translationMs;

    const durationSec =
    Math.floor(

      sentenceSubtitles.reduce(

        (max, subtitle) =>

          Math.max(
            max,
            subtitle.start +
            subtitle.duration
          ),

        0

      ) / 1000

    );

    const totalTokens = contextUsage.input_tokens + contextUsage.output_tokens + translationUsage.inputTokens + translationUsage.outputTokens;

    saveBenchmark({

      // ===== Video =====

      videoId,

      durationSec,

      subtitleCount:
        sentenceSubtitles.length,

      chunkCount,

      // ===== Model =====

      contextModel:
        process.env.OPENAI_CONTEXT_MODEL,

      translationModel:
        process.env.OPENAI_MODEL,

      // ===== Token =====

      contextInputTokens:
        contextUsage.input_tokens,

      contextOutputTokens:
        contextUsage.output_tokens,

      translationInputTokens:
        translationUsage.inputTokens,

      translationOutputTokens:
        translationUsage.outputTokens,

      totalTokens,

      // ===== Performance =====

      contextMs,

      translationMs,

      ttfs,

      totalMs,

      // ===== Reliability =====

      retryCount

    });

    console.table({

      contextModel:
        process.env.OPENAI_CONTEXT_MODEL,

      translationModel:
        process.env.OPENAI_MODEL,

      contextMs,

      translationMs,

      ttfs,

      totalMs,

      retryCount,

      totalTokens

    });

    res.end();

  }

  catch (error) {

    console.error(error);

    res.status(500).json({

      error:
        error.message

    });

  }

});

const PORT =
process.env.PORT || 3000;

app.listen(

PORT,

() => {

    console.log(
    `Nuance server running on port ${PORT}`
    );

}

);