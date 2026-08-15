import { reconstructSentenceUnits } from './sentenceUnit.js';
import {
  detectSegmentBoundaries
} from "./segmentBoundary.js";
import {
  buildSegments
} from "./segmentBuilder.js";
import { inferConceptKnowledge } from "./conceptKnowledge.js";

export async function generateVideoKnowledge({
  videoId,
  title,
  subtitles,
  sentenceUnits
}) {
  let t0 = performance.now();

  const hasProvidedSentenceUnits = Array.isArray(sentenceUnits) && sentenceUnits.length > 0;

  const normalizedSentenceUnits =
    hasProvidedSentenceUnits
      ? sentenceUnits
      : Array.isArray(subtitles) && subtitles.length > 0
        ? await reconstructSentenceUnits(subtitles)
        : [];

  const suMs = Number((performance.now() - t0).toFixed(2));

  console.log("[videoKnowledge] normalizedSentenceUnits input length:", normalizedSentenceUnits.length);

  if (!Array.isArray(normalizedSentenceUnits) || normalizedSentenceUnits.length === 0) {
    console.warn("[videoKnowledge] No sentence units available.");
    return {
      videoId,
      title,
      sentenceUnits: [],
      segments: [],
      conceptKnowledge: []
    };
  }

  const preparedSentenceUnits = normalizedSentenceUnits.map((unit, index) => ({
    ...unit,
    unitId: unit.unitId ?? unit.sentenceId ?? index,
    start: unit.start ?? unit.sourceStart ?? 0,
    end: unit.end ?? unit.sourceEnd ?? unit.start ?? 0,
    subtitleIds: Array.isArray(unit.subtitleIds) ? unit.subtitleIds : [],
    text: unit.text ?? ""
  }));

  console.log("[videoKnowledge] Sentence Units:", JSON.stringify(preparedSentenceUnits, null, 2));

  t0 = performance.now();
  const segmentBoundaries = await detectSegmentBoundaries(preparedSentenceUnits);
  const boundaryMs = Number((performance.now() - t0).toFixed(2));

  console.log("[videoKnowledge] Segment boundaries:", JSON.stringify(segmentBoundaries, null, 2));

  t0 = performance.now();
  const segments = buildSegments(preparedSentenceUnits, segmentBoundaries);
  const segmentMs = Number((performance.now() - t0).toFixed(2));

  console.log("[videoKnowledge] Final segments:", JSON.stringify(segments, null, 2));

  t0 = performance.now();
  const conceptKnowledges = await inferConceptKnowledge(segments);
  const conceptMs = Number((performance.now() - t0).toFixed(2));

  console.log("[videoKnowledge] Concept knowledge:", JSON.stringify(conceptKnowledges, null, 2));

  console.table({
    sentenceUnitMs: suMs,
    segmentBoundaryMs: boundaryMs,
    segmentMs,
    conceptKnowledgeMs: conceptMs
  });

  return {
    videoId,
    title,
    sentenceUnits: preparedSentenceUnits,
    segments,
    conceptKnowledge: conceptKnowledges
  };
}