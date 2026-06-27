let subtitleLoaded = false;

chrome.webRequest.onCompleted.addListener(

  async details => {

    // 이미 가져왔으면 종료
    if (subtitleLoaded) {
      return;
    }

    // timedtext만
    if (
      !details.url.includes("/api/timedtext")
    ) {
      return;
    }

    // 영어 자막만
    if (
      !details.url.includes("lang=en")
    ) {
      return;
    }

    try {

      console.count("TIMEDTEXT");

      const response =
        await fetch(details.url);

      const subtitleJson =
        await response.json();

      // 실제 영어인지 확인
      const firstText =
        subtitleJson.events
          ?.find(event => event.segs)
          ?.segs?.[0]?.utf8 ?? "";

      if (
        !/[A-Za-z]/.test(firstText)
      ) {
        return;
      }

      subtitleLoaded = true;

      console.log(
        "\n=== ENGLISH TIMEDTEXT FOUND ===\n"
      );

      console.log(details.url);

      console.count("SEND MESSAGE");

      chrome.tabs.sendMessage(

        details.tabId,

        {
          type:
            "NUANCE_SUBTITLE_JSON",

          subtitleJson
        }

      );

    }

    catch (error) {

      console.error(error);

      subtitleLoaded = false;

    }

  },

  {

    urls: [
      "*://*.youtube.com/api/timedtext*"
    ]

  }

);