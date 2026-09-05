# Answer Key, Rubric, And Correctness Rules

## Required Inputs For Strong Correctness
- Student answer evidence with question_id and evidenceRefs.
- Standard answer or scoring rubric mapped to the same question_id.
- Clear teacher correction or score when available.

## Judgement Values
- correct
- partially_correct
- incorrect
- unknown
- needs_teacher_review

## Degrade Rules
- Missing standard answer/rubric means do not assert final correctness unless clear teacher marking exists.
- Ambiguous teacher mark means needs_teacher_review.
- Conflicting answer key and teacher mark means prefer teacher-verified value, otherwise require review.
- Low OCR confidence means correctness cannot become profile fact.

## Output Requirements
- correctnessJudgement must include evidenceRefs, confidence, source_basis, and degradeReason when degraded.
- Never infer correctness from likely intent, neatness, or generic grade-level expectation alone.
