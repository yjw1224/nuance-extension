const SERVER_ADDRESS = "https://orange-cod-qgrr6659x4whrv6-3000.app.github.dev"

const script =
  document.createElement("script");

script.src =
  chrome.runtime.getURL("inject.js");

(document.head || document.documentElement)
  .appendChild(script);

script.onload =
  () => script.remove();

// -------------------------------------
// events
// -------------------------------------

// observation-buffer.js

class ObservationBuffer {
    constructor() {
        // Event Observation (중복 제거)
        this.events = [];

        // Derived Features
        this.features = {
            averagePauseDuration: 0,
            backwardRatio: 0,
        };

        // 내부 계산용
        this.pauseDurations = [];
        this.seekCount = 0;
        this.seekBackwardCount = 0;

        // debounce
        this.flushTimer = null;
    }

    /*
     * ===========================
     * Event
     * ===========================
     */

    addEvent(type, data = {}) {
        this.events.push({
            type,
            ts: Date.now(),
            ...data
        });

        console.log("[Observation]", name);

        this.scheduleFlush();
    }

    /*
     * ===========================
     * Feature
     * ===========================
     */

    addPauseDuration(duration) {
        this.pauseDurations.push(duration);

        const sum = this.pauseDurations.reduce((a, b) => a + b, 0);

        this.features.averagePauseDuration =
            Math.round(sum / this.pauseDurations.length);

        console.log(
            "[Feature] averagePauseDuration =",
            this.features.averagePauseDuration
        );
    }

    addBackwardRatio(isBackward) {
      this.seekCount++;

      if(isBackward) this.seekBackwardCount++;

      this.features.backwardRatio = this.seekBackwardCount / this.seekCount;

      console.log(
          "[Feature] backwardRatio =",
          this.features.backwardRatio
      );
    }

    /*
     * ===========================
     * Debounce
     * ===========================
     */

    scheduleFlush() {
        clearTimeout(this.flushTimer);

        this.flushTimer = setTimeout(() => {
            this.flush();
        }, 5000); // 5초 동안 조용하면 Flush
    }

    /*
     * ===========================
     * Flush
     * ===========================
     */

    async flush() {

        if (
            this.events.size === 0 &&
            this.pauseDurations.length === 0
        ) {
            return;
        }

        const payload = {
            events: [...this.events],
            features: {
                ...this.features
            }
        };

        console.log("========== FLUSH ==========");
        console.log(payload);

        // TODO
        // POST(payload)
        const result = await fetch(`${SERVER_ADDRESS}/inference`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(this.events)
        }).then((res) => {
          console.log(res.text());
        })

        // Event만 초기화
        this.events = [];
    }
}

const observationBuffer = new ObservationBuffer();

async function waitForVideo() {
  return new Promise((resolve) => {
      const interval = setInterval(() => {
          const video = document.querySelector("video");

          if (video) {
              clearInterval(interval);
              resolve(video);
          }
      }, 300);
  });
}

let isPause = false;
let pauseTime = 0;
function setupPlayPause(video) {
  video.addEventListener("pause", () => {
      pauseTime = Date.now();
      isPause = true;
  });

  video.addEventListener("play", () => {
      if(isPause) {
        observationBuffer.addPauseDuration(Date.now() - pauseTime);
      }
      isPause = false;
  });
}

let lastTime = 0;
function setupSeeking(video) {
  video.addEventListener("timeupdate", () => {
    const current = video.currentTime;

    if (Math.abs(current - lastTime) > 2) {
        // observationBuffer.addEvent("seek", {
        //   lastTime: lastTime,
        //   currenTime: video.currentTime
        // });

        if(current < lastTime) {
          observationBuffer.addEvent("seekBackward", {
            lastTime: lastTime,
            currenTime: video.currentTime
          });
          observationBuffer.addBackwardRatio(true);
        } else {
          observationBuffer.addBackwardRatio(false);
        }
      }

      lastTime = current;
  });
}

function setupPip(video) {
  video.addEventListener("enterpictureinpicture", () => {
      console.log({
          observation: "Enter PiP",
          timestamp: Date.now(),
          currentTime: video.currentTime,
      });
  });

  video.addEventListener("leavepictureinpicture", () => {
      console.log({
          observation: "Left PiP",
          timestamp: Date.now(),
          currentTime: video.currentTime,
      });
  });
}

(async () => {
    const video = await waitForVideo();

    console.log("Video Found!", video);

    setupPlayPause(video);
    setupSeeking(video);
    setupPip(video);
})();

let subtitles = [];
let sentences = [];
let sentenceUnits = [];

let translated = false;
let debugSentenceUnitsOnly = false;
let lastSentenceUnitTiming = {
  sentenceUnitReconstructionMs: 0,
  outputSentenceUnitCount: 0
};

