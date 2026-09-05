# Student Answer Extraction Rules

## Extractable Evidence Types
- student_original_answer
- student_revised_answer
- student_process
- student_note
- formula_tokens
- erased_or_overwritten_trace

## Required Evidence Fields
- evidence_id and evidence_ref
- page_id, question_id, region_id
- raw_ocr_text and normalized_text when text is recognized
- bbox or crop_ref
- handwriting_type
- confidence

## Hard Rules
- Text reasoning model must not invent missing student answers, formulas, or handwriting content.
- No student process means no claim about method, concept, or carelessness.
- Unclear handwriting must produce unknown or needs_teacher_review, not a forced answer.
- Formula normalization must preserve uncertainty and original evidence references.
