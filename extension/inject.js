// =====================
// fetch
// =====================

const originalFetch =
  window.fetch;

window.fetch =
  async (...args) => {

    const response =
      await originalFetch(...args);

    try {

      const url =
        String(args[0]);

      if (
        url.includes("/api/timedtext") &&
        url.includes("lang=en")
      ) {

        const subtitleJson =
          await response
            .clone()
            .json();

        window.postMessage(

          {

            type:
              "NUANCE_SUBTITLE_JSON",

            subtitleJson

          },

          "*"

        );

      }

    }

    catch (error) {

      console.error(error);

    }

    return response;

  };


// =====================
// XMLHttpRequest
// =====================

const originalOpen =
  XMLHttpRequest.prototype.open;

XMLHttpRequest.prototype.open =
function (
  method,
  url,
  ...rest
) {

  this._nuanceUrl = url;

  return originalOpen.call(
    this,
    method,
    url,
    ...rest
  );

};

const originalSend =
  XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.send =
function (...args) {

  this.addEventListener(

    "load",

    () => {

      try {

        if (
          !this._nuanceUrl
        ) {
          return;
        }

        if (
          !this._nuanceUrl.includes(
            "/api/timedtext"
          )
        ) {
          return;
        }

        if (
          !this._nuanceUrl.includes(
            "lang=en"
          )
        ) {
          return;
        }

        const subtitleJson =
          JSON.parse(
            this.responseText
          );

        window.postMessage(

          {

            type:
              "NUANCE_SUBTITLE_JSON",

            subtitleJson

          },

          "*"

        );

      }

      catch (error) {

        console.error(error);

      }

    }

  );

  return originalSend.apply(
    this,
    args
  );

};