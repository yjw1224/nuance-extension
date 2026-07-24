import * as scoreEngine from "./scoreEngine.js";
import behaviorToStateMapping from "../generated/behaviorFunctionStateMapping.json" with { type: "json"};

function infer(behavior) {

    return scoreEngine.fromBehaviors(
        behavior.scores,
        behaviorToStateMapping
    );

}

export default {
    infer
};