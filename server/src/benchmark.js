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

export function saveBenchmark(data) {

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

  const headers =
    Object.keys(data);

  // CSV 헤더 생성
  if (
    !fs.existsSync(logFile)
  ) {

    fs.writeFileSync(

      logFile,

      [
        "date",
        ...headers
      ].join(",") + "\n"

    );

  }

  const now =
    new Date()
      .toISOString();

  const row =
    [
      now,

      ...headers.map(

        key => {

          const value =
            data[key];

          if (
            value === undefined ||
            value === null
          ) {
            return "";
          }

          return String(value)
            .replaceAll(",", " ");

        }

      )

    ].join(",");

  fs.appendFileSync(

    logFile,

    row + "\n"

  );

}