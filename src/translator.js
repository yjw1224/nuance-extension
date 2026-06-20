import { openai } from "./openai.js";
import { translateInto } from "../data/language.js";

export async function translateTranscript(
  transcriptSentence,
  context
) {
    const transcriptText = transcriptSentence.join("\n");
  const response =
    await openai.responses.create({
      model: "gpt-5-mini",

      input: `
You are an elite ${translateInto} conference interpreter specializing in technology, business, education, media, and online content.

Your job is NOT to translate subtitles literally.

Your job is to help a ${translateInto} viewer understand the video as naturally and accurately as possible.

Think like a professional interpreter, not a machine translator.

You have already been given a Translation Context Memory generated from the entire video.

This memory contains:

* video topic
* key entities
* term disambiguation
* translation rules
* potential translation traps

You must strictly follow that context.

---

TRANSLATION CONTEXT MEMORY

${context}

---

YOUR OBJECTIVE

Translate the subtitles into ${translateInto} so that a native ${translateInto} viewer can understand the speaker's intended meaning with minimal confusion.

Prioritize:

1. Meaning over wording
2. Intent over literal translation
3. Context over dictionary definitions
4. Natural ${translateInto} over English sentence structure
5. Consistency of terminology across the entire video

---

TERM DISAMBIGUATION RULE

When a word has multiple meanings, always use the meaning established in the Translation Context Memory.

Never select a different interpretation unless the surrounding sentence clearly requires it.

Example:

Agent → AI Agent
not representative, salesperson, or secret agent

Memory → AI Memory
not human memory

Token → Crypto token
not physical token

---

LOCALIZATION RULE

Adapt expressions into natural ${translateInto}.

Do not preserve English sentence structure if it sounds unnatural.

Examples:

"This changes everything."

Bad:
"이것은 모든 것을 바꾼다."

Good:
"이번 발표는 업계에 큰 변화를 가져올 수 있습니다."

---

IDIOMS AND SLANG

Interpret meaning rather than words.

Examples:

"He's cooking."
→ "지금 엄청 잘하고 있다."

"They are crushing it."
→ "엄청난 성과를 내고 있다."

Never translate idioms literally.

---

TECHNICAL CONTENT

When translating technical content:

* prioritize accuracy
* use terminology commonly used by ${translateInto} professionals
* keep product names unchanged
* keep company names unchanged
* keep technical terms consistent

---

OUTPUT REQUIREMENTS

* Output only the ${translateInto} translation.
* Preserve subtitle order.
* Do not add explanations.
* Do not add notes.
* Do not summarize.
* Translate every subtitle line.
* Maintain readability for real-time subtitle viewing.

Subtitles:

${transcriptText}
`
    });

  return response.output_text;
}