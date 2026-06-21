// 타임프레임 정렬

export function alignTranslations(
  translations,
  rawSubtitles
) {

  return translations.map(
    translation => {

      const subtitles =
        translation.subtitleIds.map(
          id =>
            rawSubtitles.find(
              s => s.id === id
            )
        );

      const start =
        subtitles[0].start;

      const end =
        subtitles[
          subtitles.length - 1
        ].start +
        subtitles[
          subtitles.length - 1
        ].duration;

      return {
        sentenceId:
          translation.sentenceId,

        start,

        duration:
          end - start,

        subtitleIds:
          translation.subtitleIds,

        text:
          translation.translatedText
      };
    }
  );
}