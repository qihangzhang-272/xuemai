# Teacher Review And Human-In-The-Loop Rules

## Required Review Surfaces
- SkillCard summary.
- Detailed report with evidence drill-down.
- Risk/degrade flags.
- Editable current output.
- Original AI output view.
- Confirm, reject, reset, and archive actions.

## Review Principles
- Teacher confirmation is required for long-term memory, parent-sendable feedback, and profile update.
- Edited current output is the archive source, not original_output.
- Review UI should expose evidenceRefs and confidence, not hide uncertainty.
- Confirmation events should be auditable and idempotent.

## Risk Flags To Show
- low_vision_confidence
- missing_answer_key
- ambiguous_teacher_mark
- unsupported_material
- weak_evidence_for_profile
- feedback_safety_warning
