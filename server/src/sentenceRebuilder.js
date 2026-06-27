export function rebuildSentences(lines) {

  /*
  // \n 기준으로 subtitle 분리 + 시간 균등 분배
  const normalized = [];

  for (const line of lines) {

    const parts =
      line.text
        .split("\n")
        .map(text => text.trim())
        .filter(Boolean);

    const partDuration =
      Math.floor(
        line.duration /
        parts.length
      );

    parts.forEach(
      (part, index) => {

        normalized.push({

          id: line.id,

          start:
            line.start +
            partDuration * index,

          duration:
            index === parts.length - 1
              ? line.duration - partDuration * index
              : partDuration,

          text: part

        });

      }
    );

  }

  const sentences = [];

  let current = null;

  function shouldMerge(prev, next) {

    if (!prev || !next) {
      return false;
    }

    const prevText =
      prev.text.trim();

    const nextText =
      next.text.trim();

    // 이전 문장이 끝났으면 merge 안 함
    if (/[.?!]["')\]]?$/.test(prevText)) {
      return false;
    }

    // 이어지는 경우만 merge

    // 소문자 시작
    if (/^[a-z]/.test(nextText)) {
      return true;
    }

    // 숫자 시작
    if (/^[0-9]/.test(nextText)) {
      return true;
    }

    // 쉼표, 세미콜론
    if (/^[,;]/.test(nextText)) {
      return true;
    }

    // 닫는 괄호
    if (/^[)\]}]/.test(nextText)) {
      return true;
    }

    // 따옴표
    if (/^["']/.test(nextText)) {
      return true;
    }

    // 이어지는 접속사
    if (
      /^(and|or|but|because|which|who|whose|that|where|when|while|although|however|therefore|then|so)\b/i.test(
        nextText
      )
    ) {
      return true;
    }

    return false;

  }

  for (const line of normalized) {

    const text =
      line.text.trim();

    if (!text) {
      continue;
    }

    if (!current) {

      current = {

        sentenceId:
          sentences.length,

        subtitleIds: [
          line.id
        ],

        start:
          line.start,

        duration:
          line.duration,

        text

      };

      continue;

    }

    if (
      shouldMerge(
        current,
        line
      )
    ) {

      current.text +=
        " " + text;

      current.subtitleIds.push(
        line.id
      );

      // 문장 길이 갱신
      current.duration =
        (line.start + line.duration)
        - current.start;

    }

    else {

      current.subtitleIds =
        [...new Set(current.subtitleIds)];

      sentences.push(
        current
      );

      current = {

        sentenceId:
          sentences.length,

        subtitleIds: [
          line.id
        ],

        start:
          line.start,

        duration:
          line.duration,

        text

      };

    }

  }

  if (current) {

    current.subtitleIds =
      [...new Set(current.subtitleIds)];

    sentences.push(
      current
    );

  }
    */

  const sentences = lines.map(

    (subtitle, index) => ({

      sentenceId: index,

      start:
        subtitle.start,

      duration:
        subtitle.duration,

      subtitleIds: [
        subtitle.id
      ],

      text:
        subtitle.text

    })

  );

  return sentences;

}