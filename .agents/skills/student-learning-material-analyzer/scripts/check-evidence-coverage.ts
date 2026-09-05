#!/usr/bin/env node
import fs from "node:fs";
import { pathToFileURL } from "node:url";

type JsonRecord = Record<string, unknown>;
type CheckResult = { ok: boolean; errors: string[] };

const fieldsThatNeedEvidence = new Set([
  "correctnessJudgement",
  "knowledgeMapping",
  "mistakeDiagnosis",
  "student_profile_update_suggestions",
  "next_learning_actions",
  "nextActions",
  "sentences"
]);

function loadJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, errors: ["Cannot read or parse JSON: " + message] }, null, 2));
    process.exit(1);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasEvidenceRefs(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.evidenceRefs) && value.evidenceRefs.length > 0;
}

function walk(value: unknown, currentPath: string, errors: string[]): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, currentPath + "[" + index + "]", errors));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = currentPath ? currentPath + "." + key : key;
    if (fieldsThatNeedEvidence.has(key)) {
      if (Array.isArray(child)) {
        child.forEach((item, index) => {
          if (!hasEvidenceRefs(item)) errors.push(childPath + "[" + index + "] missing evidenceRefs");
        });
      } else if (child && typeof child === "object" && !hasEvidenceRefs(child)) {
        errors.push(childPath + " missing evidenceRefs");
      }
    }
    walk(child, childPath, errors);
  }
}

export function check(analysis: unknown): CheckResult {
  const errors: string[] = [];
  walk(analysis, "", errors);
  return { ok: errors.length === 0, errors };
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node check-evidence-coverage.ts <analysis.json>");
    process.exit(2);
  }
  const result = check(loadJson(file));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
