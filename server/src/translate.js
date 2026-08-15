export async function translateSentenceUnits({
  videoId,
  title,
  sentenceUnits,
  subtitles,
  sentenceSubtitles,
  targetLanguage = "ko"
}) {
  const sourceUnits =
    Array.isArray(sentenceUnits) && sentenceUnits.length > 0
      ? sentenceUnits
      : Array.isArray(sentenceSubtitles)
        ? sentenceSubtitles.map((item, index) => ({
            unitId: item.sentenceId ?? item.unitId ?? index,
            start: item.start ?? 0,
            end: item.end ?? (item.start ?? 0) + (item.duration ?? 0),
            subtitleIds: Array.isArray(item.subtitleIds) ? item.subtitleIds : [item.sentenceId ?? item.id ?? index],
            text: item.text ?? ""
          }))
        : Array.isArray(subtitles)
          ? subtitles.map((item, index) => ({
              unitId: item.sentenceId ?? item.unitId ?? index,
              start: item.start ?? 0,
              end: item.end ?? (item.start ?? 0) + (item.duration ?? 0),
              subtitleIds: Array.isArray(item.subtitleIds) ? item.subtitleIds : [item.sentenceId ?? item.id ?? index],
              text: item.text ?? ""
            }))
          : [];

  const translations = sourceUnits.map((unit) => ({
    sentenceId: unit.unitId ?? unit.sentenceId ?? 0,
    unitId: unit.unitId ?? unit.sentenceId ?? 0,
    start: unit.start ?? 0,
    end: unit.end ?? unit.start ?? 0,
    subtitleIds: unit.subtitleIds ?? [],
    text: unit.text ?? "",
    translatedText: unit.text ?? "",
    targetLanguage
  }));

  return {
    videoId,
    title,
    targetLanguage,
    translations
  };
}
