import fs from "fs";

import { generateContext }
from "./context.js";

import { translateTranscript }
from "./translator.js";

import {rebuildSentences}
from "./sentenceRebuilder.js";

async function main() {

  const transcript =
    rebuildSentences(fs.readFileSync(
      "./data/script.txt",
      "utf8"
    ));

  console.log(
    "\n=== 원본 자막 ===\n"
  );

  console.log(transcript);

  console.log(
    "\n=== 컨텍스트 생성 중 ===\n"
  );

  const context =
    await generateContext(
      transcript
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
      transcript,
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