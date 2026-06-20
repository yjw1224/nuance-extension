function msToSrt(ms) {
  const date = new Date(ms);

  const hours =
    String(date.getUTCHours()).padStart(2, "0");

  const minutes =
    String(date.getUTCMinutes()).padStart(
      2,
      "0"
    );

  const seconds =
    String(date.getUTCSeconds()).padStart(
      2,
      "0"
    );

  const millis =
    String(date.getUTCMilliseconds())
      .padStart(3, "0");

  return `${hours}:${minutes}:${seconds},${millis}`;
}

export function generateSrt(
  transcript,
  translations
) {
  let result = "";

  transcript.forEach((item, index) => {
    const start = msToSrt(item.offset);

    const end = msToSrt(
      item.offset + item.duration
    );

    result += `${index + 1}\n`;
    result += `${start} --> ${end}\n`;
    result += `${translations[index]}\n\n`;
  });

  return result;
}