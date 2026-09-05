# Knowledge Base Architecture

## Purpose
Provide grade, subject, textbook-version, curriculum, and tutoring-specific knowledge point references for mapping student material evidence.

## Suggested Entities
- subject
- grade_band
- curriculum_version
- knowledge_point
- prerequisite_relation
- common_mistake_pattern
- task_type
- remediation_template

## Rules
- Knowledge mapping must be versioned and auditable.
- Mapping should cite question stem, answer evidence, rubric, or teacher correction.
- If the knowledge base lacks a matching point, output needs_teacher_review or unmapped_candidate.
- Do not invent a canonical knowledge point only because wording sounds familiar.
