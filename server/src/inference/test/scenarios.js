/*
BF-0xx  Pure BF

BF-1xx  Pair BF

BF-2xx  Triple BF

BF-3xx  Balanced (Low Confidence Expectation)

BF-4xx  Edge Case

BF-9xx  Bug Case (Regression)
*/

export default
[
    {
        id: "BF-001",

        name: "Pure Verify",

        description: "Repeated review of previously watched content.",

        observations: [
            "seekBackward",
            "replay",
            "replayCount",
            "backwardRatio"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "verify"
            ]
        }
    },

    {
        id: "BF-002",

        name: "Pure Explore",

        description: "Searching for new information through transcript and concepts.",

        observations: [
            "transcriptOpen",
            "transcriptSearch",
            "transcriptScroll",
            "conceptSearch"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore"
            ]
        }
    },

    {
        id: "BF-003",

        name: "Pure Process",

        description: "Long internal processing while watching.",

        observations: [
            "pauseDuration",
            "resumeDelay",
            "conceptReadingTime"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "process"
            ]
        }
    },

    {
        id: "BF-004",

        name: "Pure Connect",

        description: "Connecting multiple concepts together.",

        observations: [
            "conceptNavigation",
            "backToConcept",
            "conceptRevisitCount"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "connect"
            ]
        }
    },

    {
        id: "BF-005",

        name: "Pure Externalize",

        description: "Externalizing understanding through annotations.",

        observations: [
            "highlight",
            "chatQuestion"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "externalize"
            ]
        }
    },

    {
        id: "BF-006",

        name: "Pure Monitor",

        description: "Monitoring learning state and attention.",

        observations: [
            "returnTime",
            "windowBlur",
            "tabHidden",
            "browserMinimized"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "monitor"
            ]
        }
    },

    {
        id: "BF-101",

        name: "Explore + Verify",

        description: "Searching for information and immediately verifying it.",

        observations: [
            "transcriptSearch",
            "transcriptClick",
            "seekBackward",
            "replay"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore",
                "verify"
            ]
        }
    },

    {
        id: "BF-102",

        name: "Explore + Process",

        description: "Finding information and spending time processing it.",

        observations: [
            "conceptOpen",
            "transcriptSearch",
            "pauseDuration",
            "conceptReadingTime"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore",
                "process"
            ]
        }
    },

    {
        id: "BF-103",

        name: "Explore + Connect",

        description: "Exploring concepts and navigating between them.",

        observations: [
            "conceptOpen",
            "conceptNavigation",
            "conceptSearch",
            "backToConcept"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore",
                "connect"
            ]
        }
    },

    {
        id: "BF-104",

        name: "Explore + Externalize",

        description: "Searching while taking notes or asking questions.",

        observations: [
            "conceptSearch",
            "transcriptSearch",
            "highlight",
            "chatQuestion"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore",
                "externalize"
            ]
        }
    },
    {
        id: "BF-105",

        name: "Explore + Monitor",

        description: "Monitoring understanding while actively searching for missing information.",

        observations: [
            "conceptSearch",
            "transcriptSearch",
            "pauseDuration",
            "returnTime"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore",
                "monitor"
            ]
        }
    },

    {
        id: "BF-106",

        name: "Verify + Process",

        description: "Replaying difficult content and spending time processing it.",

        observations: [
            "seekBackward",
            "replay",
            "pauseDuration",
            "resumeDelay"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "verify",
                "process"
            ]
        }
    },

    {
        id: "BF-107",

        name: "Verify + Connect",

        description: "Reviewing previous concepts while relating them to one another.",

        observations: [
            "backToConcept",
            "conceptNavigation",
            "replayCount",
            "conceptRevisitCount"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "verify",
                "connect"
            ]
        }
    },

    {
        id: "BF-108",

        name: "Verify + Externalize",

        description: "Confirming understanding before recording or asking about it.",

        observations: [
            "seekBackward",
            "replay",
            "highlight",
            "chatQuestion"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "verify",
                "externalize"
            ]
        }
    },

    {
        id: "BF-109",

        name: "Verify + Monitor",

        description: "Repeatedly checking difficult content while monitoring comprehension.",

        observations: [
            "seekBackward",
            "replayCount",
            "pauseDuration",
            "windowBlur"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "verify",
                "monitor"
            ]
        }
    },

    {
        id: "BF-110",

        name: "Process + Connect",

        description: "Thinking deeply while organizing relationships between concepts.",

        observations: [
            "pauseDuration",
            "conceptReadingTime",
            "conceptNavigation",
            "backToConcept"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "process",
                "connect"
            ]
        }
    },

    {
        id: "BF-111",

        name: "Process + Externalize",

        description: "Processing information before expressing it externally.",

        observations: [
            "pauseDuration",
            "conceptReadingTime",
            "highlight",
            "chatQuestion"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "process",
                "externalize"
            ]
        }
    },

    {
        id: "BF-112",

        name: "Process + Monitor",

        description: "Reflecting while monitoring personal learning progress.",

        observations: [
            "pauseDuration",
            "resumeDelay",
            "returnTime",
            "windowBlur"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "process",
                "monitor"
            ]
        }
    },

    {
        id: "BF-113",

        name: "Connect + Externalize",

        description: "Building relationships between concepts and documenting them.",

        observations: [
            "conceptNavigation",
            "conceptRevisitCount",
            "highlight",
            "chatQuestion"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "connect",
                "externalize"
            ]
        }
    },

    {
        id: "BF-114",

        name: "Connect + Monitor",

        description: "Reorganizing concept relationships while checking learning progress.",

        observations: [
            "conceptNavigation",
            "backToConcept",
            "returnTime",
            "pauseDuration"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "connect",
                "monitor"
            ]
        }
    },
    
    {
        id: "BF-201",

        name: "First Encounter with a Difficult Concept",

        description: "The learner encounters an unfamiliar concept and begins exploring it.",

        observations: [
            "conceptOpen",
            "conceptSearch",
            "transcriptSearch",
            "pauseDuration",
            "conceptReadingTime"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore",
                "process",
                "monitor"
            ]
        }
    },

    {
        id: "BF-202",

        name: "Trying to Understand a Difficult Explanation",

        description: "The learner repeatedly reviews an explanation and thinks about it.",

        observations: [
            "seekBackward",
            "replay",
            "pauseDuration",
            "resumeDelay",
            "replayCount"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "verify",
                "process",
                "monitor"
            ]
        }
    },

    {
        id: "BF-203",

        name: "Comparing Multiple Concepts",

        description: "The learner moves back and forth between related concepts.",

        observations: [
            "conceptNavigation",
            "backToConcept",
            "conceptRevisitCount",
            "conceptReadingTime"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "connect",
                "verify",
                "process"
            ]
        }
    },

    {
        id: "BF-204",

        name: "Searching Before Asking",

        description: "The learner searches independently before asking a question.",

        observations: [
            "transcriptSearch",
            "conceptSearch",
            "highlight",
            "chatQuestion"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore",
                "externalize",
                "monitor"
            ]
        }
    },

    {
        id: "BF-205",

        name: "Building a Mental Model",

        description: "The learner studies multiple concepts and connects them together.",

        observations: [
            "conceptOpen",
            "conceptNavigation",
            "conceptReadingTime",
            "backToConcept",
            "conceptRevisitCount"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "connect",
                "process",
                "explore"
            ]
        }
    },

    {
        id: "BF-206",

        name: "Checking AI Answer",

        description: "The learner verifies an AI response against the original video.",

        observations: [
            "chatQuestion",
            "seekBackward",
            "replay",
            "transcriptClick",
            "highlight"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "verify",
                "externalize",
                "explore"
            ]
        }
    },

    {
        id: "BF-207",

        name: "Preparing Personal Notes",

        description: "The learner organizes important information while studying.",

        observations: [
            "highlight",
            "conceptNavigation",
            "conceptReadingTime",
            "backToConcept"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "externalize",
                "connect",
                "process"
            ]
        }
    },

    {
        id: "BF-208",

        name: "Returning After an Interruption",

        description: "The learner comes back after leaving and reviews what was missed.",

        observations: [
            "windowBlur",
            "returnTime",
            "seekBackward",
            "replay"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "monitor",
                "verify"
            ]
        }
    },

    {
        id: "BF-209",

        name: "Deep Concept Exploration",

        description: "The learner thoroughly investigates a concept from multiple sources.",

        observations: [
            "conceptSearch",
            "transcriptSearch",
            "conceptOpen",
            "conceptNavigation",
            "conceptReadingTime"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore",
                "connect",
                "process"
            ]
        }
    },

    {
        id: "BF-210",

        name: "Explaining to Yourself",

        description: "The learner verifies understanding before expressing it externally.",

        observations: [
            "seekBackward",
            "highlight",
            "chatQuestion",
            "conceptRevisitCount"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "verify",
                "externalize",
                "connect"
            ]
        }
    },

    {
        id: "BF-211",

        name: "Exam Review",

        description: "The learner intensively reviews previously learned material before an exam.",

        observations: [
            "seekBackward",
            "replay",
            "replayCount",
            "backwardRatio",
            "pauseDuration",
            "highlight"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "verify",
                "process",
                "externalize"
            ]
        }
    },

    {
        id: "BF-212",

        name: "Mastering a Difficult Topic",

        description: "The learner repeatedly studies, connects, and organizes a difficult topic.",

        observations: [
            "conceptNavigation",
            "backToConcept",
            "conceptRevisitCount",
            "seekBackward",
            "pauseDuration",
            "highlight",
            "chatQuestion"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "connect",
                "verify",
                "externalize"
            ]
        }
    },

    {
        id: "BF-213",

        name: "Full Learning Cycle",

        description: "A complete learning session from exploration to understanding.",

        observations: [
            "conceptSearch",
            "conceptOpen",
            "transcriptSearch",
            "seekBackward",
            "replay",
            "pauseDuration",
            "conceptNavigation",
            "backToConcept",
            "highlight",
            "chatQuestion",
            "conceptRevisitCount"
        ],

        expected: {
            dominantBehaviorFunctions: [
                "explore",
                "verify",
                "process",
                "connect",
                "externalize"
            ]
        }
    },

    {
        id: "BF-301",

        name: "Verify vs Process Boundary",

        description: "Repeated verification gradually turns into deep processing.",

        observations: [
        "seekBackward",
        "replay",
        "pauseDuration",
        "resumeDelay",
        "conceptReadingTime"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "verify",
            "process"
        ]
        }
    },

    {
        id: "BF-302",

        name: "Explore vs Verify Boundary",

        description: "The learner searches for information while repeatedly checking the original content.",

        observations: [
        "transcriptSearch",
        "conceptSearch",
        "seekBackward",
        "transcriptClick",
        "replay"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore",
            "verify"
        ]
        }
    },

    {
        id: "BF-303",

        name: "Explore vs Connect Boundary",

        description: "Searching and navigating between related concepts in nearly equal proportion.",

        observations: [
        "conceptSearch",
        "conceptOpen",
        "conceptNavigation",
        "backToConcept",
        "conceptRevisitCount"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore",
            "connect"
        ]
        }
    },

    {
        id: "BF-304",

        name: "Process vs Connect Boundary",

        description: "Thinking deeply while repeatedly reorganizing conceptual relationships.",

        observations: [
        "pauseDuration",
        "conceptReadingTime",
        "conceptNavigation",
        "backToConcept",
        "resumeDelay"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "process",
            "connect"
        ]
        }
    },

    {
        id: "BF-305",

        name: "Connect vs Externalize Boundary",

        description: "Organizing concepts before immediately asking a question.",

        observations: [
        "conceptNavigation",
        "conceptRevisitCount",
        "highlight",
        "chatQuestion",
        "backToConcept"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "connect",
            "externalize"
        ]
        }
    },

    {
        id: "BF-306",

        name: "Verify vs Monitor Boundary",

        description: "Frequent verification while attention is repeatedly interrupted.",

        observations: [
        "seekBackward",
        "replayCount",
        "windowBlur",
        "returnTime",
        "pauseDuration"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "verify",
            "monitor"
        ]
        }
    },

    {
        id: "BF-307",

        name: "Balanced Explore-Verify-Process",

        description: "Searching, checking, and thinking occur almost equally.",

        observations: [
        "conceptSearch",
        "transcriptSearch",
        "seekBackward",
        "pauseDuration",
        "resumeDelay",
        "replay"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore",
            "verify",
            "process"
        ]
        }
    },

    {
        id: "BF-308",

        name: "Balanced Verify-Connect-Externalize",

        description: "The learner verifies understanding, connects concepts, and immediately expresses questions.",

        observations: [
        "seekBackward",
        "conceptNavigation",
        "backToConcept",
        "highlight",
        "chatQuestion"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "verify",
            "connect",
            "externalize"
        ]
        }
    },

    {
        id: "BF-309",

        name: "Weak Multi-Behavior Session",

        description: "Several learning behaviors appear weakly without a clear dominant pattern.",

        observations: [
        "conceptSearch",
        "seekBackward",
        "pauseDuration",
        "conceptNavigation",
        "highlight",
        "windowBlur"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore",
            "verify",
            "process",
            "connect",
            "externalize",
            "monitor"
        ]
        }
    },

    {
        id: "BF-310",

        name: "Fully Balanced Learning Session",

        description: "A carefully balanced session where all six behavior functions appear with similar strength.",

        observations: [
        "conceptSearch",
        "seekBackward",
        "pauseDuration",
        "conceptNavigation",
        "highlight",
        "windowBlur",
        "returnTime",
        "chatQuestion",
        "resumeDelay",
        "backToConcept"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore",
            "verify",
            "process",
            "connect",
            "externalize",
            "monitor"
        ]
        }
    },
    {
        id: "BF-401",

        name: "Empty Session",

        description: "No observable learning behavior.",

        observations: [],

        expected: {
        dominantBehaviorFunctions: []
        }
    },

    {
        id: "BF-402",

        name: "Single Observation",

        description: "Only one observation is available.",

        observations: [
        "windowSwitch"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "externalize"
        ]
        }
    },

    {
        id: "BF-403",

        name: "Minimal Activity",

        description: "Very limited evidence from only two observations.",

        observations: [
        "conceptOpen",
        "pauseDuration"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore",
            "process"
        ]
        }
    },

    {
        id: "BF-404",

        name: "Seek Loop",

        description: "The learner continuously seeks backward without other actions.",

        observations: [
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward",
        "seekBackward"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "verify"
        ]
        }
    },

    {
        id: "BF-405",

        name: "Pause Loop",

        description: "Extremely long thinking without any additional interaction.",

        observations: [
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration",
        "pauseDuration"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "process"
        ]
        }
    },

    {
        id: "BF-406",

        name: "Question Loop",

        description: "The learner repeatedly asks questions without interacting with the video.",

        observations: [
        "chatQuestion",
        "chatQuestion",
        "chatQuestion",
        "chatQuestion",
        "chatQuestion",
        "chatQuestion",
        "chatQuestion",
        "chatQuestion",
        "chatQuestion",
        "chatQuestion"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "externalize"
        ]
        }
    },

    {
        id: "BF-407",

        name: "Blur Loop",

        description: "The learner repeatedly leaves the page.",

        observations: [
        "windowBlur",
        "windowBlur",
        "windowBlur",
        "windowBlur",
        "windowBlur"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "monitor"
        ]
        }
    },

    {
        id: "BF-408",

        name: "Hidden Tab Loop",

        description: "The browser tab repeatedly becomes hidden.",

        observations: [
        "tabHidden",
        "tabHidden",
        "tabHidden",
        "tabHidden"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "monitor"
        ]
        }
    },

    {
        id: "BF-409",

        name: "Interrupted Verification",

        description: "Frequent interruptions while repeatedly checking content.",

        observations: [
        "windowBlur",
        "seekBackward",
        "returnTime",
        "seekBackward",
        "windowBlur",
        "replay"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "verify",
            "monitor"
        ]
        }
    },

    {
        id: "BF-410",

        name: "Question Before Learning",

        description: "The learner asks a question before reviewing the original content.",

        observations: [
        "chatQuestion",
        "seekBackward",
        "conceptOpen",
        "replay"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "externalize",
            "verify",
            "explore"
        ]
        }
    },

    {
        id: "BF-411",

        name: "Search Without Engagement",

        description: "The learner repeatedly searches but never meaningfully engages with the content.",

        observations: [
        "conceptSearch",
        "transcriptSearch",
        "conceptSearch",
        "transcriptSearch",
        "conceptSearch"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore"
        ]
        }
    },

    // {
    //     id: "BF-412",

    //     name: "Highlight Everything",

    //     description: "The learner highlights excessively without reviewing or connecting information.",

    //     observations: [
    //     "highlight",
    //     "highlight",
    //     "highlight",
    //     "highlight",
    //     "highlight"
    //     ],

    //     expected: {
    //     dominantBehaviorFunctions: [
    //         "externalize"
    //     ]
    //     }
    // },

    {
        id: "BF-413",

        name: "Concept Hopping",

        description: "The learner continuously navigates between concepts without reviewing the video.",

        observations: [
        "conceptNavigation",
        "backToConcept",
        "conceptNavigation",
        "backToConcept",
        "conceptNavigation",
        "conceptRevisitCount"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "connect"
        ]
        }
    },

    {
        id: "BF-414",

        name: "Transcript Only",

        description: "The learner relies entirely on the transcript instead of the video.",

        observations: [
        "transcriptOpen",
        "transcriptScroll",
        "transcriptSearch",
        "transcriptClick",
        "transcriptScroll"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore"
        ]
        }
    },

    {
        id: "BF-415",

        name: "Concept Browser",

        description: "The learner browses only concept pages without interacting with the video.",

        observations: [
        "conceptOpen",
        "conceptNavigation",
        "conceptOpen",
        "backToConcept",
        "conceptNavigation"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore",
            "connect"
        ]
        }
    },

    {
        id: "BF-416",

        name: "Silent Thinking",

        description: "The learner repeatedly pauses for long periods without replaying or navigating.",

        observations: [
        "pauseDuration",
        "resumeDelay",
        "pauseDuration",
        "resumeDelay",
        "pauseDuration"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "process"
        ]
        }
    },

    {
        id: "BF-417",

        name: "Long Mixed Session",

        description: "A very long session containing many weak signals without a single dominant pattern.",

        observations: [
        "conceptSearch",
        "seekBackward",
        "pauseDuration",
        "conceptNavigation",
        "highlight",
        "windowBlur",
        "returnTime",
        "transcriptSearch",
        "replay",
        "conceptOpen",
        "backToConcept",
        "chatQuestion",
        "pauseDuration",
        "seekBackward",
        "highlight"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore",
            "verify",
            "process",
            "connect",
            "externalize",
            "monitor"
        ]
        }
    },

    {
        id: "BF-418",

        name: "Distracted Learner",

        description: "The learner repeatedly leaves and returns with only minimal learning activity.",

        observations: [
        "windowBlur",
        "returnTime",
        "tabHidden",
        "windowBlur",
        "returnTime",
        "browserMinimized",
        "seekBackward"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "monitor",
            "verify"
        ]
        }
    },

    {
        id: "BF-419",

        name: "Random Interaction",

        description: "Random interactions with no clear behavioral pattern.",

        observations: [
        "highlight",
        "windowBlur",
        "conceptSearch",
        "pauseDuration",
        "chatQuestion",
        "seekBackward",
        "tabHidden",
        "conceptNavigation",
        "transcriptClick",
        "returnTime"
        ],

        expected: {
        dominantBehaviorFunctions: [
            "explore",
            "verify",
            "process",
            "connect",
            "externalize",
            "monitor"
        ]
        }
    }
]