# K12 Knowledge Point Mapping Rules

## Mapping Inputs
- Question stem and task type.
- Student answer and process evidence.
- Standard answer, scoring point, or teacher correction.
- Grade, subject, curriculum version, and knowledge base candidates.

## Confidence Rules
- High confidence requires explicit question or rubric alignment.
- Medium confidence can use question stem plus answer evidence.
- Low confidence must not write profile facts.

## Output Requirements
- knowledge_point_id or unmapped_label.
- mapping_reason.
- evidenceRefs.
- confidence and degradeReason when not high confidence.

## Prohibitions
- Do not use broad labels as final mapping when a precise point is required.
- Do not map to a weakness if the student answered correctly and no process issue is evidenced.
