import fs from "fs";
import path from "path";

const logDir =
  path.join(
    process.cwd(),
    "logs"
  );

const logFile =
  path.join(
    logDir,
    "benchmark.csv"
  );

export function saveBenchmark({

  videoId,

  durationSec,

  subtitleCount,

  chunkCount,

  model,

  contextInputTokens,

  contextOutputTokens,

  translationInputTokens,

  translationOutputTokens,

  totalTokens,

  totalMs

}) {

  // logs 폴더 생성
  if (
    !fs.existsSync(logDir)
  ) {

    fs.mkdirSync(
      logDir,
      {
        recursive: true
      }
    );

  }

  // CSV 헤더
  if (
    !fs.existsSync(logFile)
  ) {

    fs.writeFileSync(

      logFile,

`date,videoId,durationSec,subtitleCount,chunkCount,model,contextInputTokens,contextOutputTokens,translationInputTokens,translationOutputTokens,totalTokens,totalMs
`

    );

  }

  const now =
    new Date()
      .toISOString();

  const row = [

    now,

    videoId,

    durationSec,

    subtitleCount,

    chunkCount,

    model,

    contextInputTokens,

    contextOutputTokens,

    translationInputTokens,

    translationOutputTokens,

    totalTokens,

    totalMs

    ].join(",");

  fs.appendFileSync(

    logFile,

    row + "\n"

  );

}