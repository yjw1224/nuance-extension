import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import inferenceRouter from "./routes/inference.js";
import { generateVideoKnowledge } from "./src/videoKnowledge.js";
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

app.post("/video/knowledge", async (req, res) => {

  try {

    const {
      videoId,
      title,
      sentenceSubtitles
    } = req.body;

    const processedSubtitles = preprocessSubtitles(sentenceSubtitles)

    console.log(processedSubtitles)

    // 달라진 점만 출력

    // const difference = processedSubtitles.filter((v, i) => v.text !== sentenceSubtitles[i].text);

    // console.log(difference);

    const knowledge =
      await generateVideoKnowledge({
        videoId,
        title,
        subtitles: sentenceSubtitles
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

app.listen(PORT, () => {

  console.log(
    `Nuance server running on port ${PORT}`
  );

});