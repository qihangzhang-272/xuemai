# Data Model, Permissions, And Audit Rules

## Data Separation
- Uploaded materials, vision evidence, AI analysis drafts, teacher edits, confirmed archives, and profile memory events are separate lifecycle states.
- AI drafts are not student facts.
- Confirmed teacher archive is the source for long-term student records.

## Suggested Records
- learning_evidences
- vision_evidence_packets
- analysis_reports
- skill_runs
- skill_outputs
- teacher_edit_events
- confirmed_profile_events
- monthly_report_sources

## Permission Rules
- teacherId must come from Auth session in real APIs.
- Service role can only run after ownership checks.
- Student data must be scoped by teacher, class, organization, and permission model.
- Do not store unnecessary full private context in run logs.

## Audit Requirements
- source_material_id
- vision_plugin_run_id
- analysis_id
- evidenceRefs
- teacher_id
- confirmation timestamp
- original_output, current_output, archived_output lifecycle where applicable
