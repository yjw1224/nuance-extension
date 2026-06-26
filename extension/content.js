const font = new FontFace(
  "Pretendard",
  `url(${chrome.runtime.getURL("fonts/Pretendard-Regular.woff2")})`
);

async function loadSubtitles() {

  const url =
    chrome.runtime.getURL(
      "output/translation.json"
    );
    console.log(url)

  const response =
    await fetch(url);

  return response.json();
}

const box =
  document.createElement("div");

box.className =
  "nuance-subtitle";

document.body.append(box);

let subtitles = [];

loadSubtitles()
  .then(data => {

    subtitles = data;

    console.log(
      "Nuance subtitles loaded:",
      subtitles.length
    );

  });

setInterval(() => {

  const video =
    document.querySelector("video");

  if (
    !video ||
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

chrome.runtime.onMessage.addListener(

  message => {

    if (
      message.type !==
      "NUANCE_SUBTITLE_JSON"
    ) {
      return;
    }

    console.log(
      "SUBTITLE JSON RECEIVED"
    );

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

  }

);

// sentenceRebuilder.js

function rebuildSentences(lines) {

  const sentences = [];

  let buffer = "";
  let subtitleIds = [];
  let sentenceId = 0;

  const endRegex = /[.?!]$/;

  for (const line of lines) {

    const cleaned = line.text.trim();

    if (!cleaned) continue;

    subtitleIds.push(line.id);

    if (buffer) {
      buffer += " " + cleaned;
    } else {
      buffer = cleaned;
    }

    if (endRegex.test(cleaned)) {
      sentences.push({
        sentenceId,
        text: buffer,
        subtitleIds
      });

      sentenceId++;
      buffer = "";
      subtitleIds = [];
    }
  }

  if (buffer) {
    sentences.push({
      sentenceId,
      text: buffer,
      subtitleIds
    });
  }

  return sentences;
}