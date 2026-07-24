export default function mapObservationsToBehavior(observations, mapping) {

    const scores = {};

    for (const observation of observations) {

        const rules = mapping[observation];
        if (!rules) continue;

        for (const rule of rules) {

            const weight = rule.role * rule.evidence;

            scores[rule.bfId] ??= 0;
            scores[rule.bfId] += weight;

        }

    }

    return scores;

}