export type Score = 0|1|2|3|4|5|6|7|8|9|10;

/** 투자 가치 점수표 인터페이스 */
interface InvestmentRubric {
    /** 0 ~ 10 사이의 정수 */
    score: Score;
    /** 그렇게 중요도를 판단한 이유 */
    reason: string;
}

/** 이해 투자 가치가 있는 개념 */
export interface InvestmentConcept {

    /** 내부 식별자 */
    id: string;

    /** 개념명 */
    name: string;

    /** 한 줄 설명 */
    description: string;

    /** 사용자가 이 개념에서 무엇을 이해해야 하는가 */
    learningObjective: string;

    // ---------- Investment Rubric ----------

    /** 이후 내용이 얼마나 이 개념에 의존하는가 */
    dependency: InvestmentRubric;

    /** 영상의 지식 구조에서 얼마나 중심적인가 */
    centrality: InvestmentRubric;

    /** 배경지식이 얼마나 필요한가 */
    abstraction: InvestmentRubric;

    /** 종합 판단 */
    importanceReason: string;
}

/** 청크별로 뽑는 중요 개념 후보 */
export interface ConceptCandidate {

    name: string;

    selectionReason: string;

    sentenceId: number;

    chunkId: number;

}