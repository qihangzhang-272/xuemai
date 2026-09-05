# Mistake Diagnosis Rules

## Diagnosis Categories
- knowledge_gap
- condition_extraction_error
- process_omission
- representation_error
- calculation_error
- expression_incomplete
- review_or_checking_gap
- unknown

## Required Evidence
- Incorrect or partially correct judgement with evidenceRefs.
- Student answer or process evidence.
- Rubric/answer key or teacher correction when available.

## Hard Rules
- Do not diagnose carelessness without process evidence.
- Do not diagnose concept confusion from a single wrong answer unless the evidence shows concept-level mismatch.
- Do not diagnose method weakness when only final answer is visible.
- Use unknown or needs_teacher_review when evidence cannot distinguish causes.

## Output
- diagnosis_type, explanation, evidenceRefs, confidence, and suggested_verification.
