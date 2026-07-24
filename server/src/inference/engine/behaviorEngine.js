import * as scoreEngine from "./scoreEngine.js";
import observationToBehaviorMapping from "../generated/observationBehaviorMapping.json" with { type: "json" };

function infer(observations) {

    return scoreEngine.fromObservations(
        observations,
        observationToBehaviorMapping
    );

}

export default {
    infer
};