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
    }

    addBackwardRatio(isBackward) {
      this.seekCount++;

      if(isBackward) this.seekBackwardCount++;

      this.features.backwardRatio = this.seekBackwardCount / this.seekCount;
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

        await fetch(`${SERVER_ADDRESS}/inference`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(this.events)
        });

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
  video.addEventListener("enterpictureinpicture", () => {});

  video.addEventListener("leavepictureinpicture", () => {});
}

(async () => {
    const video = await waitForVideo();

    setupPlayPause(video);
    setupSeeking(video);
    setupPip(video);
})();

let sentenceUnits = [];
let baseSentenceUnits = [];
let baseSentenceSubtitles = [];
let sourceLanguageForVideo = "ko";
let sentenceUnitsVideoId = null;

let debugSentenceUnitsOnly = true;
let debugDualSubtitles = false;
let targetLanguage = "en";
let translationPending = false;
let languageRequestSeq = 0;
let lastSentenceUnitTiming = {
  sentenceUnitReconstructionMs: 0,
  translationMs: null,
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

function ensureSubtitleBoxAttached() {
  const video = document.querySelector("video");
  const player =
    video?.closest(".html5-video-player, #movie_player") ||
    document.querySelector("#movie_player");

  if (!player) {
    return false;
  }

  if (box.parentElement !== player) {
    player.append(box);
  }

  return true;
}

function renderSubtitleText(text, sourceText = "") {
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

  if (!ensureSubtitleBoxAttached()) {
    box.textContent = "";
    box.style.display = "none";
    return;
  }

  const translatedText = String(text).trim();
  const originalText = String(sourceText).trim();
  const showDualSubtitles =
    debugDualSubtitles &&
    targetLanguage !== sourceLanguageForVideo &&
    originalText;

  box.textContent = "";

  if (showDualSubtitles) {
    const sourceLine = document.createElement("div");
    sourceLine.className = "nuance-subtitle-source";
    sourceLine.textContent = originalText;
    box.append(sourceLine);

    const translatedLine = document.createElement("div");
    translatedLine.className = "nuance-subtitle-translation";
    translatedLine.textContent = translatedText;
    box.append(translatedLine);
  } else {
    box.textContent = translatedText;
  }

  box.style.display = "block";
}

function ensureDebugPanel() {
  const existingPanel = document.getElementById("nuance-debug-panel");
  if (existingPanel) {
    existingPanel.remove();
  }

  const panel = document.createElement("div");
  panel.id = "nuance-debug-panel";
  panel.style.position = "fixed";
  panel.style.top = "48px";
  panel.style.right = "16px";
  panel.style.zIndex = "2147483647";
  panel.style.width = "240px";
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
    <div style="display:flex; justify-content:space-between; align-items:center; gap: 8px; margin-bottom: 8px;">
      <strong style="font-size: 12px;">Nuance Debug</strong>
      <button id="nuance-debug-toggle" style="border:none; border-radius:999px; padding:5px 10px; background:#38bdf8; color:#082f49; font-weight:700; cursor:pointer;">SU only: OFF</button>
    </div>
    <button id="nuance-debug-dual-subtitle-toggle" style="width:100%; border:none; border-radius:999px; padding:5px 10px; margin-bottom:8px; background:#38bdf8; color:#082f49; font-weight:700; cursor:pointer;">이중 자막: OFF</button>
    <label style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom: 8px; font-size:12px; color:#e2e8f0;">
      <span>번역 언어</span>
      <select id="nuance-language-select" style="appearance:none; border:1px solid rgba(148,163,184,0.7); border-radius:6px; background:#0f172a; color:#f8fafc; padding:4px 8px; min-width: 112px; font-size:12px; cursor:pointer;">
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </select>
    </label>
    <div id="nuance-debug-mode">Mode: normal</div>
    <div id="nuance-debug-timing">SU time: 0 ms</div>
    <div id="nuance-debug-translate-timing">Translate time: -</div>
    <div id="nuance-debug-count">SU count: 0</div>
  `;

  const toggleButton = panel.querySelector("#nuance-debug-toggle");
  toggleButton.addEventListener("click", () => {
    debugSentenceUnitsOnly = !debugSentenceUnitsOnly;
    updateDebugPanel();
  });

  const dualSubtitleToggle = panel.querySelector("#nuance-debug-dual-subtitle-toggle");
  dualSubtitleToggle.addEventListener("click", () => {
    debugDualSubtitles = !debugDualSubtitles;
    updateDebugPanel();
    updateSubtitleFromSentenceUnits();
  });

  const languageSelect = panel.querySelector("#nuance-language-select");
  languageSelect.value = targetLanguage;
  languageSelect.addEventListener("change", (event) => {
    targetLanguage = event.target.value;
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
  const dualSubtitleToggle = panel.querySelector("#nuance-debug-dual-subtitle-toggle");
  const modeEl = panel.querySelector("#nuance-debug-mode");
  const timingEl = panel.querySelector("#nuance-debug-timing");
  const translateTimingEl = panel.querySelector("#nuance-debug-translate-timing");
  const countEl = panel.querySelector("#nuance-debug-count");

  if (toggleButton) {
    toggleButton.textContent = `SU only: ${debugSentenceUnitsOnly ? "ON" : "OFF"}`;
    toggleButton.style.background = debugSentenceUnitsOnly ? "#fbbf24" : "#38bdf8";
    toggleButton.style.color = debugSentenceUnitsOnly ? "#111827" : "#082f49";
  }

  if (dualSubtitleToggle) {
    dualSubtitleToggle.textContent = `이중 자막: ${debugDualSubtitles ? "ON" : "OFF"}`;
    dualSubtitleToggle.style.background = debugDualSubtitles ? "#fbbf24" : "#38bdf8";
    dualSubtitleToggle.style.color = debugDualSubtitles ? "#111827" : "#082f49";
  }

  if (modeEl) {
    modeEl.textContent = `Mode: ${debugSentenceUnitsOnly ? "sentence-units-only" : "normal"}`;
  }

  if (timingEl) {
    timingEl.textContent = `SU time: ${lastSentenceUnitTiming.sentenceUnitReconstructionMs.toFixed(2)} ms`;
  }

  if (translateTimingEl) {
    const value = lastSentenceUnitTiming.translationMs;
    translateTimingEl.textContent =
      typeof value === "number"
        ? `Translate time: ${value.toFixed(2)} ms`
        : "Translate time: -";
  }

  if (countEl) {
    countEl.textContent = `SU count: ${lastSentenceUnitTiming.outputSentenceUnitCount}`;
  }
}

function normalizeSentenceUnitsForDisplay(units) {
  if (!Array.isArray(units)) {
    return [];
  }

  return units.map((unit, index) => {
    const start = Number(unit.start ?? 0);
    const endCandidate = unit.end ?? (start + Number(unit.duration ?? 0));
    const end = Math.max(Number(endCandidate ?? start), start);

    return {
      ...unit,
      unitId: unit.unitId ?? unit.sentenceId ?? index,
      sentenceId: unit.sentenceId ?? unit.unitId ?? index,
      start,
      end,
      subtitleIds: Array.isArray(unit.subtitleIds) ? unit.subtitleIds : [],
      sourceText: unit.text ?? "",
      text: unit.translatedText ?? unit.text ?? ""
    };
  });
}

function setDisplayedSentenceUnits(units) {
  sentenceUnits = normalizeSentenceUnitsForDisplay(units);
}

function getCurrentVideoContext() {
  return {
    videoId: new URLSearchParams(window.location.search).get("v"),
    title: document.title,
    channel: document.querySelector("#channel-name a")?.textContent.trim()
  };
}

async function applyLanguageSelection() {
  if (!isWatchPage()) {
    renderSubtitleText("");
    return;
  }

  if (!sentenceUnitsVideoId || baseSentenceUnits.length === 0) {
    renderSubtitleText("");
    return;
  }

  if (targetLanguage === sourceLanguageForVideo) {
    lastSentenceUnitTiming.translationMs = null;
    updateDebugPanel();
    translationPending = false;
    setDisplayedSentenceUnits(baseSentenceUnits);
    return;
  }

  const requestId = ++languageRequestSeq;
  translationPending = true;
  const translateTimerStart = performance.now();

  const { videoId, title, channel } = getCurrentVideoContext();
  const resolvedVideoId = videoId || sentenceUnitsVideoId;

  try {
    const translateRequest = fetch(`${SERVER_ADDRESS}/video/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        videoId: resolvedVideoId,
        title,
        channel,
        sentenceUnits: baseSentenceUnits,
        sentenceSubtitles: baseSentenceSubtitles,
        sourceLanguage: sourceLanguageForVideo,
        targetLanguage
      })
    });

    if (!debugSentenceUnitsOnly) {
      await fetch(`${SERVER_ADDRESS}/video/knowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          videoId: resolvedVideoId,
          title,
          channel,
          sentenceUnits: baseSentenceUnits,
          subtitles: baseSentenceSubtitles
        })
      });
    }

    const translateResponse = await translateRequest;

    const translatePayload = await translateResponse.json();

    if (!translatePayload || !Array.isArray(translatePayload.translations)) {
      throw new Error("Translation response missing translations");
    }

    if (requestId !== languageRequestSeq) {
      return;
    }

    setDisplayedSentenceUnits(translatePayload.translations);

    sentenceUnits.sort(
      (a, b) =>
        (a.sentenceId ?? a.unitId ?? 0) -
        (b.sentenceId ?? b.unitId ?? 0)
    );
  } catch (error) {
    if (requestId !== languageRequestSeq) {
      return;
    }

    setDisplayedSentenceUnits(baseSentenceUnits);

    console.error("\n=== SERVER ERROR ===\n");
    console.error(error);
  } finally {
    if (requestId === languageRequestSeq) {
      lastSentenceUnitTiming.translationMs = Number((performance.now() - translateTimerStart).toFixed(2));
      updateDebugPanel();
      translationPending = false;
    }
  }
}

function resetSubtitleStateForVideoChange() {
  languageRequestSeq += 1;
  translationPending = false;

  sentenceUnits = [];
  baseSentenceUnits = [];
  baseSentenceSubtitles = [];
  sourceLanguageForVideo = "ko";
  sentenceUnitsVideoId = null;
  lastSentenceUnitTiming.translationMs = null;
  updateDebugPanel();

  box.textContent = "";
  box.style.display = "none";
}

function updateSubtitleFromSentenceUnits() {
  if (!isWatchPage()) {
    renderSubtitleText("");
    return;
  }

  if (translationPending) {
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

  renderSubtitleText(
    currentUnit?.text ?? "",
    currentUnit?.sourceText ?? ""
  );
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

    resetSubtitleStateForVideoChange();

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

async function handleSubtitleMessage(message) {
    if (!message || message.type !== "NUANCE_SUBTITLE_JSON") {
      return;
    }

    if (!isWatchPage()) {
      renderSubtitleText("");
      return;
    }

    const sourceLanguage =
      String(message.sourceLanguage || "ko").toLowerCase();

    const { videoId, title, channel } = getCurrentVideoContext();
    if (!videoId) {
      return;
    }

    if (sentenceUnitsVideoId === videoId && baseSentenceUnits.length > 0) {
      sourceLanguageForVideo = sourceLanguage;
      await applyLanguageSelection();
      return;
    }

    const requestId = ++languageRequestSeq;
    translationPending = true;

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

      const sentenceSubtitles =
        rebuildSentences(
          rawSubtitles
        );

      const requestBase = {
        videoId,
        title,
        channel,
        sentenceSubtitles,
      };

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

      if (requestId !== languageRequestSeq) {
        return;
      }

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
        translationMs: null,
        outputSentenceUnitCount:
          Array.isArray(resolvedSentenceUnits) ? resolvedSentenceUnits.length : 0
      };

      updateDebugPanel();

      sourceLanguageForVideo = sourceLanguage;
      sentenceUnitsVideoId = videoId;
      baseSentenceSubtitles = sentenceSubtitles;
      baseSentenceUnits = normalizeSentenceUnitsForDisplay(resolvedSentenceUnits);

      setDisplayedSentenceUnits(baseSentenceUnits);

      await applyLanguageSelection();

    }

    catch (error) {

      if (requestId === languageRequestSeq) {
        translationPending = false;
      }

      console.error(
        "\n=== SERVER ERROR ===\n"
      );

      console.error(error);

    }

  }

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

    await handleSubtitleMessage(message);

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