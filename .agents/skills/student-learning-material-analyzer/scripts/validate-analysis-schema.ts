#!/usr/bin/env node
import fs from "node:fs";
import { pathToFileURL } from "node:url";

type JsonRecord = Record<string, unknown>;
type ValidationResult = { ok: boolean; errors: string[]; warnings: string[] };

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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function validate(analysis: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(analysis)) {
    return { ok: false, errors: ["Analysis must be a JSON object"], warnings };
  }
  for (const key of ["schema_version", "analysis_id", "source_material_id", "student_id", "material_state"]) {
    if (!analysis[key]) errors.push("Missing root field: " + key);
  }
  if (!Array.isArray(analysis.question_analyses)) errors.push("question_analyses must be an array");
  asArray(analysis.question_analyses).forEach((entry, index) => {
    const prefix = "question_analyses[" + index + "]";
    if (!isRecord(entry)) {
      errors.push(prefix + " must be an object");
      return;
    }
    if (!entry.question_id) errors.push(prefix + " missing question_id");
    if (!hasEvidenceRefs(entry)) errors.push(prefix + " missing evidenceRefs");
    if (entry.correctnessJudgement && !hasEvidenceRefs(entry.correctnessJudgement)) {
      errors.push(prefix + ".correctnessJudgement missing evidenceRefs");
    }
    for (const field of ["knowledgeMapping", "mistakeDiagnosis", "nextActions"]) {
      asArray(entry[field]).forEach((item, itemIndex) => {
        if (!hasEvidenceRefs(item)) errors.push(prefix + "." + field + "[" + itemIndex + "] missing evidenceRefs");
      });
    }
  });
  asArray(analysis.student_profile_update_suggestions).forEach((item, index) => {
    if (!hasEvidenceRefs(item)) errors.push("student_profile_update_suggestions[" + index + "] missing evidenceRefs");
    if (isRecord(item) && item.teacher_confirmation_required !== true) {
      errors.push("student_profile_update_suggestions[" + index + "] must require teacher confirmation");
    }
  });
  if (isRecord(analysis.wechat_parent_feedback_draft)) {
    const feedback = analysis.wechat_parent_feedback_draft;
    if (feedback.status === "ready_to_send") errors.push("wechat_parent_feedback_draft cannot be ready_to_send before teacher confirmation");
    asArray(feedback.sentences).forEach((sentence, index) => {
      if (!hasEvidenceRefs(sentence)) warnings.push("wechat_parent_feedback_draft.sentences[" + index + "] missing evidenceRefs");
    });
  }
  return { ok: errors.length === 0, errors, warnings };
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node validate-analysis-schema.ts <analysis.json>");
    process.exit(2);
  }
  const result = validate(loadJson(file));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
