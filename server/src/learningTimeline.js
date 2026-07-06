import { openai } from "./openai.js";

/** GPT가 핵심 개념을 의미적으로 추출하는 함수 */
async function generateRawConcepts(
  transcript
) {

  const transcriptText =
    JSON.stringify(

      transcript.map(
        sentence => ({
          sentenceId:
            sentence.sentenceId,
          text:
            sentence.text
        })
      ),

      null,

      2

    );

  const response =
    await openai.responses.parse({

      model:
        process.env.OPENAI_LEARNING_MODEL,

      temperature: 0,

      text: {

        format: {

          type:
            "json_schema",

          name:
            "investment_concepts",

          strict: true,

          schema: {

            type: "object",

            additionalProperties:
              false,

            properties: {

              concepts: {

                type: "array",

                items: {

                  type: "object",

                  additionalProperties:
                    false,

                  properties: {

                    concept: {
                      type: "string"
                    },

                    parentConcept: {
                      type: [
                        "string",
                        "null"
                      ]
                    },

                    startSentenceId: {
                      type:
                        "integer"
                    },

                    endSentenceId: {
                      type:
                        "integer"
                    },

                    unlockValue: {
                      type:
                        "integer"
                    },

                    centrality: {
                      type:
                        "integer"
                    },

                    abstraction: {
                      type:
                        "integer"
                    },

                    reason: {
                      type:
                        "string"
                    }

                  },

                  required: [

                    "concept",

                    "parentConcept",

                    "startSentenceId",

                    "endSentenceId",

                    "unlockValue",

                    "centrality",

                    "abstraction",

                    "reason"

                  ]

                }

              }

            },

            required: [

              "concepts"

            ]

          }

        }

      },

      input: `You are creating a Learning Timeline for an educational video.
Analyze the ENTIRE transcript.
Your goal is to predict where a learner is most likely to struggle.

Extract all plausible Investment Concepts before ranking or filtering them.

Prefer recall over precision.
It is better to include a plausible candidate than to omit one.
Do not optimize for the final number of concepts.

Some extracted concepts may later be filtered by downstream processing.
Focus on identifying all plausible investment concepts.

An Investment Concept is a concept that the learner must understand, not merely recognize.
The video's main idea may itself be an Investment Concept if it is substantially explained.

Understanding an Investment Concept should either:

* unlock understanding of multiple later concepts, or
* be essential for understanding the video's core idea.
* Prefer concepts that represent what this video uniquely teaches, not concepts that only provide background context.

Do not infer a broader concept that is not explicitly discussed in the transcript.

For every extracted concept:

* concept must be a concise noun or noun phrase (1-4 words)
* if the concept is explicitly named in the transcript, use that exact name; otherwise use its canonical name
* do not replace a specific concept with a broader concept
* identify the explanation interval that covers the complete explanation of the concept
* include the main explanation, not just the sentence where the concept is first introduced
* end the interval when the explanation is complete or the discussion clearly shifts to another main concept
* identify a parentConcept only when the concept is explained entirely as a subsection of another extracted concept; otherwise return null
* return null if the concept could reasonably stand as its own lesson

Do not use parentConcept simply because one concept contributes to another.

Return null if:

* the child could reasonably be taught as an independent lesson
* you are uncertain

Do NOT extract:

* concepts the learner only needs to recognize
* examples
* conclusions
* concepts that summarize previous explanations instead of enabling later understanding

Scores

unlockValue (0-10)

How much understanding this concept unlocks the rest of the video.

Score high only when understanding this concept enables understanding of many later explanations.

Do not score based on frequency, importance, or the video's topic.

centrality (0-10)

How essential this concept is to explaining the video's main idea.

Do not assign a high score merely because the concept is the video's topic, title, or repeatedly mentioned.

abstraction (0-10)

How much background knowledge or abstract thinking is required.

Use the full 0-10 scale.

reason must be 2-5 words.

Return a comprehensive candidate set.

Input:

${transcriptText}`

    });

  console.log(
    "\n=== RAW CONCEPTS ==="
  );

  console.log(
    JSON.stringify(
      response.output_parsed.concepts,
      null,
      2
    )
  );

  return {

    concepts:
      response.output_parsed.concepts,

    usage:
      response.usage

  };

}

