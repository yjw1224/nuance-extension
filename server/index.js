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

    console.log(
      "Context:",
      Date.now() - t0
    );

    const t1 = Date.now();
    const streamStart = Date.now();
    let firstChunk = true;

    const {

      translation,

      usage:
        translationUsage,

      chunkCount

    } =
      await translateTranscript(
        sentenceSubtitles,
        context,
        chunk => {
          if (firstChunk) {

            console.log(
              "Time To First Chunk:",
              Date.now() - streamStart
            );

            firstChunk = false;

          }
            res.write(
              JSON.stringify(chunk)
              + "\n\n"
            );
        }
      );

    console.log(
      "Translation:",
      Date.now() - t1
    );

    const totalMs =
        Date.now() -
        startTime;

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

      videoId,

      durationSec,

      subtitleCount:
        sentenceSubtitles.length,

      chunkCount,

      model:
        process.env.OPENAI_MODEL,

      contextInputTokens:
        contextUsage.input_tokens,

      contextOutputTokens:
        contextUsage.output_tokens,

      translationInputTokens:
        translationUsage.inputTokens,

      translationOutputTokens:
        translationUsage.outputTokens,

      totalTokens,

      totalMs

    });

    // res.json({
    //   translation
    // });

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