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
box.style.display = "none";

const tooltip =
  document.createElement("div");

tooltip.className =
  "nuance-marker-tooltip";

tooltip.style.position = "fixed";

tooltip.style.zIndex = "999999";

tooltip.style.pointerEvents = "none";

tooltip.style.display = "none";

tooltip.style.display =
  "none";

tooltip.addEventListener(
  "click",
  e => {

    const row =
      e.target.closest(
        ".nuance-child"
      );

    if (!row) {
      return;
    }

    const video =
      document.querySelector(
        "video"
      );

    if (!video) {
      return;
    }

    video.currentTime =
      Number(
        row.dataset.start
      ) / 1000;

  }
);

document.body.append(
  tooltip
);

let subtitles = [];
let sentences = [];

// ============================
// Timeline Marker
// ============================

let timeline = [];
let markerContainer = null;

let hoveredItem = null;

let hoveredChildStart = null;

let hoveredSubtitle = null;

let hoveredEndSubtitle = null;

let tooltipUpdateInterval = null;



let translated = false;


let currentVideoId =
  new URLSearchParams(
    location.search
  ).get("v");

function clearMarkers() {

  if (markerContainer) {

    markerContainer.remove();

    markerContainer = null;

  }

}

function formatTime(seconds) {

  const m =
    Math.floor(seconds / 60);

  const s =
    String(
      seconds % 60
    ).padStart(2, "0");

  return `${m}:${s}`;

}

function scoreClass(score) {

  if (score >= 27)
    return "high";

  if (score >= 24)
    return "medium-high";

  if (score >= 20)
    return "medium";

  return "low";

}

function formatDuration(seconds) {

  const m =
    Math.floor(seconds / 60);

  const s =
    seconds % 60;

  if (m === 0) {
    return `${s}s`;
  }

  if (s === 0) {
    return `${m}m`;
  }

  return `${m}m ${s}s`;

}

function createRange(
  item,
  subtitle,
  endSubtitle,
  video
) {

  const startPercent =
    subtitle.start /
    (video.duration * 1000);

  const endPercent =
    (
      endSubtitle.start +
      endSubtitle.duration
    ) /
    (video.duration * 1000);

  const range =
    document.createElement("div");

  range.className =
    "nuance-range";

  range.classList.add(
    `nuance-range-${scoreClass(
      item.investmentScore
    )}`
  );

  range.style.left =
    `${startPercent * 100}%`;

  range.style.width =
    `${(endPercent - startPercent) * 100}%`;

  return range;

}

function createMarker(
  item,
  subtitle,
  endSubtitle,
  video
) {

  const startPercent =
    subtitle.start /
    (video.duration * 1000);

  const marker =
    document.createElement("div");

  marker.className =
    "nuance-marker";

  marker.classList.add(
    `nuance-marker-${scoreClass(
      item.investmentScore
    )}`
  );

  marker.style.left =
    `${startPercent * 100}%`;

  marker.addEventListener(
    "mouseenter",
    e => {

      showTooltip(
        e,
        item,
        subtitle,
        endSubtitle
      );

    }
  );

  marker.addEventListener(
    "mousemove",
    e => {

      updateTooltip();

      moveTooltip(e);

    }
  );

  marker.addEventListener(
    "mouseleave",
    hideTooltip
  );

  marker.onclick =
    () => {

      video.currentTime =
        subtitle.start / 1000;

    };

  return marker;

}

function showTooltip(
  e,
  item,
  subtitle,
  endSubtitle
) {
  hoveredItem = item;

  hoveredSubtitle = subtitle;

  hoveredEndSubtitle = endSubtitle;

  clearInterval(
    tooltipUpdateInterval
  );

  updateTooltip();

  tooltipUpdateInterval =
    setInterval(
      updateTooltip,
      300
    );

  tooltip.style.display = "block";

  tooltip.style.opacity = "1";

  moveTooltip(e);
}

