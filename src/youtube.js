export async function getVideoInfo() {

  const playerResponse =
    window.ytInitialPlayerResponse;

  if (!playerResponse) {
    throw new Error(
      "ytInitialPlayerResponse를 찾을 수 없습니다."
    );
  }

  const title =
    playerResponse.videoDetails?.title ??
    "Unknown Title";

  const channel =
    playerResponse.videoDetails?.author ??
    "Unknown Channel";

  const tracks =
    playerResponse.captions
      ?.playerCaptionsTracklistRenderer
      ?.captionTracks;

  if (!tracks?.length) {
    throw new Error(
      "자막 트랙을 찾을 수 없습니다."
    );
  }

  // 영어 자막 우선
  let track =
    tracks.find(
      t => t.languageCode === "en"
    );

  if (!track) {
    track = tracks[0];
  }

  let subtitleUrl =
    track.baseUrl;

  if (!subtitleUrl.includes("fmt=json3")) {
    subtitleUrl += "&fmt=json3";
  }

  const response =
    await fetch(subtitleUrl);

  if (!response.ok) {
    throw new Error(
      `자막 다운로드 실패 (${response.status})`
    );
  }

  const json =
    await response.json();

  const subtitles =
    (json.events ?? [])

      .filter(
        event =>
          event.segs &&
          event.segs.length
      )

      .map(event => ({

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
            .replace(
              /\n/g,
              " "
            )
            .trim()

      }))

      .filter(
        subtitle =>
          subtitle.text.length
      );

  return {

    title,

    channel,

    subtitles

  };
}