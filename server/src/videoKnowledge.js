import { reconstructSentenceUnits } from './sentenceUnit.js';
import {
  detectSegmentBoundaries
} from "./segmentBoundary.js";
import {
  buildSegments
} from "./segmentBuilder.js";
import {
  buildConcepts
} from "./buildConcept.js";

export async function generateVideoKnowledge({
  videoId,
  title,
  subtitles
}) {
  // Construct Sentence Units
    let t0 = Date.now();
    const sentenceUnits = await reconstructSentenceUnits(subtitles);

    const suMs =
      Date.now() - t0;

    console.log("sentence units: ", sentenceUnits);

  // Detect boundaries with role

  t0 = Date.now();
  const segmentBoundaries = await detectSegmentBoundaries(sentenceUnits);

  const dbMs = Date.now() - t0;

  console.log("segment boundaries: ", segmentBoundaries);

  // Construct segments and roles

  const rawSegments = buildSegments(sentenceUnits, segmentBoundaries);

  // Build concepts

  t0 = Date.now();
  const segments = await buildConcepts(rawSegments);

  const cMs = Date.now() - t0;
  
  console.log("segments: ", segments);

  console.table({
    sentenceUnitMs: suMs,
    segmentMs: dbMs + cMs,
    segmentBoundaryMs: dbMs,
    segmentConceptMs: cMs,
  });

//   return {
//     videoId,
//     segments,
//     concepts
//   };
}