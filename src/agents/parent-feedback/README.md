# Parent Feedback Agent

First delivery Agent for the Teaching Agent OS.

Current production scope:

- Validate teacher-provided feedback input.
- Create an `agent_runs` record with status `running`.
- Read student profile, confirmed learning records, wrong questions, and teacher feedback preferences.
- Assemble privacy-safe context metadata while sending selected context to the model.
- Generate structured JSON through `src/agents/shared/model/`.
- Run parent-feedback guardrails and quality evaluation.
- Revise once when quality is below threshold.
- Save the AI draft to `agent_outputs` with `status=draft` and `is_final=false`.
- Update `agent_runs` with status, raw model output, final output, quality score, warnings, latency, and token usage.
- Confirm a teacher-approved draft through `POST /api/agents/parent-feedback/confirm`.
- Save teacher-confirmed feedback to `feedback_history`.
- Save teacher-confirmed learning evidence to `student_learning_records` with `confirmed_by_teacher=true`.
- Update confirmed `agent_outputs` to `confirmed` or `edited` with `is_final=true`.
- Record `teacher_edit_events` when the teacher changes the AI draft before saving.
- Support the student detail page flow: generate, edit, copy, and save.

Boundaries:

- AI drafts are not long-term facts until teacher confirmation.
- Do not update `students` profile fields.
- Do not send WeChat messages.
- `suggestedProfileUpdate` is only a suggestion for later teacher confirmation.
- Server-side Supabase writes use the server-only service role client.

Verified flow:

- Phase 7 E2E test passed through the student detail page and Supabase read-only verification.
- Confirmed records were observed in `agent_runs`, `agent_outputs`, `feedback_history`, `student_learning_records`, and `teacher_edit_events`.
- Static scan found no automatic `students` update path.

TODO:

- Derive `teacherId` from Supabase Auth session instead of request body.
- Add Auth/RLS policies before multi-teacher production use.
- Add a teacher-confirmed Student Profile update flow before writing suggested profile changes to `students`.
- Use confirmed records as the source for future Wrong Question Analysis, Student Profile, and Monthly Report Agents.
