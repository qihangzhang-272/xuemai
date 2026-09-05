# VisionEvidencePacket Schema

The VisionEvidencePacket is produced by an external OCR/Layout/Vision plugin before the text reasoning model is called.

## Root Required Fields
- schema_version: vision_evidence_packet.v0.4
- plugin_run_id
- source_material_id
- student_id
- plugin_provider
- plugin_model_version
- created_at
- pages[]
- questions[]
- evidences[]
- plugin_errors[]

## Page
- page_id
- page_index
- page_image_ref
- width
- height
- image_quality_confidence
- quality_flags[]

## Question
- question_id
- question_number optional
- question_type_candidate optional
- regions[]
- confidence
- risk_flags[]

## Region
- region_id
- region_role
- page_id
- bbox or polygon
- crop_ref
- confidence

## Evidence
- evidence_id
- evidence_ref
- source_material_id
- page_id
- question_id
- region_id optional
- evidence_type
- text optional
- raw_ocr_text optional
- normalized_text optional
- bbox or polygon
- crop_ref
- confidence
- teacher_verified
- risk_flags[]

## Minimum Runtime Validation
Each evidence used for reasoning must include page_id, question_id, evidence_type, confidence, and bbox or crop_ref. Visual evidence without crop_ref should require teacher review even when bbox exists.

## Pipeline Trace For Real Providers

When the packet is generated from a real OCR/Layout/Vision provider, include `pipeline_trace`:

- `selected_provider` must match `plugin_provider`.
- `provider_candidates[]` must include the selected provider as `fit=primary_candidate`.
- `provider_candidates[]` should include at least one fallback or benchmark/open-source candidate.
- Each provider candidate should include role, fit, source URL when public, and license/deployment review notes.
- `question_segmentation_policy.definitive_question_requires_crop_ref` and `uncertain_boundary_routes_to_review` must be true.

For 99% asset preflight, missing provider candidate trace, benchmark candidates, evidence source URLs, or license/deployment notes blocks `claimable99AssetReady` even if the packet is structurally valid.
