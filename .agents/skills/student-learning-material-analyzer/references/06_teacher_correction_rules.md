# Teacher Correction Rules

## Correction Evidence Types
- teacher_mark_correct
- teacher_mark_incorrect
- teacher_partial_credit
- teacher_comment
- teacher_score
- teacher_rewrite_or_hint

## Mapping Requirements
- Correction must map to question_id and target_ref with confidence.
- The system must distinguish teacher marks from student notes when possible.
- Teacher-verified correction overrides plugin guesses.

## Review Triggers
- Mark target is unclear.
- Score does not match visible correction pattern.
- Teacher comment OCR is low confidence.
- Correction conflicts with answer key or rubric.

## Output Rules
- Teacher correction can support correctness judgement only when mapped to a target.
- Do not infer emotional tone or teacher intent from marks alone.
