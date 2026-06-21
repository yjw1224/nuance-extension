import fs from "fs";

import { generateContext }
from "./context.js";

import { translateTranscript }
from "./translator.js";

import { rebuildSentences }
from "./sentenceRebuilder.js";

import { alignTranslations } from "./alignment.js";

// import {
//   getVideoInfo
// } from "./youtube.js";

async function main() {

  const statsFile =
    "./output/performance.csv";

  if (!fs.existsSync(statsFile)) {

    fs.writeFileSync(
      statsFile,
      "video,sentences,characters,context_ms,translation_ms,total_ms\n"
    );

  }

  const rawSubtitle = JSON.parse(
    fs.readFileSync("./data/subtitle.json", "utf8")
  );

  /** raw data of yt subtitles */
  const rawSubtitles = rawSubtitle.events
    .filter(event => event.segs)
    .map((event, index) => ({
      id: index,
      start: event.tStartMs,
      duration: event.dDurationMs,
      text: event.segs
        .map(seg => seg.utf8)
        .join("")
    }));
  const subtitles = rebuildSentences(rawSubtitles);

  const videoData = {
    url: "https://www.youtube.com/watch?v=MBRqu0YOH14&pp=ygUW64KZ6rSA7KSBIO2XiOustOyjvOydmA%3D%3D",
    title: `EJAE, Audrey Nuna & Rei Ami from KPop Demon Hunters Get Surprised with Platinum Record for "Golden"`,
    channel: "Jimmy Fallon Tonight Show",

    subtitles,
    transcript: subtitles.map(t => t.text)
  };

  console.log("\n=== 제목 ===\n");
  console.log(videoData.title);

  console.log("\n=== 채널명 ===\n");
  console.log(videoData.channel);

  console.log("\n=== 자막 json === \n");
  console.log(videoData.subtitles.slice(0,5));

  console.log("\n=== 원본 자막 ===\n");

  console.log(videoData.transcript);

  console.log(
    `\n문장 수: ${videoData.subtitles.length}`
  );

  console.log(
    `글자 수: ${
      videoData.transcript.join(" ").length
    }`
  );

  console.log(
    "\n=== 컨텍스트 생성 중 ===\n"
  );

  const totalStart =
    Date.now();

  const contextStart =
    Date.now();

  const context =
    await generateContext(
      videoData.title,
      videoData.transcript
    );

  const contextTime =
    Date.now() - contextStart;

  console.log(
    `CONTEXT: ${contextTime}ms`
  );

  console.log(context);

  fs.writeFileSync(
    "./output/context.txt",
    context
  );

  console.log(
    "\n=== 번역 중 ===\n"
  );

  const translationStart =
    Date.now();

  const translation =
    await translateTranscript(
      videoData.subtitles,
      context
    );

  const translationTime =
    Date.now() -
    translationStart;

  console.log(
    `TRANSLATION: ${translationTime}ms`
  );

  const aligned =
    alignTranslations(
      translation,
      rawSubtitles
    );

  fs.writeFileSync(
    "./output/translation.json",
    JSON.stringify(
      aligned,
      null,
      2
    )
  );

  fs.writeFileSync(
    "./output/translation.txt",
    translation
      .map(t => t.translatedText)
      .join("\n")
  );

  const totalTime =
    Date.now() -
    totalStart;

  console.log(
    `TOTAL: ${totalTime}ms`
  );

  const sentenceCount =
    videoData.transcript.length;

  const characterCount =
    videoData.transcript
      .join(" ")
      .length;

  const row = [
    `"${videoData.title}"`,
    sentenceCount,
    characterCount,
    contextTime,
    translationTime,
    totalTime
  ].join(",");

  fs.appendFileSync(
    statsFile,
    row + "\n"
  );

  console.log(
    "\n번역 완료"
  );

  console.log(
    "\noutput/subtitle_ko.txt 생성"
  );

  console.log(
    "\noutput/performance.csv 기록 완료"
  );
}

main();