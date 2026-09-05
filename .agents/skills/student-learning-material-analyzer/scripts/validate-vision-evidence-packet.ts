#!/usr/bin/env node
import fs from "node:fs";
import { pathToFileURL } from "node:url";

type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  evidenceCount: number;
};

type JsonRecord = Record<string, unknown>;

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

function hasLocation(value: JsonRecord): boolean {
  return Boolean(value.bbox || value.polygon || value.crop_ref);
}

export function validate(packet: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(packet)) {
    return { ok: false, errors: ["Packet must be a JSON object"], warnings, evidenceCount: 0 };
  }
  const requiredRoot = ["schema_version", "plugin_run_id", "source_material_id", "student_id", "plugin_provider", "plugin_model_version", "created_at"];
  for (const key of requiredRoot) {
    if (!packet[key]) errors.push("Missing root field: " + key);
  }
  for (const key of ["pages", "questions", "evidences"]) {
    if (!Array.isArray(packet[key])) errors.push("Expected array: " + key);
  }
  const evidences = Array.isArray(packet.evidences) ? packet.evidences : [];
  evidences.forEach((entry, index) => {
    const prefix = "evidences[" + index + "]";
    if (!isRecord(entry)) {
      errors.push(prefix + " must be an object");
      return;
    }
    for (const key of ["page_id", "question_id", "evidence_type", "confidence"]) {
      if (entry[key] === undefined || entry[key] === null || entry[key] === "") {
        errors.push(prefix + " missing " + key);
      }
    }
    if (!hasLocation(entry)) {
      errors.push(prefix + " missing bbox/polygon/crop_ref");
    }
    if (typeof entry.confidence === "number" && entry.confidence < 0.65) {
      warnings.push(prefix + " confidence below 0.65; downstream profile/writeback/feedback should block or degrade");
    }
  });
  return { ok: errors.length === 0, errors, warnings, evidenceCount: evidences.length };
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node validate-vision-evidence-packet.ts <packet.json>");
    process.exit(2);
  }
  const result = validate(loadJson(file));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
