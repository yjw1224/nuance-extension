import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// ============================================================
// 1. Build Concepts
// ============================================================
//
// 기존 conceptCandidate를 기반으로 Concept를 만든다.
// 같은 conceptCandidate는 하나의 Concept으로 통합한다.
//
// 중요:
// - Concept 생성 로직은 RS-007-A의 기존 규칙을 그대로 유지한다.
// - Concept name 자체를 LLM으로 다시 판단하지 않는다.
//


function buildConcepts(segments) {
  const conceptMap = new Map();

  for (const segment of segments) {
    const conceptName = segment.conceptCandidate;

    if (!conceptName) continue;

    const normalizedName = conceptName
      .trim()
      .toLowerCase();

    if (!normalizedName) continue;

    if (!conceptMap.has(normalizedName)) {
      conceptMap.set(normalizedName, {
        name: normalizedName,
        segmentIds: []
      });
    }

    conceptMap
      .get(normalizedName)
      .segmentIds
      .push(segment.id);
  }

  return Array.from(conceptMap.values()).map(
    (concept, index) => ({
      id: `C${String(index + 1).padStart(3, "0")}`,
      name: concept.name,
      segmentIds: concept.segmentIds
    })
  );
}


// ============================================================
// 2. Find first appearance
// ============================================================
//
// Concept의 시간적 순서는
// 해당 Concept가 처음 등장한 Segment의 순서로 결정한다.
//

function orderConceptsByFirstAppearance(
  concepts,
  segments
) {
  const segmentIndex = new Map(
    segments.map((segment, index) => [
      segment.id,
      index
    ])
  );

  return [...concepts].sort((a, b) => {
    const aFirst = Math.min(
      ...a.segmentIds.map(
        id => segmentIndex.get(id)
      )
    );

    const bFirst = Math.min(
      ...b.segmentIds.map(
        id => segmentIndex.get(id)
      )
    );

    return aFirst - bFirst;
  });
}


// // ============================================================
// // 3. Build Temporal Sliding Window
// // ============================================================
// //
// // RS-007-C
// //
// // Window size = 3
// //
// // [C001, C002, C003]
// //       [C002, C003, C004]
// //             [C003, C004, C005]
// //
// // 각 Window 내부의 모든 pair를 후보로 만든다.
// //

// function buildSlidingWindowPairs(
//   orderedConcepts,
//   windowSize = 3
// ) {
//   const pairMap = new Map();

//   for (
//     let start = 0;
//     start <= orderedConcepts.length - windowSize;
//     start++
//   ) {
//     const window = orderedConcepts.slice(
//       start,
//       start + windowSize
//     );

//     for (let i = 0; i < window.length; i++) {
//       for (let j = i + 1; j < window.length; j++) {
//         const a = window[i];
//         const b = window[j];

//         // Pair 자체는 방향이 없는 Candidate Pair.
//         // 실제 방향은 LLM이 판단한다.
//         const key = [a.id, b.id]
//           .sort()
//           .join("|");

//         if (!pairMap.has(key)) {
//           pairMap.set(key, {
//             a: {
//               id: a.id,
//               name: a.name
//             },
//             b: {
//               id: b.id,
//               name: b.name
//             }
//           });
//         }
//       }
//     }
//   }

//   return Array.from(pairMap.values());
// }


// ============================================================
// 4. Prepare Relation Input
// ============================================================
//
// 각 Concept의 Segment text를 함께 전달한다.
//
// Concept name만 주면 semantic evidence가 부족하기 때문에
// Segment text를 유지한다.
//

