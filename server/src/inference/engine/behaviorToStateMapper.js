export default function mapBehaviorToState(behaviorScores, mapping) {

    const scores = {};

    for (const [bfId, bfScore] of Object.entries(behaviorScores)) {

        const rules = mapping[bfId];
        if (!rules) continue;

        for (const rule of rules) {

            const weight = bfScore * rule.role;

            scores[rule.stateId] ??= 0;
            scores[rule.stateId] += weight;

        }

    }

    return scores;

}