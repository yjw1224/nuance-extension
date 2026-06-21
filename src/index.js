import fs from "fs";

import { generateContext }
from "./context.js";

import { translateTranscript }
from "./translator.js";

import {rebuildSentences}
from "./sentenceRebuilder.js";

// import {
//   getVideoInfo
// } from "./youtube.js";

async function main() {

  const videoData = {
    url: "https://www.youtube.com/watch?v=MBRqu0YOH14&pp=ygUW64KZ6rSA7KCBIO2XiOustOyjvOydmA%3D%3D",
    title: "낙관적 허무주의",
    channel: 'Kurzgesagt - In a Nutshell',
    transcript: rebuildSentences(fs.readFileSync(
      "./data/script.txt",
      "utf8"
    ))
  };

  console.log("\n=== 제목 ===\n");
  console.log(videoData.title);

  console.log("\n=== 채널명 ===\n");
  console.log(videoData.channel);

  console.log(
    "\n=== 원본 자막 ===\n"
  );

  console.log(videoData.transcript);

  console.log(
    "\n=== 컨텍스트 생성 중 ===\n"
  );

  const context =
    await generateContext(
      videoData.transcript
    );

  console.log(context);

  fs.writeFileSync(
    "./output/context.txt",
    context
  );

  console.log(
    "\n=== 번역 중 ===\n"
  );

  const translation =
    await translateTranscript(
      videoData.transcript,
      context
    );

  fs.writeFileSync(
    "./output/subtitle_ko.txt",
    translation
  );

  console.log(
    "\n번역 완료"
  );

  console.log(
    "\noutput/subtitle_ko.txt 생성"
  );
}

main();