function buildRelationInput(
  pairs,
  concepts,
  segments
) {
  const conceptMap = new Map(
    concepts.map(concept => [
      concept.id,
      concept
    ])
  );

  const segmentIndex = new Map(
    segments.map((segment, index) => [
      segment.id,
      index
    ])
  );

  // 각 Concept의 최초 등장 Segment index
  const firstAppearance = new Map();

  for (const concept of concepts) {
    const firstIndex = Math.min(
      ...concept.segmentIds.map(
        id => segmentIndex.get(id)
      )
    );

    firstAppearance.set(
      concept.id,
      firstIndex
    );
  }

  return pairs.map(pair => {
    const conceptA =
      conceptMap.get(pair.a.id);

    const conceptB =
      conceptMap.get(pair.b.id);

    const aFirst =
      firstAppearance.get(conceptA.id);

    const bFirst =
      firstAppearance.get(conceptB.id);

    // 두 Concept의 최초 등장 위치를 기준으로
    // temporal neighborhood를 결정한다.
    const startIndex =
      Math.min(aFirst, bFirst);

    const endIndex =
      Math.max(aFirst, bFirst);

    // 두 Concept 사이의 시간 구간에 존재하는
    // 모든 Segment를 evidence로 사용한다.
    const localSegments =
      segments
        .slice(startIndex, endIndex + 1)
        .map(segment => ({
          id: segment.id,
          text: segment.text
        }));

    return {
      pair: {
        a: {
          id: conceptA.id,
          name: conceptA.name
        },

        b: {
          id: conceptB.id,
          name: conceptB.name
        },

        evidence: localSegments
      }
    };
  });
}


// ============================================================
// 5. Main
// ============================================================

