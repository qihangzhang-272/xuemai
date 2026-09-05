# Question Segmentation Rules

## Goal
Map every extracted question, answer, correction, and evidence item to stable page and question identifiers.

## Required Fields
- page_id
- question_id
- question_number when visible or teacher-provided
- region_id for stem, answer, correction, score, or note regions
- bbox or polygon plus crop_ref for visual evidence
- confidence and risk_flags

## Risk Flags
- missing_question_number
- ambiguous_question_boundary
- split_across_pages
- overlapping_regions
- low_layout_confidence
- crop_missing

## Rules
- Do not merge questions just because they are visually close.
- Do not assign a teacher mark to a question without target mapping evidence.
- Preserve uncertain segmentation as needs_teacher_review rather than forcing a mapping.

## QA Artifact
- Generate a redacted review artifact before final gold labeling or 99% asset validation:

```bash
XUEMAI_VISION_PACKET=/absolute/path/to/packet.json \
XUEMAI_QUESTION_SEGMENTATION_REVIEW_OUTPUT=/absolute/path/to/question-segmentation-review.json \
npm run generate:k12-question-segmentation-review
```

- The artifact schema is `student_learning_material_question_segmentation_review.v0.1`.
- It records question ids, page ids, region ids, geometry/crop-ref readiness, region confidence, evidence type counts, segmentation status, and a human review checklist.
- It must not contain raw OCR text, normalized text, student names, full answer content, or parent-facing copy.
- A question can support definitive gold correctness only when its review status is `pass`.
- Missing `crop_ref`, missing geometry, low-confidence region, ambiguous boundary, orphan evidence, or evidence mapped to an unknown region must route the question to teacher review rather than hard judgement.
