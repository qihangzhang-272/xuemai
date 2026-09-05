# Material State And Evidence Rules

## Supported Materials
- Student answered tests, homework, worksheets, essays, oral records, lab reports, project work, corrected drafts, and teacher-marked materials.
- Materials must include student-specific traces: answer, correction, teacher mark, note, revision, score, or process trace.

## Unsupported Materials
- Teacher PPT, teacher lesson plans, teaching notes, blank textbooks, blank worksheet templates, and generic examples.
- Unsupported materials may be stored as resources, but must not become evidence of student ability.

## Material State Values
- valid_student_material: enough student trace to analyze.
- insufficient_student_trace: material exists but cannot support ability inference.
- blank_template: no student trace.
- teacher_resource: teacher-only content.
- low_quality: image/PDF quality prevents reliable extraction.
- needs_review: ambiguity requires teacher confirmation.

## Gate Rules
- No student trace means no ability inference.
- Low image quality means require re-upload or teacher review.
- Ambiguous material type means produce a review task, not a diagnostic report.
