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

  try {

    const {

      videoId,

      title,

      sentenceSubtitles

    } = req.body;

    const {

      context,

      usage:
        contextUsage

    } =
      await generateContext(
        title,
        sentenceSubtitles
      );

    const {

      translation,

      usage:
        translationUsage,

      chunkCount

    } =
      await translateTranscript(
        sentenceSubtitles,
        context
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

    res.json({

      translation

    });

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