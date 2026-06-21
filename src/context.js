import { openai } from "./openai.js";

import { translateInto } from "../data/language.js";

export async function generateContext(
  videoTitle,
  transcriptSentence
) {

  const transcriptText =
    transcriptSentence
      .map(sentence => sentence.text)
      .join("\n");

  const response =
    await openai.responses.create({
      model: "gpt-4.1-mini",

      input: `
You are creating a Translation Context Memory for subtitle translation into ${translateInto}.

Analyze the video title and transcript.

Focus only on information that improves translation quality.

Output the following sections.

### TOPIC

* Main topic
* Domain
* Tone

Use the video title as an important source of context.

### KEY TERMS

List only important entities, products, technologies, organizations, people, or concepts that appear repeatedly or are central to understanding the video.

### TERM DISAMBIGUATION

Only include terms with multiple possible meanings.

For each term provide:

Term:
Meaning in this video:
Avoid:
Use:

Example:

Term: Agent
Meaning: AI autonomous software agent
Avoid: representative, secret agent
Use: AI 에이전트

### TRANSLATION RULES

Only include rules specific to this video.

Examples:

* Keep product names untranslated.
* Use standard ${translateInto} technical terminology.
* Prefer natural ${translateInto} over literal translation.
* Maintain terminology consistency.

### STYLE GUIDE

Choose one:

* -다
* -습니다
* -요

Specify:

* preferred register
* preferred phrasing style
* unnatural literal patterns to avoid
* natural expressions to prefer

Maximum 180 words.

Video Title:

${videoTitle}

Transcript:

${transcriptText}
`
    });

  console.log(
    JSON.stringify(
      response.usage,
      null,
      2
    )
  );

  return response.output_text;
}