function isWatchPage() {
  try {
    const url = new URL(window.location.href);
    return (
      url.pathname === "/watch" &&
      url.searchParams.has("v")
    );
  } catch (error) {
    return false;
  }
}

let currentVideoId =
  new URLSearchParams(
    location.search
  ).get("v");

const font = new FontFace(
  "Pretendard",
  `url(${chrome.runtime.getURL("fonts/Pretendard-Regular.woff2")})`
);

async function ensurePretendardFont() {
  try {
    if (!document.fonts?.has(font)) {
      document.fonts.add(font);
    }

    await font.load();
  } catch (error) {
    console.warn("Pretendard font load failed:", error);
  }
}

const box =
  document.createElement("div");

box.className =
  "nuance-subtitle";

box.setAttribute("aria-live", "polite");
document.body.append(box);

function renderSubtitleText(text) {
  if (!isWatchPage()) {
    box.textContent = "";
    box.style.display = "none";
    return;
  }

  if (!text || !String(text).trim()) {
    box.textContent = "";
    box.style.display = "none";
    return;
  }

  box.textContent = String(text).trim();
  box.style.display = "block";
}

function ensureDebugPanel() {
  if (document.getElementById("nuance-debug-panel")) {
    return;
  }

  const panel = document.createElement("div");
  panel.id = "nuance-debug-panel";
  panel.style.position = "fixed";
  panel.style.top = "16px";
  panel.style.right = "16px";
  panel.style.zIndex = "2147483647";
  panel.style.width = "220px";
  panel.style.padding = "10px 12px";
  panel.style.borderRadius = "10px";
  panel.style.background = "rgba(15, 23, 42, 0.9)";
  panel.style.border = "1px solid rgba(148, 163, 184, 0.5)";
  panel.style.boxShadow = "0 8px 18px rgba(0,0,0,0.28)";
  panel.style.color = "#f8fafc";
  panel.style.fontFamily = "Pretendard, sans-serif";
  panel.style.fontSize = "12px";
  panel.style.lineHeight = "1.5";

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap: 8px; margin-bottom: 6px;">
      <strong style="font-size: 12px;">Nuance Debug</strong>
      <button id="nuance-debug-toggle" style="border:none; border-radius:999px; padding:5px 10px; background:#38bdf8; color:#082f49; font-weight:700; cursor:pointer;">SU only: OFF</button>
    </div>
    <div id="nuance-debug-mode">Mode: normal</div>
    <div id="nuance-debug-timing">SU time: 0 ms</div>
    <div id="nuance-debug-count">SU count: 0</div>
  `;

  const toggleButton = panel.querySelector("#nuance-debug-toggle");
  toggleButton.addEventListener("click", () => {
    debugSentenceUnitsOnly = !debugSentenceUnitsOnly;
    updateDebugPanel();
  });

  document.body.appendChild(panel);
  updateDebugPanel();
}

function updateDebugPanel() {
  const panel = document.getElementById("nuance-debug-panel");
  if (!panel) {
    return;
  }

  const toggleButton = panel.querySelector("#nuance-debug-toggle");
  const modeEl = panel.querySelector("#nuance-debug-mode");
  const timingEl = panel.querySelector("#nuance-debug-timing");
  const countEl = panel.querySelector("#nuance-debug-count");

  if (toggleButton) {
    toggleButton.textContent = `SU only: ${debugSentenceUnitsOnly ? "ON" : "OFF"}`;
    toggleButton.style.background = debugSentenceUnitsOnly ? "#fbbf24" : "#38bdf8";
    toggleButton.style.color = debugSentenceUnitsOnly ? "#111827" : "#082f49";
  }

  if (modeEl) {
    modeEl.textContent = `Mode: ${debugSentenceUnitsOnly ? "sentence-units-only" : "normal"}`;
  }

  if (timingEl) {
    timingEl.textContent = `SU time: ${lastSentenceUnitTiming.sentenceUnitReconstructionMs.toFixed(2)} ms`;
  }

  if (countEl) {
    countEl.textContent = `SU count: ${lastSentenceUnitTiming.outputSentenceUnitCount}`;
  }
}

function updateSubtitleFromSentenceUnits() {
  if (!isWatchPage()) {
    renderSubtitleText("");
    return;
  }

  const video =
    document.querySelector("video");

  if (
    !video ||
    !Array.isArray(sentenceUnits) ||
    sentenceUnits.length === 0
  ) {
    renderSubtitleText("");
    return;
  }

  const currentMs =
    Math.floor(
      video.currentTime * 1000
    );

  const currentUnit =
    sentenceUnits.find(
      unit =>
        currentMs >= unit.start &&
        currentMs < unit.end
    );

  renderSubtitleText(currentUnit?.text ?? "");
}

ensurePretendardFont();
ensureDebugPanel();

// 영상 변경 감지
setInterval(() => {

  const videoId =
    new URLSearchParams(
      location.search
    ).get("v");

  if (!isWatchPage()) {
    box.textContent = "";
    box.style.display = "none";
    return;
  }

  if (
    videoId &&
    videoId !== currentVideoId
  ) {

    currentVideoId = videoId;

    translated = false;

    subtitles = [];

    sentences = [];

    sentenceUnits = [];

    box.textContent = "";

    box.style.display = "none";

    console.log(
      "Video changed:",
      videoId
    );

  }

}, 500);

// Sentence Unit 기준 자막 표시

setInterval(() => {
  updateSubtitleFromSentenceUnits();
}, 100);



// setInterval(() => {

//   const video =
//     document.querySelector("video");

//   if (
//     !video ||
//     !Array.isArray(subtitles) ||
//     subtitles.length === 0
//   ) {
//     return;
//   }

//   const currentMs =
//     Math.floor(
//       video.currentTime * 1000
//     );

//   const currentSubtitle =
//     subtitles.find(
//       subtitle =>
//         currentMs >=
//           subtitle.start &&
//         currentMs <
//           subtitle.start +
//           subtitle.duration
//     );

//   const text =
//     currentSubtitle?.text ?? "";

//   box.textContent = text;

//   box.style.display =
//     text ? "block" : "none";

// }, 100);

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

    if (!isWatchPage()) {
      renderSubtitleText("");
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

      const videoId =
        new URLSearchParams(
          window.location.search
        ).get("v");

      const requestBase = {
        videoId,
        title: document.title,
        channel,
        sentenceSubtitles,
      };

      console.count(
        "POST VIDEO SENTENCE UNITS"
      );

      const sentenceUnitResponse =
        await fetch(
          `${SERVER_ADDRESS}/video/sentenceunit`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              ...requestBase,
              subtitles: sentenceSubtitles
            })
          }
        );

      const sentenceUnitPayload =
        await sentenceUnitResponse.json();

      const resolvedSentenceUnits =
        Array.isArray(sentenceUnitPayload.sentenceUnits)
          ? sentenceUnitPayload.sentenceUnits
          : sentenceSubtitles.map((item, index) => ({
              unitId: index,
              start: item.start,
              end: item.start + item.duration,
              subtitleIds: [item.id ?? index],
              text: item.text
            }));

      lastSentenceUnitTiming = {
        sentenceUnitReconstructionMs:
          Number(sentenceUnitPayload?.timing?.sentenceUnitReconstructionMs ?? 0),
        outputSentenceUnitCount:
          Array.isArray(resolvedSentenceUnits) ? resolvedSentenceUnits.length : 0
      };

      updateDebugPanel();

      sentenceUnits = resolvedSentenceUnits;

      console.log(
        "Sentence Units:",
        sentenceUnits
      );

      if (debugSentenceUnitsOnly) {
        console.log("[debug] sentence-units-only mode enabled");
        console.log("Sentence Units:", JSON.stringify(resolvedSentenceUnits, null, 2));
        return;
      }

      console.count(
        "POST VIDEO KNOWLEDGE + TRANSLATE"
      );

      if (debugSentenceUnitsOnly) {
        console.log("[debug] sentence-units-only mode enabled");
        console.log("Sentence Units:", JSON.stringify(resolvedSentenceUnits, null, 2));
        return;
      }

      const [knowledgeResponse, translateResponse] =
        await Promise.all([
          fetch(
            `${SERVER_ADDRESS}/video/knowledge`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                ...requestBase,
                sentenceUnits: resolvedSentenceUnits,
                subtitles: sentenceSubtitles
              })
            }
          ),
          fetch(
            `${SERVER_ADDRESS}/video/translate`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                videoId,
                title: document.title,
                channel,
                sentenceUnits: resolvedSentenceUnits,
                sentenceSubtitles,
                targetLanguage: "ko"
              })
            }
          )
        ]);

      const knowledgePayload =
        await knowledgeResponse.json();

      const translatePayload =
        await translateResponse.json();

      const translatedEntries =
        Array.isArray(translatePayload.translations)
          ? translatePayload.translations
          : [];

      subtitles =
        translatedEntries.map(
          entry => ({
            sentenceId:
              entry.sentenceId ?? entry.unitId ?? 0,
            start:
              entry.start ?? 0,
            duration:
              entry.duration ?? 0,
            subtitleIds:
              entry.subtitleIds ?? [],
            text:
              entry.translatedText ?? entry.text ?? ""
          })
        );

      subtitles.sort(
        (a, b) =>
          a.sentenceId -
          b.sentenceId
      );

      console.log(
        "Translated:",
        subtitles.length
      );

      console.log(
        "Knowledge:",
        knowledgePayload
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