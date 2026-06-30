const script =
  document.createElement("script");

script.src =
  chrome.runtime.getURL("inject.js");

(document.head || document.documentElement)
  .appendChild(script);

script.onload =
  () => script.remove();

const font = new FontFace(
  "Pretendard",
  `url(${chrome.runtime.getURL("fonts/Pretendard-Regular.woff2")})`
);

const box =
  document.createElement("div");

box.className =
  "nuance-subtitle";

document.body.append(box);

let subtitles = [];

let translated = false;

let currentVideoId =
  new URLSearchParams(
    location.search
  ).get("v");

// 영상 변경 감지
setInterval(() => {

  const videoId =
    new URLSearchParams(
      location.search
    ).get("v");

  if (
    videoId &&
    videoId !== currentVideoId
  ) {

    currentVideoId = videoId;

    translated = false;

    subtitles = [];

    box.textContent = "";

    console.log(
      "Video changed:",
      videoId
    );

  }

}, 500);

// 자막 표시
setInterval(() => {

  const video =
    document.querySelector("video");

  if (
    !video ||
    !Array.isArray(subtitles) ||
    subtitles.length === 0
  ) {
    return;
  }

  const currentMs =
    Math.floor(
      video.currentTime * 1000
    );

  const currentSubtitle =
    subtitles.find(
      subtitle =>
        currentMs >=
          subtitle.start &&
        currentMs <
          subtitle.start +
          subtitle.duration
    );

  box.textContent =
    currentSubtitle?.text ?? "";

}, 100);

window.addEventListener("message", async event => {

    if (
      event.source !== window
    ) {
      return;
    }

    const message =
      event.data;

    if (
      message.type !==
      "NUANCE_SUBTITLE_JSON"
    ) {
      return;
    }

    if (translated) {
      return;
    }

    translated = true;

    console.count(
      "CONTENT MESSAGE"
    );

    console.log(
      "SUBTITLE JSON RECEIVED"
    );

    try {

      const rawSubtitles =
        message.subtitleJson.events

          .filter(
            event => event.segs
          )

          .map(
            (event, index) => ({

              id: index,

              start:
                event.tStartMs,

              duration:
                event.dDurationMs,

              text:
                event.segs
                  .map(
                    seg => seg.utf8
                  )
                  .join("")

            })
          );

      console.log(
        "\n=== RAW SUBTITLES ===\n"
      );

      console.log(
        rawSubtitles
      );

      const sentenceSubtitles =
        rebuildSentences(
          rawSubtitles
        );

      console.log(
        "\n=== SENTENCES ===\n"
      );

      console.log(
        sentenceSubtitles
      );

      const channel =
        document.querySelector(
          "#channel-name a"
        )?.textContent.trim();

      console.count(
        "POST TRANSLATE"
      );

      const response =
        await fetch(
          "https://opulent-space-trout-494466pg9x5cxwv-3000.app.github.dev/translate",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({

              videoId:
                new URLSearchParams(
                  window.location.search
                ).get("v"),

              title:
                document.title,

              channel,

              sentenceSubtitles

            })
          }
        );

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let buffer = "";

      while (true) {

        const {

          value,

          done

        } =
          await reader.read();

        if (done) {
          break;
        }

        buffer +=
          decoder.decode(
            value,
            {
              stream: true
            }
          );

        const messages =
          buffer.split("\n\n");

        buffer =
          messages.pop();

        for (const message of messages) {

          if (!message.trim()) {
            continue;
          }

          const chunk =
            JSON.parse(message);

          subtitles.push(
            ...chunk.translation
          );

          subtitles.sort(

            (a, b) =>

              a.sentenceId -
              b.sentenceId

          );

          console.log(
            "STREAM:",
            chunk
          );

        }

      }

      if (buffer.trim()) {

        const chunk =
          JSON.parse(buffer);

        subtitles.push(
          ...chunk.translation
        );

      }

      console.log(
        "Translated:",
        subtitles.length
      );

    }

    catch (error) {

      translated = false;

      console.error(
        "\n=== SERVER ERROR ===\n"
      );

      console.error(error);

    }

  });

// sentenceRebuilder.js

function rebuildSentences(lines) {

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