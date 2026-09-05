# Profile Update And Memory Rules

## Principle
Analysis output can propose profile updates, but cannot directly create long-term student facts before teacher confirmation.

## Suggestion Types
- weakness_event
- ability_snapshot
- recurrence_risk
- action_plan
- monthly_report_source
- parent_communication_note

## Writeback Rules
- Suggestions must include evidenceRefs, confidence, source analysis id, and proposed expiry/review window when applicable.
- Low-confidence suggestions stay as draft or review_required.
- Confirmed writes should preserve source evidence and teacher edit trail.
- Profile updates are additive events by default; do not overwrite stable student profile fields without explicit teacher action.

## Forbidden
- Do not write unconfirmed AI output to student_learning_records or long-term profile.
- Do not treat one material as a permanent trait without trend evidence.
