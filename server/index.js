import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import inferenceRouter from "./routes/inference.js";
import { generateVideoKnowledge } from "./src/videoKnowledge.js";
import { reconstructSentenceUnits } from "./src/sentenceUnit.js";
import { translateSentenceUnits } from "./src/translate.js";
import { preprocessSubtitles } from './src/subtitlePreprocessor.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: "*"
}));

app.use(express.json({
  limit: "10mb"
}));

// ------------------------------
// RS-006 — Inference Engine
// ------------------------------

app.use("/inference", inferenceRouter);


// ------------------------------
// RS-007 — Video Knowledge Layer
// ------------------------------

app.post("/video/sentenceunit", async (req, res) => {

  try {
    const {
      videoId,
      title,
      subtitles,
      sentenceSubtitles,
      sentenceUnits
    } = req.body;

    const sourceSubtitles =
      Array.isArray(subtitles)
        ? subtitles
        : Array.isArray(sentenceSubtitles)
          ? sentenceSubtitles
          : [];

    const processed =
      Array.isArray(subtitles) || Array.isArray(sentenceSubtitles)
        ? preprocessSubtitles(sourceSubtitles)
        : [];

    const suTimerStart = performance.now();

    const outputSentenceUnits =
      Array.isArray(sentenceUnits) && sentenceUnits.length > 0
        ? sentenceUnits
        : await reconstructSentenceUnits(processed.length > 0 ? processed : sourceSubtitles);

    const timing = {
      sentenceUnitReconstructionMs: Number((performance.now() - suTimerStart).toFixed(2)),
      outputSentenceUnitCount: Array.isArray(outputSentenceUnits) ? outputSentenceUnits.length : 0
    };

    res.json({
      videoId,
      title,
      sentenceUnits: outputSentenceUnits,
      timing
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message
    });
  }

});

app.post("/video/translate", async (req, res) => {

  try {
    const {
      videoId,
      title,
      sentenceUnits,
      subtitles,
      sentenceSubtitles,
      sourceLanguage = "ko",
      targetLanguage = "ko"
    } = req.body;

    const result = await translateSentenceUnits({
      videoId,
      title,
      sentenceUnits,
      subtitles,
      sentenceSubtitles,
      sourceLanguage,
      targetLanguage
    });

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message
    });
  }

});

app.post("/video/knowledge", async (req, res) => {

  try {

    const {
      videoId,
      title,
      sentenceSubtitles,
      sentenceUnits,
      subtitles
    } = req.body;

    const sourceSubtitles =
      Array.isArray(sentenceSubtitles)
        ? sentenceSubtitles
        : Array.isArray(subtitles)
          ? subtitles
          : [];

    const sourceSentenceUnits =
      Array.isArray(sentenceUnits) && sentenceUnits.length > 0
        ? sentenceUnits
        : await reconstructSentenceUnits(
            sourceSubtitles.length > 0
              ? preprocessSubtitles(sourceSubtitles)
              : sourceSubtitles
          );

    const knowledge =
      await generateVideoKnowledge({
        videoId,
        title,
        subtitles: sourceSubtitles,
        sentenceUnits: sourceSentenceUnits
      });

    res.json(knowledge);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: error.message
    });

  }

});


const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {});