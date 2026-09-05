# Quality Checklist

## Before Text Reasoning Call
- Material type is supported.
- Explicit non-K12 or non-mainland-K12 scope signals such as university, adult education, vocational qualification, postgraduate entrance, non-K12 external exams, Hong Kong/Macau/Taiwan exam systems, or international curricula are blocked or routed to teacher review.
- Student trace exists.
- VisionEvidencePacket is present and valid.
- Visual evidence has page_id, question_id, bbox or crop_ref, evidence_type, and confidence.
- Low-confidence evidence is marked for degrade or review.

## During Reasoning
- Text reasoning model receives structured text evidence only.
- No OCR, handwriting, formula, bbox, crop_ref, or teacher mark is invented by the model.
- Missing answer key/rubric causes correctness degrade.
- Missing student process blocks method/carelessness diagnosis.

## Output
- Output is parseable StudentLearningMaterialAnalysis JSON.
- Material type, subject, education stage, grade candidate, and region/curriculum candidate are classified from evidence or marked unknown/unrecognized.
- Accuracy policy states high-confidence target >=99%, and unsupported definitive judgement is false.
- Low-confidence or insufficient-basis questions are routed to unknown or needs_teacher_review, not definitive correctness.
- `question_analyses` covers every VisionEvidencePacket question exactly once and in the same order; missing, extra, duplicate, or reordered questions fail runner/asset preflight.
- Every judgement, mapping, diagnosis, profile suggestion, next action, and feedback sentence has evidenceRefs.
- Every analysis evidenceRef resolves to the same VisionEvidencePacket, an explicitly question-mapped side input ref, or a previous-month source ref only under `monthly_comparison_seed`; invented or cross-case refs fail runner/asset preflight.
- Teacher professional report is present and evidence-linked.
- Teacher professional report includes evidence sufficiency judgement: definitive questions, teacher-review questions, gate blockers/degrade reasons, and the rule that insufficient evidence cannot produce ability or mistake-cause conclusions.
- Monthly report snapshot and month-over-month comparison seed are present, but remain unconfirmed before teacher action.
- Monthly report aggregation reads only teacher-confirmed snapshot copies; unconfirmed `monthly_report_snapshot` values are ignored.
- Monthly report aggregation may also read confirmed learning records, confirmed feedback history, and teacher notes, but these do not replace per-question evidence from confirmed learning material snapshots.
- Model contract is present so the OCR/Vision provider and reasoning model can be replaced without changing the output contract.
- Confidence and degrade/block reasons are explicit.
- Profile updates are suggestions, not confirmed facts.

## Teacher Review
- SkillCard summary is concise.
- Detailed report exposes evidence and risk flags.
- Teacher can edit current output and confirm selected writebacks.
- Archive uses teacher-confirmed current output.
- Confirmed monthly snapshot writeback records teacher action before the snapshot enters the monthly report source pool.

## WeChat Safety
- Feedback is draft before teacher confirmation.
- No forbidden or absolute expressions.
- Tone is warm, concise, evidence-based, and does not promise score improvement.

## Evaluation Dataset
- Synthetic fixtures are marked synthetic and used only for smoke testing.
- Human-labeled gold cases are anonymized before use.
- Human-labeled gold cases are double-labeled and adjudicated before claiming 99% correctness.
- Final gold packages validated with a source VisionEvidencePacket match packet identity, question coverage/order, and same-question evidence basis refs.
- Batch evaluation fails on empty datasets and on any failed individual case.
- Dataset report shows coverage by material type, subject, education stage, grade candidate, and region/curriculum candidate.
- Dataset report shows the OCR/Vision provider, reasoning model, and prompt version under test when available.
