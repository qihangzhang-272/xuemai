# Accuracy Framework

Purpose: define the evidence-first accuracy standard for student learning material analysis.

## Core Standard
- Accuracy means the system can explain where each conclusion came from, not merely produce plausible educational language.
- Every formal conclusion must have evidenceRefs that point to VisionEvidencePacket evidence, answer/rubric facts, teacher-verified facts, or confirmed student history.
- Absence of evidence is not neutral. It must cause degrade, block, or teacher review.

## Evidence Levels
- Strong: teacher-verified answer/correction, clear OCR with bbox/crop_ref, standard answer/rubric alignment, and high confidence.
- Medium: clear student answer and question stem, but incomplete rubric or no teacher verification.
- Weak: low OCR confidence, ambiguous question mapping, missing bbox/crop_ref, or unclear teacher mark.
- None: no student trace, no question mapping, no answer key/rubric, or unsupported material type.
- Out of scope: explicit university, adult education, vocational qualification, postgraduate entrance, non-K12 external exam, professional certification, Hong Kong/Macau/Taiwan exam-system, or international-curriculum material. Treat as unsupported for mainland K12 student ability analysis even when OCR evidence is clear.

## Degrade Rules
- Correctness judgement degrades when answer key, rubric, or teacher correction is missing.
- Student ability analysis blocks before model reasoning when explicit non-K12 or non-mainland-K12 scope signals are present.
- Mistake diagnosis degrades when student process is absent.
- Profile writeback and WeChat feedback block when conclusions are unsupported or low confidence.

## Required Audit Fields
- evidenceRefs
- confidence
- degradeReason or blockReason when applicable
- error_source when a failure is detected
- teacher_review_required when evidence cannot safely support an automatic draft
