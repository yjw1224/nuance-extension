let subtitleLoaded = false;

chrome.webRequest.onCompleted.addListener(

  async details => {

    // 이미 한 번 가져왔으면 종료
    if (subtitleLoaded) {
      return;
    }

    // timedtext만 허용
    if (
      !details.url.includes(
        "/api/timedtext"
      )
    ) {
      return;
    }

    // 영어 자막만 허용
    // 영어
    // 영어(자동 생성됨)
    if (
      !details.url.includes(
        "lang=en"
      )
    ) {
      return;
    }

    subtitleLoaded = true;

    try {

      console.log(
        "\n=== ENGLISH TIMEDTEXT FOUND ===\n"
      );

      console.log(
        details.url
      );

      const response =
        await fetch(
          details.url
        );

      const subtitleJson =
        await response.json();

      console.log(
        "\n=== SUBTITLE JSON ===\n"
      );

      console.log(
        subtitleJson
      );

      console.log(
        "tabId:",
        details.tabId
        );

        chrome.tabs.sendMessage(
        details.tabId,
        {
            type:
            "NUANCE_SUBTITLE_JSON",

            subtitleJson
        }
        );

        console.log(
        "sent"
        );

    } catch (error) {

      console.error(
        "\n=== SUBTITLE FETCH FAILED ===\n"
      );

      console.error(
        error
      );

      // 실패 시 재시도 가능하게 복구
      subtitleLoaded = false;

    }

  },

  {
    urls: [
      "*://*.youtube.com/api/timedtext*"
    ]
  }

);