import { openai } from "./openai.js";

import { translateInto } from "../data/language.js";
export async function generateContext(
  transcriptSentence
) {
    const transcriptText = transcriptSentence.join("\n");
  const response =
    await openai.responses.create({
      model: "gpt-5-mini",

      input: `
You are a world-class conference interpreter, localization specialist, and contextual language analyst.

Your job is NOT to summarize the video for viewers.

Your job is to create a Translation Context Memory that will be used by another AI system to translate this video's subtitles into natural ${translateInto}.

The goal is not literal translation.

The goal is accurate interpretation of meaning, intent, references, terminology, and context.

Carefully analyze the entire transcript and produce a translation briefing.

Focus especially on contextual disambiguation.

Many words may have multiple meanings. Determine which meaning is being used in THIS video and establish translation rules accordingly.

Your output must contain the following sections.

---

VIDEO BRIEF

* What is the video primarily about?
* What domain does it belong to?
  (technology, AI, investing, crypto, business, science, gaming, entertainment, politics, education, etc.)
* What is the overall tone?
  (technical, educational, conversational, interview, persuasive, humorous, analytical, etc.)

---

KEY ENTITIES

List important:

* people
* companies
* organizations
* products
* technologies
* events

that appear repeatedly or are important to understanding the video.

---

TERM DISAMBIGUATION

This is the most important section.

Identify words or phrases that could have multiple meanings.

For each term provide:

Term:
Meaning in this video:
Incorrect interpretations to avoid:
Recommended ${translateInto} interpretation:

Example:

Term: Agent
Meaning in this video: AI autonomous software agent
Incorrect interpretations: representative, secret agent, salesperson
Recommended ${translateInto} interpretation: AI 에이전트

Only include terms that are genuinely important for translation quality.

---

TRANSLATION RULES

Generate concrete rules that a ${translateInto} translator should follow.

Examples:

* Keep product names untranslated.
* Use common ${translateInto} AI terminology.
* Prefer interpretation over literal translation.
* Preserve technical meaning over conversational wording.
* Avoid word-for-word translation of idioms.
* Maintain consistent terminology throughout the video.

Only include rules that are relevant to THIS transcript.

---

POTENTIAL TRAPS

Identify:

* idioms
* slang
* jokes
* metaphors
* culture-specific references
* ambiguous phrases

that may cause mistranslation.

Explain what they actually mean in the context of this video.

---

OUTPUT REQUIREMENTS

* Be concise.
* Prioritize translation usefulness over summarization.
* Do not explain your reasoning process.
* Produce a translator briefing, not a viewer summary.
* Maximum 600 words.

Transcript:

${transcriptText}
`
    });

  return response.output_text;
}