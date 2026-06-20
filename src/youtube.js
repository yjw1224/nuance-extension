export function getVideoId(url) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.slice(1);
    }

    return parsedUrl.searchParams.get("v");
  } catch (error) {
    throw new Error("유효한 유튜브 URL이 아닙니다.");
  }
}