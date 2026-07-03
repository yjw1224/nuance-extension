export function preprocessSubtitles(
  subtitles
) {

  return subtitles.filter(
    subtitle => {

      const text =
        subtitle.text.trim();

      // 빈 문자열 제거
      if (!text) {
        return false;
      }

      // 문자 또는 숫자가 하나도 없으면 제거
      return /[\p{L}\p{N}]/u.test(
        text
      );

    }
  );

}