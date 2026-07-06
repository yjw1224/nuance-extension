import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { generateContext } from "./src/context.js";
import { translateTranscript } from "./src/translator.js";
import { saveBenchmark }
  from "./src/benchmark.js";
import {
  preprocessSubtitles
}
from "./src/subtitlePreprocessor.js";
import {
  generateLearningTimeline
}
from "./src/learningTimeline.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json({
  limit: "10mb"
}));

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

    const filteredSubtitles =
      preprocessSubtitles(
        sentenceSubtitles
      );

    const t0 = Date.now();

    const {
      context,
      usage: contextUsage
    } =
    await generateContext(
      title,
      filteredSubtitles
    );

    const contextMs =
      Date.now() - t0;

    console.log(
      "Context:",
      contextMs
    );

    // ------------------------------
    // Translation + Learning Timeline
    // ------------------------------

    const t1 = Date.now();

    // const translationPromise =
    //   translateTranscript(
    //     filteredSubtitles,
    //     context,
    //     chunk => {

    //       res.write(
    //         JSON.stringify({
    //           type: "translation",
    //           ...chunk
    //         }) + "\n\n"
    //       );

    //     }
    //   );

    let learningPromise = null;

    const learningEnabled = true;

    if (learningEnabled) {

      learningPromise =
        generateLearningTimeline(
          filteredSubtitles
        );

    }

    // const {

    //   translation,

    //   usage:
    //     translationUsage,

    //   chunkCount,

    //   ttfs,

    //   retryCount

    // } =
    // await translationPromise;

    const translationMs =
      Date.now() - t1;

    console.log(
      "Translation:",
      translationMs
    );

    let timeline = [];

    let learningUsage = {

      input_tokens: 0,

      output_tokens: 0

    };

    let learningMs = 0;

    if (learningPromise) {

      const t2 = Date.now();

      const learning =
        await learningPromise;

      learningMs =
        Date.now() - t2;

      timeline =
        learning.timeline;

      learningUsage =
        learning.usage;

      res.write(
        JSON.stringify({

          type: "timeline",

          timeline

        }) + "\n\n"
      );

      console.log(
        "Learning:",
        learningMs
      );

      console.log(
        "\n=== LEARNING TIMELINE ===\n"
      );

      console.log(
        JSON.stringify(
          timeline,
          null,
          2
        )
      );

    }

    const totalMs = contextMs + translationMs + learningMs;

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

    const totalTokens = contextUsage.input_tokens + contextUsage.output_tokens
    // + translationUsage.inputTokens + translationUsage.outputTokens
    + learningUsage.input_tokens + learningUsage.output_tokens;
    const videoType = "Edu";

    const conceptCount =
      timeline.length;

    const averageInvestmentScore =
      conceptCount === 0
        ? 0
        : (
            timeline.reduce(
              (sum, concept) =>
                sum +
                concept.investmentScore,
              0
            ) / conceptCount
          ).toFixed(2);

    const highestInvestmentScore =
      conceptCount === 0
        ? 0
        : Math.max(
            ...timeline.map(
              concept =>
                concept.investmentScore
            )
          );

    const conceptDensity =
      durationSec === 0
        ? 0
        : (
            conceptCount /
            (durationSec / 60)
          ).toFixed(2);

    const averageSegmentLength =
      conceptCount === 0
        ? 0
        : (
            timeline.reduce(
              (sum, concept) =>
                sum +
                (
                  concept.endSentenceId -
                  concept.startSentenceId +
                  1
                ),
              0
            ) / conceptCount
          ).toFixed(2);

    // saveBenchmark({

    //   // ===== Video =====

    //   videoType,

    //   videoId,

    //   durationSec,

    //   rawSubtitleCount:
    //     sentenceSubtitles.length,

    //   processedSubtitleCount:
    //     filteredSubtitles.length,

    //   chunkCount,

    //   // ===== Model =====

    //   contextModel:
    //     process.env.OPENAI_CONTEXT_MODEL,

    //   translationModel:
    //     process.env.OPENAI_MODEL,

    //   learningModel:
    //     process.env.OPENAI_LEARNING_MODEL,

    //   // ===== Token =====

    //   contextInputTokens:
    //     contextUsage.input_tokens,

    //   contextOutputTokens:
    //     contextUsage.output_tokens,

    //   translationInputTokens:
    //     translationUsage.inputTokens,

    //   translationOutputTokens:
    //     translationUsage.outputTokens,

    //   learningTimelineInputTokens:
    //     learningUsage.input_tokens,

    //   learningTimelineOutputTokens:
    //     learningUsage.output_tokens,

    //   totalTokens,

    //   // ===== Performance =====

    //   contextMs,

    //   translationMs,

    //   ttfs,

    //   learningMs,

    //   totalMs,

    //   // ===== Learning Timeline =====

    //   conceptCount,

    //   averageInvestmentScore,

    //   highestInvestmentScore,

    //   conceptDensity,

    //   averageSegmentLength,

    //   // ===== Reliability =====

    //   retryCount

    // });

    console.table({

      contextModel:
        process.env.OPENAI_CONTEXT_MODEL,

      translationModel:
        process.env.OPENAI_MODEL,

      learningModel:
        process.env.OPENAI_LEARNING_MODEL,

      contextMs,

      // translationMs,

      // ttfs,

      learningMs,

      totalMs,

      // retryCount,

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