/** gpt가 만든 parentConcept이 gpt가 뽑은 개념 내에 있는지 검증 */
function validateParentConcepts(
  concepts
) {

  const conceptSet =
    new Set(

      concepts.map(
        concept =>
          concept.concept
      )

    );

  return concepts.map(
    concept => {

      // 부모가 없으면 그대로
      if (
        concept.parentConcept === null
      ) {
        return concept;
      }

      // 자기 자신을 부모로 가지면 제거
      if (
        concept.parentConcept ===
        concept.concept
      ) {

        return {

          ...concept,

          parentConcept: null

        };

      }

      // 존재하지 않는 부모면 제거
      if (

        !conceptSet.has(
          concept.parentConcept
        )

      ) {

        return {

          ...concept,

          parentConcept: null

        };

      }

      return concept;

    }

  );

}

/** 개념의 상하 관계를 파악하여 merge하는 함수 */
function mergeParentConcepts(
  concepts
) {

  const conceptMap =
    new Map();

  // 부모 조회용 Map 생성
  concepts.forEach(
    concept => {

      conceptMap.set(
        concept.concept,
        {
          ...concept,
          children: []
        }
      );

    }
  );

  // child → parent 병합
  concepts.forEach(
    concept => {

      if (
        concept.parentConcept === null
      ) {
        return;
      }

      const parent =
        conceptMap.get(
          concept.parentConcept
        );

      if (!parent) {
        return;
      }

      // 설명 범위 확장
      parent.startSentenceId =
        Math.min(
          parent.startSentenceId,
          concept.startSentenceId
        );

      parent.endSentenceId =
        Math.max(
          parent.endSentenceId,
          concept.endSentenceId
        );

      // 점수는 가장 높은 값 반영
      parent.unlockValue =
        Math.max(
          parent.unlockValue,
          concept.unlockValue
        );

      parent.centrality =
        Math.max(
          parent.centrality,
          concept.centrality
        );

      parent.abstraction =
        Math.max(
          parent.abstraction,
          concept.abstraction
        );

      // Navigation용 하위 개념
      parent.children.push({

        concept:
          concept.concept,

        startSentenceId:
          concept.startSentenceId,

        endSentenceId:
          concept.endSentenceId,

        sentenceCount:
          concept.endSentenceId -
          concept.startSentenceId +
          1

      });

    }
  );

  // 하위 개념 정렬
  conceptMap.forEach(
    concept => {

      concept.children.sort(

        (a, b) =>

          a.startSentenceId -
          b.startSentenceId

      );

    }
  );

  // parent만 반환
  return Array.from(
    conceptMap.values()
  )
  .filter(
    concept =>
      concept.parentConcept === null
  )
  .map(
    ({
      parentConcept,
      ...timeline
    }) => timeline
  );

}

/** 세 분야의 점수를 합산하여 최종 투자 점수 계산 */
function calculateInvestmentScore(
  timeline
) {

  return timeline.map(
    concept => ({

      ...concept,

      investmentScore:

        concept.unlockValue +

        concept.centrality +

        concept.abstraction

    })
  );

}

/** 점수순, 시간순으로 정렬 */
function finalizeTimeline(
  timeline
) {

  return [...timeline].sort(

    (a, b) =>

      b.investmentScore -

      a.investmentScore ||

      a.startSentenceId -

      b.startSentenceId

  );

}

/** 모든 파이프라인을 연결한 최종 실행 함수 */
export async function generateLearningTimeline(
  transcript
) {

  // 1. GPT
  const {

    concepts,

    usage

  } =
    await generateRawConcepts(
      transcript
    );

  // 2. parent 검증
  const validated =
    validateParentConcepts(
      concepts
    );

  // 3. parent 병합
  const merged =
    mergeParentConcepts(
      validated
    );

  // 4. 투자 점수 계산
  const scored =
    calculateInvestmentScore(
      merged
    );

  // 5. 최종 정렬
  let timeline =
    finalizeTimeline(
      scored
    );

  console.log(
    "\n=== LEARNING TIMELINE ===\n"
  );

  console.log(
    JSON.stringify(
      timeline,
      null,
      2
    )
  );

  console.log(
    "\n=== LEARNING USAGE ===\n"
  );

  console.log(
    JSON.stringify(
      usage,
      null,
      2
    )
  );

  console.log(
    "\n=== TIMELINE 원본 ===\n"
  );
  console.log(JSON.stringify(timeline, null, 2));

  timeline =
    filterTimeline(
        timeline,
        transcript.length
    );

  return {

    timeline,

    usage

  };

}

