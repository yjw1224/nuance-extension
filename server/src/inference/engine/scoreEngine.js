import mapObservationsToBehavior from "./observationToBehaviorMapper.js";
import mapBehaviorToState from "./behaviorToStateMapper.js";

export function fromObservations(observations, mapping) {

    const scores = normalize(
        mapObservationsToBehavior(observations, mapping)
    );

    return {
        scores,
        ranking: sort(scores)
    };

}

export function fromBehaviors(inputScores, mapping) {

    const scores = normalize(
        mapBehaviorToState(inputScores, mapping)
    );

    return {
        scores,
        ranking: sort(scores)
    };

}

function normalize(scores) {

    const total = Object.values(scores)
        .reduce((sum, value) => sum + value, 0);

    if (total === 0) {
        return scores;
    }

    return Object.fromEntries(
        Object.entries(scores).map(([key, value]) => [
            key,
            value / total
        ])
    );

}

function sort(scores) {

    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);

}