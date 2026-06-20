import { YoutubeTranscript } from "youtube-transcript";

export async function getTranscript(videoId) {
  try {
    const transcript =
      await YoutubeTranscript.fetchTranscript(videoId);

    return transcript;
  } catch (error) {
    console.error(error);

    throw new Error(
      "자막을 가져오지 못했습니다."
    );
  }
}