function filterTimeline(
  timeline,
  sentenceCount
) {

  if (timeline.length === 0) {
    return timeline;
  }

  // ==========================
  // 1. Remove overlaps
  // ==========================

  const filtered = [];

  for (const candidate of timeline) {

    let overlapped = false;

    for (const kept of filtered) {

      const overlapStart =
        Math.max(
          candidate.startSentenceId,
          kept.startSentenceId
        );

      const overlapEnd =
        Math.min(
          candidate.endSentenceId,
          kept.endSentenceId
        );

      if (
        overlapEnd <
        overlapStart
      ) {
        continue;
      }

      const overlap =
        overlapEnd -
        overlapStart +
        1;

      const candidateLength =
        candidate.endSentenceId -
        candidate.startSentenceId +
        1;

      if (

        overlap /
        candidateLength >=
        0.6

      ) {

        overlapped = true;

        break;

      }

    }

    if (!overlapped) {

      filtered.push(
        candidate
      );

    }

  }

  // ==========================
  // 2. Base Score (with 가중치)
  // ==========================

  for (const item of filtered) {

    item.effectiveScore =

        item.centrality * 1.3
      + item.unlockValue * 1.2
      + item.abstraction;

  }

  // ==========================
  // 2. Semantic Penalty
  // ==========================

  const examplePatterns = [

    "example",

    "illustration",

    "instance",

    "case"

  ];

  for (const item of filtered) {

    const text = (

      item.concept +
      " " +
      item.reason

    ).toLowerCase();

    let penalty = 0;

    if (

      examplePatterns.some(

        pattern =>

          text.includes(pattern)

      )

    ) {

      penalty += 2;

    }

    item.effectiveScore -=
      penalty;

  }

  // recognize penalty (짤막한 단순 주제 언급 개념은 감점)

  const recognizePatterns = [

    "core topic",

    "video topic",

    "overall",

    "introduction",

    "subject"

  ];

  for (const item of filtered) {

    const reason =
      item.reason.toLowerCase();

    if (

      recognizePatterns.some(

        pattern =>

          reason.includes(pattern)

      )

    ) {

      item.effectiveScore -= 1.5;

    }

  }

  // ==========================
  // 3. Coverage Filter (이웃한 비슷한, 덜 중요한 개념은 삭제)
  // ==========================

  // 점수 높은 순으로 먼저 대표 개념 선정
  filtered.sort(

    (a, b) =>

      b.effectiveScore -
      a.effectiveScore

  );

  const covered = [];

  for (const candidate of filtered) {

    const candidateLength =

      candidate.endSentenceId -
      candidate.startSentenceId +
      1;

    let redundant = false;

    for (const kept of covered) {

      const keptLength =

        kept.endSentenceId -
        kept.startSentenceId +
        1;

      // 대표 개념 대비 길이 비율
      const coverageRatio =

        candidateLength /
        keptLength;

      // 두 설명 구간 사이 거리
      const distance = Math.min(

        Math.abs(
          candidate.startSentenceId -
          kept.endSentenceId
        ),

        Math.abs(
          kept.startSentenceId -
          candidate.endSentenceId
        )

      );

      // 대표 개념 길이를 기준으로 상대 거리 계산
      const distanceRatio =

        distance /
        keptLength;

      // 점수 차이
      const scoreGap =

        kept.effectiveScore -
        candidate.effectiveScore;

      if (

        // 대표 개념의 20% 이하 크기
        coverageRatio <= 0.20 &&

        // 거의 같은 학습 구간
        distanceRatio <= 0.50 &&

        // 대표 개념이 의미 있게 더 중요
        scoreGap >= 2

      ) {

        redundant = true;

        break;

      }

    }

    if (!redundant) {

      covered.push(
        candidate
      );

    }

  }

  // ==========================
  // 4. Relative score cut
  // ==========================

  const maxScore =
    covered[0]
      .effectiveScore;

  const minScore =
    maxScore - 6;

  let result =
    covered.filter(

      item =>

        item.effectiveScore >=
        minScore

    );

  // ==========================
  // 5. Density limit
  // ==========================

  // result =
  //   result.slice(
  //     0,
  //     maxConcepts
  //   );

  return result;

}