function updateTooltip() {

  if (
    !hoveredItem ||
    !hoveredSubtitle ||
    !hoveredEndSubtitle
  ) {
    return;
  }

  const video =
    document.querySelector("video");

  if (!video) {
    return;
  }

  const currentMs =
  video.currentTime * 1000;

  const activeChild =
    hoveredItem.children?.find(
      child => {

        const start =
          sentences.find(
            s =>
              s.sentenceId ===
              child.startSentenceId
          );

        const end =
          sentences.find(
            s =>
              s.sentenceId ===
              child.endSentenceId
          );

        if (
          !start ||
          !end
        ) {
          return false;
        }

        return (
          currentMs >=
            start.start &&
          currentMs <
            end.start +
            end.duration
        );

      }
    );

  const startTime =
    formatTime(
      Math.floor(
        hoveredSubtitle.start / 1000
      )
    );

  const duration =
    formatDuration(

      Math.floor(

        (
          hoveredEndSubtitle.start +
          hoveredEndSubtitle.duration -
          hoveredSubtitle.start
        ) / 1000

      )

    );

  const level =
    scoreClass(
      hoveredItem.investmentScore
    );

  const width =
    `${hoveredItem.investmentScore / 30 * 100}%`;

  const childHtml =
    (hoveredItem.children ?? [])

      .map(child => {

        const start =
          sentences.find(
            s =>
              s.sentenceId ===
              child.startSentenceId
          );

        const end =
          sentences.find(
            s =>
              s.sentenceId ===
              child.endSentenceId
          );

        if (
          !start ||
          !end
        ) {
          return "";
        }

        const active =

          currentMs >=
          start.start &&

          currentMs <
          end.start +
          end.duration;

        const hovered =
          hoveredChildStart ===
          start.start;

        return `

<div
  class="nuance-child
    ${active ? " nuance-child-active" : ""}
    ${hovered ? " nuance-child-hover" : ""}"
  data-start="${start.start}"
>

  <span class="nuance-child-icon">

    <span
        class="nuance-child-icon-inner
        ${active ? "nuance-child-icon-active" : ""}
        ${hovered && !active ? "nuance-child-icon-hover" : ""}">
    </span>

</span>

  <span class="nuance-child-label">

    ${child.displayName ?? child.concept}

  </span>

</div>

`;

      })

      .join("");

  document
  .querySelectorAll(
    ".nuance-child-dot"
  )
  .forEach(
    dot =>
      dot.classList.remove(
        "nuance-child-dot-active"
      )
  );

  if (activeChild) {

    const start =
      sentences.find(
        s =>
          s.sentenceId ===
          activeChild.startSentenceId
      );

    document
      .querySelector(
        `.nuance-child-dot[data-start="${start.start}"]`
      )
      ?.classList.add(
        "nuance-child-dot-active"
      );

  }

  tooltip.innerHTML = `

<div class="nuance-marker-title">

  ${hoveredItem.displayName ?? hoveredItem.concept}

</div>

${hoveredItem.displayName ? 
  `
  <div class="nuance-marker-original">
    ${hoveredItem.concept}
  </div>
  ` : ''
}

<div class="nuance-marker-time">

${startTime} · ${duration}

</div>

${hoveredItem.children.length > 0 ? `<div class="nuance-child-list">

${childHtml}

</div>` : ``}

<div
class="
nuance-tooltip-bar
nuance-tooltip-bar-${level}
"

style="width:${width}"

></div>

`;

}


function hideTooltip(){

    clearInterval(
        tooltipUpdateInterval
    );

    tooltip.style.display="none";

}

function moveTooltip(e){

    const margin = 12;

    const rect =
      tooltip.getBoundingClientRect();

    let left =
      e.clientX -
      rect.width / 2;

    let top =
      e.clientY -
      rect.height -
      14;

    left = Math.max(
      margin,
      Math.min(
        left,
        window.innerWidth -
        rect.width -
        margin
      )
    );

    if(top < margin){

        top =
          e.clientY + 16;

    }

    tooltip.style.left =
      `${left}px`;

    tooltip.style.top =
      `${top}px`;

}

