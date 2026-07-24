import behaviorEngine from "./behaviorEngine.js";
import stateEngine from "./stateEngine.js";

function infer(observations) {

    const behavior = behaviorEngine.infer(
        observations
    );

    const state = stateEngine.infer(
        behavior
    );

    return {
        behavior,
        state
    };

}

export default {
    infer
};