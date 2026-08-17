import { translateTranscript } from "./translator.js";

function normalizeSentenceUnits(sentenceUnits, sentenceSubtitles, subtitles) {
  if (Array.isArray(sentenceUnits) && sentenceUnits.length > 0) {
    return sentenceUnits.map((unit, index) => ({
      unitId: unit.unitId ?? unit.sentenceId ?? index,
      sentenceId: unit.sentenceId ?? unit.unitId ?? index,
      start: unit.start ?? 0,
      end: unit.end ?? (unit.start ?? 0),
      subtitleIds: Array.isArray(unit.subtitleIds) ? unit.subtitleIds : [unit.unitId ?? unit.sentenceId ?? index],
      text: String(unit.text ?? "").trim()
    }));
  }

  const sourceList = Array.isArray(sentenceSubtitles)
    ? sentenceSubtitles
    : Array.isArray(subtitles)
      ? subtitles
      : [];

  return sourceList.map((item, index) => ({
    unitId: item.unitId ?? item.sentenceId ?? index,
    sentenceId: item.sentenceId ?? item.unitId ?? index,
    start: item.start ?? 0,
    end: item.end ?? ((item.start ?? 0) + (item.duration ?? 0)),
    subtitleIds: Array.isArray(item.subtitleIds) ? item.subtitleIds : [item.sentenceId ?? item.id ?? index],
    text: String(item.text ?? "").trim()
  }));
}

export async function translateSentenceUnits({
  videoId,
  title,
  sentenceUnits,
  subtitles,
  sentenceSubtitles,
  sourceLanguage = "ko",
  targetLanguage = "ko"
}) {
  const sourceUnits = normalizeSentenceUnits(sentenceUnits, sentenceSubtitles, subtitles);

  if (!Array.isArray(sourceUnits) || sourceUnits.length === 0) {
    return {
      videoId,
      title,
      sourceLanguage,
      targetLanguage,
      translations: []
    };
  }

  const transcript = sourceUnits.map((unit, index) => ({
    sentenceId: Number(unit.sentenceId ?? unit.unitId ?? index),
    start: Number(unit.start ?? 0),
    duration: Math.max(Number(unit.end ?? unit.start ?? 0) - Number(unit.start ?? 0), 0),
    subtitleIds: Array.isArray(unit.subtitleIds) ? unit.subtitleIds : [unit.unitId ?? unit.sentenceId ?? index],
    text: unit.text ?? ""
  }));

  const targetLabel = targetLanguage === "en" ? "English" : "Korean";

  const result = await translateTranscript(
    transcript,
    `Source language: ${sourceLanguage}. Target language: ${targetLabel}.`,
    () => {},
    targetLabel
  );

  const translatedMap = new Map(
    (result.translation ?? []).map((item) => [
      Number(item.sentenceId ?? item.unitId ?? 0),
      item.text ?? item.translatedText ?? ""
    ])
  );

  const translations = sourceUnits.map((unit, index) => {
    const sentenceId = Number(unit.sentenceId ?? unit.unitId ?? index);
    const translatedText = translatedMap.get(sentenceId) ?? unit.text ?? "";

    return {
      sentenceId,
      unitId: Number(unit.unitId ?? sentenceId),
      start: Number(unit.start ?? 0),
      end: Number(unit.end ?? unit.start ?? 0),
      subtitleIds: Array.isArray(unit.subtitleIds) ? unit.subtitleIds : [sentenceId],
      text: unit.text ?? "",
      translatedText,
      targetLanguage
    };
  });

  return {
    videoId,
    title,
    sourceLanguage,
    targetLanguage,
    translations
  };
}