function renderMarkers() {

  const video =
    document.querySelector("video");

  console.log(video?.duration);

  if (
    !video ||
    !video.duration ||
    timeline.length === 0
  ) {
    return;
  }

  const progressBar =
    document.querySelector(
      ".ytp-progress-bar-container"
    );

  if (!progressBar) {
    return;
  }

  clearMarkers();

  markerContainer =
    document.createElement("div");

  markerContainer.className =
    "nuance-marker-container";

  progressBar.appendChild(
    markerContainer
  );

  for (const item of timeline) {

    const subtitle =
      sentences.find(
        s => s.sentenceId === item.startSentenceId
      );

    const endSubtitle =
      sentences.find(
        s => s.sentenceId === item.endSentenceId
      );

    if (
      !subtitle ||
      !endSubtitle
    ) {
      continue;
    }

    const range =
      createRange(
        item,
        subtitle,
        endSubtitle,
        video
      );

    const marker =
      createMarker(
        item,
        subtitle,
        endSubtitle,
        video
      );

    markerContainer.append(
      marker, range
    );

    for (const child of item.children ?? []) {

      if (
          child.startSentenceId ===
          item.startSentenceId
      ) continue;

      const dot =
        createChildDot(
          item,
          child,
          video
        );

      if(dot){

          markerContainer.appendChild(
              dot
          );

      }

    }

  }

}

// children dot을 생성하는 함수.

function createChildDot(
  item,
  child,
  video
) {
  const subtitle =
    sentences.find(
      s =>
        s.sentenceId ===
        child.startSentenceId
    );

  if (!subtitle)
    return null;


  const parentStart =
    sentences.find(
      s =>
        s.sentenceId ===
        item.startSentenceId
    );

  const parentEnd =
    sentences.find(
      s =>
        s.sentenceId ===
        item.endSentenceId
    );

  const percent =
    subtitle.start /
    (video.duration * 1000);

  const dot =
    document.createElement("div");

  dot.className =
    "nuance-child-dot";

  dot.style.left =
    `${percent * 100}%`;

  dot.style.top = '50%';

  dot.dataset.start =
    subtitle.start;

  dot.title =
    child.concept;

  dot.addEventListener(
    "click",
    e => {

      e.stopPropagation();

      video.currentTime =
        subtitle.start / 1000;

    }
  );

  dot.addEventListener(
    "mouseenter",
    e => {

      hoveredItem = item;

      hoveredChildStart =
      subtitle.start;

      showTooltip(
        e,
        item,
        parentStart,
        parentEnd
      );

      const row =
        document.querySelector(
          `.nuance-child[data-start="${subtitle.start}"]`
        );

      row?.classList.add(
        "nuance-child-active"
      );

    }
  );

  dot.addEventListener(
    "mousemove",
    e => {

      updateTooltip();

      moveTooltip(e);

    }
  );

  dot.addEventListener(
    "mouseleave",
    () => {

      const row =
        document.querySelector(

          `.nuance-child[data-start="${subtitle.start}"]`

        );

      row?.classList.remove(
        "nuance-child-active"
      );

      hoveredChildStart = null;
      updateTooltip();
      hideTooltip();

    }
  );

  return dot;

}

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

    sentences = [];

    timeline = [];

    clearMarkers();

    box.textContent = "";

    box.style.display = "none";

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

  const text =
    currentSubtitle?.text ?? "";

  box.textContent = text;

  box.style.display =
    text ? "block" : "none";

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

      sentences = sentenceSubtitles;

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

          if (chunk.type === "translation") {

            subtitles.push(
              ...chunk.translation
            );

            subtitles.sort(
              (a, b) =>
                a.sentenceId -
                b.sentenceId
            );

          }

          else if (chunk.type === "timeline") {

            timeline =
              chunk.timeline;

            console.log(
              "Timeline:",
              timeline
            );

            renderMarkers();

          }

          console.log(
            "STREAM:",
            chunk
          );

        }

      }

      if (buffer.trim()) {

        const chunk =
          JSON.parse(buffer);

        if (chunk.type === "translation") {

          subtitles.push(
            ...chunk.translation
          );

          subtitles.sort(
            (a, b) =>
              a.sentenceId -
              b.sentenceId
          );

        }

        else if (chunk.type === "timeline") {

          timeline =
            chunk.timeline;

          console.log(
            "Timeline:",
            timeline
          );

          renderMarkers();

        }

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