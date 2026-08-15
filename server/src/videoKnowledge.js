import { reconstructSentenceUnits } from './sentenceUnit.js';
import {
  detectSegmentBoundaries
} from "./segmentBoundary.js";
import {
  buildSegments
} from "./segmentBuilder.js";
import { inferConceptKnowledge } from "./conceptKnowledge.js";

export async function* generateVideoKnowledge({
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

    yield {
      type: "sentence_units",
      sentenceUnits
    };

  // Detect boundaries with role

  t0 = Date.now();
  const segmentBoundaries = await detectSegmentBoundaries(sentenceUnits);

  console.log("segment boundaries: ", segmentBoundaries);

  // Construct segments and roles

  const segments = buildSegments(sentenceUnits, segmentBoundaries);
  const sgMs = Date.now() - t0;

  console.log("final segments:\n", segments);

  // Construct concept relation knowledges

  t0 = Date.now();
  const conceptKnowledges = await inferConceptKnowledge(segments);
  const ckMs = Date.now() - t0;

  console.log("final concept knowledge:", JSON.stringify(conceptKnowledges, null, 2));
  
  console.table({
    sentenceUnitMs: suMs,
    segmentMs: sgMs,
    conceptKnowledgeMs: ckMs
  });

  // // Build Concepts

  // t0 = Date.now();
  // const segments = await buildConcepts(rawSegments);

  // const cMs = Date.now() - t0;
  
  // console.log("segments: ", segments);


  // console.table({
  //   sentenceUnitMs: suMs,
  //   segmentMs: dbMs + cMs,
  //   segmentBoundaryMs: dbMs,
  //   segmentConceptMs: cMs,
  // });

//   return {
//     videoId,
//     segments,
//     concepts
//   };
}