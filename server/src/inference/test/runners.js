import scenarios from "./scenarios.js";

import inferenceEngine from '../engine/inferenceEngine.js'

for (const scenario of scenarios.slice(0,10)) {

    console.log("=".repeat(80));
    console.log(`${scenario.id} | ${scenario.name}`);
    console.log(scenario.description);
    console.log();

    const result = inferenceEngine.infer(
        scenario.observations
    );

    console.log("Expected");
    console.log(scenario.expected);
    console.log();

    console.log("Behavior");
    console.table(result.behavior.scores);
    console.log("Ranking:", result.behavior.ranking);
    console.log();

    console.log("State");
    console.table(result.state.scores);
    console.log("Ranking:", result.state.ranking);
    console.log();

}