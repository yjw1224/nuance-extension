import express from "express";

import inferenceEngine from "../src/inference/engine/inferenceEngine.js";

const router = express.Router();

router.post("/", async (req, res) => {

    const observations = req.body

    console.log(observations);

    const eventsList = observations.map(o => o.type);

    const result = inferenceEngine.infer(eventsList);

    console.log(result);

    res.json(result);

    res.end();
});

export default router;