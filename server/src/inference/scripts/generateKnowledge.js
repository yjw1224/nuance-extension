import fs from "fs";
import path from "path";
import csv from "csv-parser";

const ROOT = path.resolve("src/inference");

const ORIGIN_DIR = path.join(ROOT, "origin");
const GENERATED_DIR = path.join(ROOT, "generated");

const ROLE_MAP = {
  none: 0,
  supporting: 1,
  secondary: 2,
  primary: 3,
};

const EVIDENCE_MAP = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

fs.mkdirSync(GENERATED_DIR, { recursive: true });

function readCsv(fileName) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(path.join(ORIGIN_DIR, fileName))
      .pipe(csv())
      .on("data", row => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function saveJson(fileName, data) {
  fs.writeFileSync(
    path.join(GENERATED_DIR, fileName),
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function compileDictionary(rows, requiredFields) {
  const result = {};
  const ids = new Set();

  for (const row of rows) {

    for (const field of requiredFields) {
      if (!row[field]?.trim()) {
        throw new Error(
          `Missing "${field}" in "${row.id || "(unknown)"}"`
        );
      }
    }

    if (ids.has(row.id)) {
      throw new Error(`Duplicated id: ${row.id}`);
    }

    ids.add(row.id);

    const { id, ...rest } = row;

    result[id] = rest;
  }

  return result;
}

async function build(config) {

  console.log(`Building ${config.output}...`);
  let rows = await readCsv(config.input);

  if (config.preprocess) {
    rows = config.preprocess(rows);
  }

  const json = config.compiler
    ? config.compiler(rows)
    : compileDictionary(rows, config.required);

  saveJson(config.output, json);

  console.log(`✓ ${config.output}`);
}

function compileMapping(rows) {
  const result = {};

  for (const row of rows) {
    if (!row.observationId?.trim() && !row.bfId?.trim()) {
        if (!row.bfId?.trim())
            throw new Error(`Missing bfId in "${row.observationId}"`);
        else
            throw new Error("Missing observationId");
    }

    if (!result[row.observationId]) {
      result[row.observationId] = [];
    }

    result[row.observationId].push({
      bfId: row.bfId,
      role: row.role,
      evidence: row.evidence,
    });
  }

  return result;
}

function compileEvidenceMapping(rows) {
  const result = {};

  for (const row of rows) {
    if (!result[row.bfId]) {
      result[row.bfId] = {};
    }

    if (!result[row.bfId][row.stateId]) {
      result[row.bfId][row.stateId] = {};
    }

    result[row.bfId][row.stateId][row.level] = row.evidence;
  }

  return result;
}

async function main() {
    const KNOWLEDGE_FILES = [
        {
            input: "observations.csv",
            output: "observations.json",
            required: [
            "id",
            "name",
            "category",
            "type",
            "description"
            ]
        },

        {
            input: "behavior_functions.csv",
            output: "behaviorFunctions.json",
            required: [
            "id",
            "name",
            "description",
            "goal",
            "primaryState",
            "secondaryState"
            ]
        },

        {
            input: "understanding_states.csv",
            output: "understandingStates.json",
            required: [
            "id",
            "name",
            "description",
            "coreQuestion"
            ]
        },

        {
            input: "understanding_state_levels.csv",
            output: "understandingStateLevels.json",
            required: [
            "id",
            "stateId",
            "level",
            "name",
            "coreDefinition"
            ]
        }
    ]

    for (const config of KNOWLEDGE_FILES) {
        await build(config);
    }

    await build({
    input: "observations_bf_mapping.csv",
    output: "observationBehaviorMapping.json",

    preprocess: rows =>
        rows.map(row => ({
        ...row,
        role: ROLE_MAP[row.role.toLowerCase()],
        evidence: EVIDENCE_MAP[row.evidence.toLowerCase()],
        })),

    compiler: compileMapping,
    });

    await build({
    input: "bf_state_mapping.csv",
    output: "behaviorFunctionStateMapping.json",

    preprocess: rows =>
        rows.map(row => ({
        ...row,
        role: ROLE_MAP[row.role.toLowerCase()],
        })),

    compiler: compileMapping,
    });

    await build({
    input: "bf_state_level_evidence.csv",
    output: "behaviorFunctionStateEvidence.json",

    preprocess: rows =>
        rows.map(row => ({
        ...row,
        level: Number(row.level),
        evidence: EVIDENCE_MAP[row.evidence.toLowerCase()],
        })),

    compiler: compileEvidenceMapping,
    });

    console.log("\nKnowledge build completed.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});