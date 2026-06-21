import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const TEMP_DIR = "./temp";

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
  }
}

function findLatestVttFile() {
  const files = fs.readdirSync(TEMP_DIR);

  const vtt = files.find(
    file =>
      file.endsWith(".en.vtt") ||
      file.endsWith(".en-US.vtt")
  );

  return vtt
    ? path.join(TEMP_DIR, vtt)
    : null;
}

function parseVtt(vttContent) {
  const lines = vttContent.split("\n");

  const transcript = [];

  let currentTime = null;

  for (const line of lines) {

    const trimmed = line.trim();

    if (
      trimmed.includes("-->")
    ) {
      currentTime = trimmed;
      continue;
    }

    if (
      !trimmed ||
      trimmed.startsWith("WEBVTT")
    ) {
      continue;
    }

    transcript.push({
      time: currentTime,
      text: trimmed
    });
  }

  return transcript;
}

export async function getVideoInfo(url) {

  ensureTempDir();

  try {

    // 제목
    const title = execSync(
      `yt-dlp --print title "${url}"`,
      { encoding: "utf8" }
    ).trim();

    // 채널명
    const channel = execSync(
      `yt-dlp --print channel "${url}"`,
      { encoding: "utf8" }
    ).trim();

    // 기존 vtt 제거
    fs.readdirSync(TEMP_DIR)
      .forEach(file => {
        if (file.endsWith(".vtt")) {
          fs.unlinkSync(
            path.join(TEMP_DIR, file)
          );
        }
      });

    // 영어 자동자막 다운로드
    execSync(
      `
      yt-dlp \
      --write-auto-subs \
      --sub-lang en \
      --skip-download \
      --js-runtimes node \
      -o "${TEMP_DIR}/%(id)s.%(ext)s" \
      "${url}"
      `,
      {
        stdio: "ignore"
      }
    );

    const vttPath =
      findLatestVttFile();

    if (!vttPath) {

      return {
        title,
        channel,
        transcript: []
      };
    }

    const vttContent =
      fs.readFileSync(
        vttPath,
        "utf8"
      );

    const transcript =
      parseVtt(vttContent);

    return {
      title,
      channel,
      transcript
    };

  } catch (error) {

    console.error(error);

    throw new Error(
      "유튜브 정보를 가져오지 못했습니다."
    );
  }
}