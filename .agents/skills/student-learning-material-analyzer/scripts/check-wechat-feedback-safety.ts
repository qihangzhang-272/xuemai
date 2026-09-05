#!/usr/bin/env node
import fs from "node:fs";
import { pathToFileURL } from "node:url";

type JsonRecord = Record<string, unknown>;
type CheckResult = { ok: boolean; errors: string[]; warnings: string[]; checkedCharacters: number };

export const forbiddenTerms = [
  "严重",
  "很差",
  "完全不会",
  "保证提分",
  "不认真",
  "基础很差",
  "一定能提高",
  "一定提升",
  "孩子不行",
  "家长必须"
];

function load(file: string): unknown {
  const raw = fs.readFileSync(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asFeedbackDraft(input: unknown): unknown {
  if (!isRecord(input)) return input;
  return input.wechat_parent_feedback_draft || input.wechatFeedbackDraft || input;
}

function collectFeedbackText(input: unknown): string {
  if (typeof input === "string") return input;
  const draft = asFeedbackDraft(input);
  if (!isRecord(draft)) return "";
  const parts: string[] = [];
  if (typeof draft.text === "string") parts.push(draft.text);
  if (Array.isArray(draft.sentences)) {
    for (const sentence of draft.sentences) {
      if (typeof sentence === "string") parts.push(sentence);
      if (isRecord(sentence) && typeof sentence.text === "string") parts.push(sentence.text);
    }
  }
  return parts.join("\n");
}

function hasEvidenceRefs(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.evidenceRefs) && value.evidenceRefs.length > 0;
}

export function check(input: unknown): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const draft = asFeedbackDraft(input);
  const text = collectFeedbackText(input);
  for (const term of forbiddenTerms) {
    if (text.includes(term)) errors.push("Forbidden feedback expression found: " + term);
  }
  if (isRecord(draft) && draft.status === "ready_to_send") {
    errors.push("WeChat feedback must not be ready_to_send before teacher confirmation");
  }
  if (isRecord(draft) && Array.isArray(draft.sentences)) {
    draft.sentences.forEach((sentence, index) => {
      if (typeof sentence === "object" && !hasEvidenceRefs(sentence)) {
        warnings.push("Sentence " + index + " has no evidenceRefs");
      }
    });
  }
  return { ok: errors.length === 0, errors, warnings, checkedCharacters: text.length };
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node check-wechat-feedback-safety.ts <analysis-or-feedback.json|txt>");
    process.exit(2);
  }
  const result = check(load(file));
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