export async function inferConceptKnowledge(segments) {

  // --------------------------------
  // 1. Validate input
  // --------------------------------

  if (!Array.isArray(segments) || segments.length === 0) {
    return {
      concepts: [],
      relations: []
    };
  }


  // --------------------------------
  // 2. Build Concepts
  // --------------------------------

  const concepts = buildConcepts(segments);

  if (concepts.length === 0) {
    return {
      concepts: [],
      relations: []
    };
  }


  // --------------------------------
  // 3. Build sliding-window candidate pairs
  // --------------------------------
  //
  // k = 3
  //
  // C001:
  //   C001-C002
  //   C001-C003
  //
  // C002:
  //   C002-C003
  //   C002-C004
  //
  // ...
  //
  // Only concepts within the sliding window are evaluated.
  //

  const WINDOW_SIZE = 3;

  const candidatePairs = [];

  for (
    let i = 0;
    i < concepts.length;
    i++
  ) {

    for (
      let j = i + 1;
      j < Math.min(
        i + WINDOW_SIZE,
        concepts.length
      );
      j++
    ) {

      candidatePairs.push({
        a: concepts[i].id,
        b: concepts[j].id
      });
    }
  }


  if (candidatePairs.length === 0) {
    return {
      concepts,
      relations: []
    };
  }


  // --------------------------------
  // 4. Prepare LLM input
  // --------------------------------
  //
  // Important:
  //
  // Segment text is provided ONCE.
  // Concept data is provided separately.
  // Candidate pairs contain IDs only.
  //

  const segmentInput =
    segments.map(segment => ({
      id: segment.id,
      text: segment.text
    }));


  const conceptInput =
    concepts.map(concept => ({
      id: concept.id,
      name: concept.name,
      segmentIds: concept.segmentIds
    }));


  // --------------------------------
  // 5. Prompt
  // --------------------------------

  const prompt = `
Evaluate the knowledge relation evidence for each provided Concept pair.

Concepts are ordered by their first appearance in the video.

Only evaluate the explicitly provided pairs.
Do not add, remove, merge, rename, reorder, or create Concepts or pairs.

The complete Segment list is provided once and is ordered chronologically.

Each Concept contains:
- id
- name
- segmentIds

The segmentIds identify the parts of the video in which that Concept
is discussed.

Use the Concept names and the relevant Segment text as evidence.

Temporal proximity may help identify relevant explanatory context,
but temporal order or explanation order is never itself a knowledge relation.

For each pair, independently score how strongly the available evidence
supports each of the following three relation definitions.

The three scores are independent.

They do NOT need to sum to 1.

A score represents SUPPORT FOR THE RELATION DEFINITION, not probability.

Score meaning:

0.0 = no supporting evidence
0.25 = weak evidence
0.50 = moderate or ambiguous evidence
0.75 = strong evidence
1.0 = very strong, direct evidence

Use the full 0.0-1.0 range when appropriate.


1. child

Definition:
B is a specific type, subtype, or specialization of A.
B must belong to the conceptual category defined by A.

Decision question:
"Can B truthfully be described as a kind, subtype, or specialization of A?"

Strong child evidence requires a genuine taxonomic or hierarchical
relationship.

Do NOT score child highly when B is:
- a property or characteristic of A
- a process or operation involving A
- a mechanism used by or within A
- a component or feature of A
- a consequence or effect of A
- a use, application, goal, or purpose of A
- an example of A
- merely associated with A
- simply more specific in the current explanation

Important:
Being part of the same system does not imply child.
Being used by A does not imply child.
Being used to explain A does not imply child.

Final test:

"If I say 'B is a type of A', is that conceptually true?"

If not, child support should remain low.


2. causal

Definition:
A causes a specific occurrence, change, or state of B through
a mechanism explicitly supported by the Segment text.

Core criterion:
A's operation or change directly produces, changes, or determines
the occurrence, operation, or state of B.

Decision question:
"Does the Segment text show that when/how A operates or changes,
B consequently occurs or changes?"

Use causal only when the answer is YES.

Do NOT use causal merely because:
- B uses A
- A is a component, tool, or input of B
- A enables, supports, implements, or is required for B
- A and B belong to the same system or process
- A explains, precedes, or is associated with B

These may indicate dependency or functional association,
but are not causal under this definition.

Final check:
"Does A's operation or change directly produce, change,
or determine B's occurrence, operation, or state?"

If not, give a low causal score.

Direction:
A -> B


3. representation

Definition:
A and B are different representations, forms, viewpoints,
or formal descriptions of the same underlying knowledge target.

Both conditions must be satisfied:

1. A and B refer to the same underlying knowledge target.
2. They express that target through different forms,
   representations, or viewpoints.

Do NOT score representation highly for:
- different concepts
- subtypes
- mechanisms
- causes or effects
- consequences
- merely related concepts


SCORING RULES

- Evaluate each pair independently.
- Use Concept names and relevant Segment text as evidence.
- Do not infer a relation from pair adjacency.
- Do not infer a relation merely because two Concepts share a topic.
- Do not infer a relation merely because one Concept helps explain another.
- Do not invent Concepts.
- Do not rename Concepts.
- Do not merge Concepts.
- Score only evidence supported by the provided input.
- Keep the three scores independent.
- Do not make the scores sum to 1.
- A high score requires positive evidence for that specific relation.
- When evidence is absent or contradictory, lower the score.
- Do not compensate for weak evidence in one relation type by increasing
  another relation type.
- Do not treat temporal proximity as causal evidence.


OUTPUT

Return JSON only.

{
  "pairs": [
    {
      "a": "C001",
      "b": "C002",
      "scores": {
        "child": 0.00,
        "causal": 0.00,
        "representation": 0.00
      }
    }
  ]
}

Return exactly one score object for every provided pair.

Do not omit pairs.

INPUT

SEGMENTS:
${JSON.stringify(segmentInput, null, 2)}

CONCEPTS:
${JSON.stringify(conceptInput, null, 2)}

PAIRS:
${JSON.stringify(candidatePairs, null, 2)}
`;


  // --------------------------------
  // 6. LLM
  // --------------------------------

  const response =
    await openai.responses.parse({

      model:
        process.env.OPENAI_LEARNING_MODEL,

      temperature: 0,

      text: {
        format: {
          type: "json_schema",

          name: "concept_relation_scores",

          strict: true,

          schema: {

            type: "object",

            additionalProperties: false,

            properties: {

              pairs: {
                type: "array",

                items: {

                  type: "object",

                  additionalProperties: false,

                  properties: {

                    a: {
                      type: "string"
                    },

                    b: {
                      type: "string"
                    },

                    scores: {

                      type: "object",

                      additionalProperties: false,

                      properties: {

                        child: {
                          type: "number"
                        },

                        causal: {
                          type: "number"
                        },

                        representation: {
                          type: "number"
                        }

                      },

                      required: [
                        "child",
                        "causal",
                        "representation"
                      ]
                    }

                  },

                  required: [
                    "a",
                    "b",
                    "scores"
                  ]
                }
              }

            },

            required: [
              "pairs"
            ]
          }
        }
      },

      input: prompt
    });


  // --------------------------------
  // 7. Validate LLM output
  // --------------------------------

  const validConceptIds =
    new Set(
      concepts.map(
        concept => concept.id
      )
    );


  const candidatePairKeys =
    new Set(
      candidatePairs.map(pair =>
        [pair.a, pair.b]
          .sort()
          .join("|")
      )
    );


  const scoredPairs =
    response.output_parsed?.pairs ?? [];


  // --------------------------------
  // 8. Convert scores → relations
  // --------------------------------

  const RELATION_THRESHOLD = 0.65;
  const RELATION_MARGIN = 0.15;

  const relations = [];


  for (const pair of scoredPairs) {

    const {
      a,
      b,
      scores
    } = pair;


    // Invalid IDs

    if (
      !validConceptIds.has(a) ||
      !validConceptIds.has(b)
    ) {
      continue;
    }


    // Self pair

    if (a === b) {
      continue;
    }


    // Only accept explicitly evaluated pairs

    const pairKey =
      [a, b]
        .sort()
        .join("|");

    if (
      !candidatePairKeys.has(pairKey)
    ) {
      continue;
    }


    // --------------------------------
    // Validate scores
    // --------------------------------

    const childScore =
      Number.isFinite(scores.child)
        ? Math.max(
            0,
            Math.min(1, scores.child)
          )
        : 0;


    const causalScore =
      Number.isFinite(scores.causal)
        ? Math.max(
            0,
            Math.min(1, scores.causal)
          )
        : 0;


    const representationScore =
      Number.isFinite(
        scores.representation
      )
        ? Math.max(
            0,
            Math.min(
              1,
              scores.representation
            )
          )
        : 0;


    const candidates = [

      {
        type: "child",
        score: childScore
      },

      {
        type: "causal",
        score: causalScore
      },

      {
        type: "representation",
        score:
          representationScore
      }

    ];


    // Highest score

    candidates.sort(
      (x, y) =>
        y.score - x.score
    );


    const best =
      candidates[0];

    const second =
      candidates[1];


    // --------------------------------
    // Threshold
    // --------------------------------

    if (
      best.score <
      RELATION_THRESHOLD
    ) {
      continue;
    }


    // --------------------------------
    // Margin
    // --------------------------------

    if (
      best.score -
        second.score <
      RELATION_MARGIN
    ) {
      continue;
    }


    // --------------------------------
    // Direction
    // --------------------------------

    if (
      best.type ===
      "representation"
    ) {

      const [source, target] =
        [a, b].sort();

      relations.push({
        source,
        target,
        type: best.type
      });

      continue;
    }


    // Directed relation

    relations.push({
      source:
        best.type === "child"
          ? b
          : a,

      target:
        best.type === "child"
          ? a
          : b,

      type: best.type
    });

  }


  // --------------------------------
  // 9. Deduplicate relations
  // --------------------------------

  const relationMap = new Map();

  for (const relation of relations) {

    const {
      source,
      target,
      type
    } = relation;


    // --------------------------------
    // Representation
    // --------------------------------
    //
    // Representation is symmetric.
    // C001 <-> C002 is the same relation.
    //

    if (type === "representation") {

      const normalizedKey = [
        source,
        target
      ]
        .sort()
        .join("|");


      if (
        !relationMap.has(
          normalizedKey
        )
      ) {

        const [a, b] = [
          source,
          target
        ].sort();


        relationMap.set(
          normalizedKey,
          {
            source: a,
            target: b,
            type
          }
        );

      }

      continue;
    }


    // --------------------------------
    // Directed relations
    // --------------------------------
    //
    // child / causal preserve direction.
    //
    // C001 -> C002
    // C002 -> C001
    //
    // are different relations at this stage.
    //

    const directedKey =
      `${source}|${target}|${type}`;


    if (
      !relationMap.has(
        directedKey
      )
    ) {

      relationMap.set(
        directedKey,
        {
          source,
          target,
          type
        }
      );

    }

  }


  // --------------------------------
  // 10. Remove reciprocal directed relations
  // --------------------------------
  //
  // Example:
  //
  // C002 -> C003 causal
  // C003 -> C002 causal
  //
  // If both directions exist for the same
  // directed relation type, treat the pair
  // as ambiguous and remove both.
  //

  const finalRelations =
    Array.from(
      relationMap.values()
    ).filter(relation => {

      // Representation is symmetric,
      // so reciprocal checking does not apply.
      if (
        relation.type ===
        "representation"
      ) {
        return true;
      }


      const reverseExists =
        Array.from(
          relationMap.values()
        ).some(other =>
          other.type ===
            relation.type &&
          other.source ===
            relation.target &&
          other.target ===
            relation.source
        );


      return !reverseExists;

    });


  // --------------------------------
  // 10. Return
  // --------------------------------

  return {

    concepts,

    relations: finalRelations

  };

}