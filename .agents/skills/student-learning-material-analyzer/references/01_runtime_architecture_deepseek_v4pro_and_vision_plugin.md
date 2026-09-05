# Runtime Architecture: Provider-Agnostic Text Reasoning + Vision Plugin

The current default text reasoning model is DeepSeek v4 Pro through the shared provider-agnostic model layer. The Skill must remain model-replaceable: OpenAI, DeepSeek, or another OpenAI-compatible provider may be used as long as it consumes the same structured text input and emits the same StudentLearningMaterialAnalysis JSON. Image/PDF/handwriting/layout recognition is handled before the model call by external OCR/Layout/Vision plugins.

## Pipeline
1. Student material upload.
2. File service renders pages and stores images.
3. OCR/Layout/Vision plugin detects page quality, question regions, student answers, formulas, teacher marks, bbox, and crop_ref.
4. Plugin emits VisionEvidencePacket.
5. The text reasoning adapter consumes structured text evidence and domain rules.
6. The system emits StudentLearningMaterialAnalysis JSON.
7. Teacher reviews and confirms selected outputs.
8. Only confirmed outputs can write to long-term student records or ready-to-send feedback.

## Responsibility Boundary
- Vision plugin sees: page image, handwriting, correction marks, question area, bbox, crop_ref, OCR, formulas.
- Text reasoning model reasons: material gates, correctness, knowledge mapping, mistake diagnosis, next actions, parent feedback draft.
- Teacher confirms: final profile facts, archive records, and sendable parent communication.

## Blocking Conditions
- Missing VisionEvidencePacket blocks visual claims.
- Missing page_id or question_id blocks question-level analysis.
- Missing bbox/crop_ref for visual evidence rejects that evidence.
- Plugin confidence under 0.65 caps downstream confidence and blocks writeback/feedback.
- Teacher-verified values override conflicting plugin output.

## Error Sources
- vision_plugin_error: OCR, layout, handwriting, formula, bbox, crop_ref, or correction recognition failure.
- answer_key_error: wrong or missing answer key, scoring point, or question mapping.
- deepseek_reasoning_error: reasoning failure despite valid evidence.
- review_ui_error: teacher review UI hides risk or evidence.
- data_writeback_error: unconfirmed or unsupported content is written.
- feedback_safety_error: feedback violates tone, evidence, or forbidden expression rules.
