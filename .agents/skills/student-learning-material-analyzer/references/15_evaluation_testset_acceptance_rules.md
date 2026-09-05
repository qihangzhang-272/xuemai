# Evaluation Testset And Acceptance Rules

## Testset Coverage
- Valid student homework with clear answer and rubric.
- Student material without answer key.
- Blank worksheet template.
- Teacher PPT or lesson plan.
- Low-quality photo.
- Ambiguous teacher mark.
- Low-confidence OCR handwriting.
- Correct answer with weak process.
- Incorrect answer with visible process error.
- Parent feedback safety violation.
- Mainland K12 material classification across exam, homework, wrong question, notes, and monthly/weekly test styles.
- Low-confidence OCR or missing rubric where a model might be tempted to hard-judge correctness.
- Student monthly report source with prior-month comparison seed.
- Alternate reasoning model output using the same StudentLearningMaterialAnalysis contract.

## Acceptance Checks
- Unsupported materials are blocked, not diagnosed.
- Correctness degrades when key evidence is missing.
- High-confidence definitive correctness judgement target is >=99%; low-confidence or insufficient-basis items are routed to teacher review.
- Every conclusion has evidenceRefs.
- Teacher professional report exists and is evidence-linked.
- Parent feedback draft exists, is safe, and is not ready_to_send.
- Monthly snapshot and month-over-month comparison seed exist and remain unconfirmed before teacher action.
- Model contract marks Vision/OCR provider and reasoning model as replaceable.
- No profile write happens before teacher confirmation.
- No ready_to_send feedback before teacher confirmation.
- Forbidden feedback words are caught.
- Error source is assigned for failures.
- Teacher review UI can show evidence and risk flags.

## Required Metrics
- materialClassificationAccuracy: target >= 0.99 across material type, subject, education stage, grade candidate, and region/curriculum candidate.
- questionCoverageRecall: target >= 0.99 for annotated questions.
- highConfidenceCorrectnessAccuracy: target >= 0.99 for questions where definitive judgement is allowed.
- unsupportedDefinitiveJudgementRate: target = 0 for questions where definitive judgement is not allowed.
- teacherReviewRoutingRecall: target >= 0.99 for evidence-insufficient questions.
- evidenceCoverageRate: target = 1 for all formal conclusions.
- unsafeFeedbackRate: target = 0.
- monthlySnapshotCoverage: target = 1 when monthly reporting is enabled.
- modelContractCoverage: target = 1.
- Batch result must fail if any individual gold case fails; do not let many easy cases average away a risky case.
- Batch coverage report must list material types, subjects, education stages, grade candidates, regions/curricula, total cases, total questions, definitive-allowed questions, and teacher-review-expected questions.

## Dataset Claim Rules
- Empty evaluation batches must fail.
- Synthetic fixtures are only smoke tests and cannot support a public or product claim of 99% correctness.
- A claimable 99% evaluation dataset must be `human_labeled`, anonymized, double-labeled, and adjudicated when reviewers disagree.
- Default claim threshold requires at least 100 cases and 500 annotated questions before treating results as a product-level 99% claim.
- Dataset reports must include dataset id, dataset kind, model/provider under test, coverage, failed cases, warnings, and whether `claimable99Correctness` is yes or no.
- Evaluation asset manifest reports must include `claimable99AssetReady` and blockers for sample count, gold question count, definitive/review question coverage, material type/subject/stage/region coverage, provider candidate trace, benchmark/open-source provider candidates, provider evidence source URLs, license/deployment review notes, normalized annotation import coverage, and required analysis/result/monthly/delivery bundle/teacher review packet artifacts.
- Evaluation asset manifest reports must include question-segmentation review artifact coverage. Gold questions marked `definitive_judgement_allowed=true` must have matching review status `pass`; otherwise the asset is not 99%-claim-ready.
- Re-run the full human-labeled dataset before changing OCR/Vision provider, reasoning model, prompt version, output schema, or correctness gate policy.

## Dataset JSON Format
- Use `src/skills/student-learning-material-analyzer/evaluation-files.ts` to load and evaluate JSON datasets.
- Use `src/skills/student-learning-material-analyzer/evaluation-asset-manifest-files.ts` to generate replayable asset manifests from case asset paths before running asset validation.
- Use `src/skills/student-learning-material-analyzer/evaluation-artifact-bundle-files.ts` to generate question-segmentation review, user-facing result, delivery bundle, teacher review packet, and optional monthly report artifacts from manifests that already contain `vision_packet_path` / `analysis_path`; this command does not call the live reasoning model.
- Evaluation asset manifests should carry `annotation_import_path` for human-labeled cases. Asset preflight must convert that normalized annotation import with the same VisionEvidencePacket and question-segmentation review, then require the regenerated adjudicated gold to match `gold_label_package_path`.
- Dataset files must use `fixture_schema: student_learning_material_evaluation_dataset.v0.1`.
- Inline cases may contain `{ "gold": {...}, "analysis": {...} }`.
- File-based cases may contain `{ "gold_path": "gold/case-001.json", "analysis_path": "outputs/case-001.json" }`; paths resolve relative to the dataset file.
- Human-labeled cases may contain `{ "gold_label_package_path": "gold/case-001-label-package.json", "analysis_path": "outputs/case-001.json" }`; the package must be double-labeled, adjudicated, and anonymized.
- Each `gold.case_id` must be unique.
- `gold` contains the human label: material classification, annotated questions, definitive-judgement allowance, and required output contracts.
- `analysis` contains the model output conforming to `StudentLearningMaterialAnalysis`.
- Reports must be generated with `formatStudentLearningMaterialEvaluationDatasetReport(...)` so pass/fail, coverage, failed cases, model under test, and `claimable99Correctness` are visible.

## Human Gold Label Package Command
- Validate one final gold package before adding it to a dataset: `XUEMAI_GOLD_LABEL_PACKAGE=/absolute/path/to/gold-label-package.json npm run validate:k12-gold-labels`.
- Use `student_learning_material_gold_label_package.v0.1` packages to preserve two independent labels, question evidence basis, anonymization flags, and adjudication.
- Label Studio, CVAT, or other annotation tool exports are allowed only as upstream working files; normalize them into `student_learning_material_gold_label_annotation_import.v0.1`, convert with `npm run generate:k12-gold-label-package`, then validate aligned `VisionEvidencePacket` evidence refs before acceptance.
- During gold template and final package generation, pass `XUEMAI_QUESTION_SEGMENTATION_REVIEW=/absolute/path/to/question-segmentation-review.json` whenever available. The template command copies segmentation status into reviewer notes; the package command rejects definitive gold judgements for questions whose segmentation review is not `pass`.
- See `references/16_gold_labeling_protocol.md` for required fields and gates.

## Model Output Artifact Command
- Generate a real provider/model output artifact before using file-based `analysis_path`: `XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_ANALYSIS_OUTPUT=/absolute/path/to/analysis.json npm run generate:k12-analysis-output`.
- Optional side inputs are `XUEMAI_ANSWER_KEYS`, `XUEMAI_RUBRICS`, `XUEMAI_KNOWLEDGE_POINTS`, and `XUEMAI_STUDENT_PROFILE_HISTORY`; each should point to a JSON file.
- The command refuses to write non-`draft_ready` analysis output by default. `XUEMAI_GENERATE_ALLOW_DEGRADED=1` is only for debugging degraded cases and cannot support a 99% claim.

## Dataset Evaluation Command
- For real sample collection, first generate a privacy-safe case package scaffold when useful: `XUEMAI_EVAL_CASE_PACKAGE_DIR=/absolute/path/to/case-dir XUEMAI_EVAL_CASE_ID=case-id XUEMAI_EVAL_CASE_DATASET_ID=dataset-id npm run generate:k12-eval-case-package`. The scaffold only standardizes paths and commands; it must not contain raw student materials and cannot support a 99% claim by itself.
- Inspect a case package during collection when useful: `XUEMAI_EVAL_CASE_PACKAGE_READINESS_DIR=/absolute/path/to/case-dir npm run inspect:k12-eval-case-package`. This only reports privacy errors including nested raw/source-material directories and raw image/PDF-like files, internal `artifact_paths` / `evaluation_asset_case` drift, generated `command_sequence` drift, missing artifacts, grouped OCR/Vision, question-segmentation, human-gold, monthly-comparison, and teacher-delivery chain gaps, the next sequential command, asset-preflight state, and 99% blockers; it must keep `claimable99_from_case_package=false` and cannot replace `validate:k12-eval-assets` or `eval:k12-material`.
- Case package readiness regression must include a positive full-chain replay fixture where Provider input, VisionEvidencePacket, Provider trial report, question-segmentation review, redacted annotation task, normalized annotation import, final gold package, gold review report, analysis/result, monthly input/output, delivery bundle, and teacher review packet all validate at standard package paths before the next action advances to evaluation asset manifest generation.
- Case package readiness regression must also cover the next step after manifest generation: once `evaluation-assets.json` exists and validates structurally, readiness must mark the asset-manifest command complete, report `assetPreflight.exists=yes`, return `fix_asset_preflight` while blockers remain, and continue to keep `claimable99_from_case_package=false`.
- Generate an asset manifest from case paths before preflight when needed: `XUEMAI_EVAL_ASSET_MANIFEST_CASES=/absolute/path/to/cases.json XUEMAI_EVAL_ASSET_MANIFEST_OUTPUT=/absolute/path/to/evaluation-assets.json npm run generate:k12-eval-assets-manifest`.
- Generate question-segmentation review/result/delivery bundle/teacher review packet/monthly artifacts from an analysis-backed manifest before preflight when needed: `XUEMAI_EVAL_ARTIFACT_MANIFEST_INPUT=/absolute/path/to/evaluation-assets.json XUEMAI_EVAL_ARTIFACT_MANIFEST_OUTPUT=/absolute/path/to/evaluation-assets.with-artifacts.json npm run generate:k12-eval-artifacts`.
- To generate monthly report artifacts with that command, also set `XUEMAI_EVAL_ARTIFACT_GENERATE_MONTHLY=1`, `XUEMAI_EVAL_ARTIFACT_TEACHER_ID`, and `XUEMAI_EVAL_ARTIFACT_CONFIRMED_AT`; this creates explicit confirmed snapshot copies for evaluation and must not be confused with real production archive.
- Generate a product-facing teacher review packet after delivery bundle when wiring the SkillCard or analysis detail page: `XUEMAI_DELIVERY_BUNDLE_INPUT=/absolute/path/to/delivery-bundle.json XUEMAI_TEACHER_REVIEW_PACKET_OUTPUT=/absolute/path/to/teacher-review-packet.json npm run generate:k12-teacher-review-packet`. If the delivery bundle is not already present, set `XUEMAI_DELIVERY_BUNDLE_OUTPUT` plus one of `XUEMAI_RESULT_INPUT`, `XUEMAI_ANALYSIS_INPUT`, or `XUEMAI_VISION_PACKET` and the command will generate the delivery bundle first. This is a UI handoff artifact, not 99% correctness evidence.
- Generate a single question-segmentation review artifact when needed: `XUEMAI_VISION_PACKET=/absolute/path/to/packet.json XUEMAI_QUESTION_SEGMENTATION_REVIEW_OUTPUT=/absolute/path/to/question-segmentation-review.json npm run generate:k12-question-segmentation-review`.
- Generate a source-text-safe double-label review report after the final gold package is built: `XUEMAI_GOLD_LABEL_PACKAGE=/absolute/path/to/gold-label-package.json XUEMAI_GOLD_LABEL_REVIEW_REPORT_OUTPUT=/absolute/path/to/gold-label-review-report.json npm run generate:k12-gold-label-review-report`. The report must be ready for 99% evaluation and must not copy reviewer values, OCR/text content, or notes.
- Audit 99% claim gaps before or after dataset eval when useful: `XUEMAI_EVAL_CLAIM_AUDIT_DATASET=/absolute/path/to/dataset.json npm run audit:k12-eval-claim`. The audit reports strict-policy gaps, artifact-focused asset preflight blockers, and next sample targets, but it is not a correctness result and cannot replace `eval:k12-material`.
- Turn a claim audit into the next real-sample collection batch plan when useful: `XUEMAI_EVAL_SAMPLE_PLAN_AUDIT=/absolute/path/to/claim-audit.json XUEMAI_EVAL_SAMPLE_PLAN_OUTPUT=/absolute/path/to/sample-plan.json XUEMAI_EVAL_SAMPLE_PLAN_PACKAGE_ROOT=/absolute/or/repo/path/to/real-samples npm run generate:k12-eval-sample-plan`. The plan must include privacy-safe case package command templates and must state that it is not 99% correctness evidence.
- Generate privacy-safe package scaffolds from a sample plan when starting a collection batch: `XUEMAI_EVAL_SAMPLE_PACKAGE_PLAN=/absolute/path/to/sample-plan.json XUEMAI_EVAL_SAMPLE_PACKAGE_ROOT=/absolute/or/repo/path/to/real-samples XUEMAI_EVAL_SAMPLE_PACKAGE_MAX_TOTAL_CASES=10 npm run generate:k12-eval-sample-packages`. These packages are scaffolds only; raw student images/PDFs remain outside the package, and no generated package is claim evidence until its referenced artifacts pass readiness, asset preflight, claim audit, and dataset eval.
- Dataset generation from a manifest must be replayed into claim audit in regression tests: generated datasets must preserve `asset_preflight.claimable99AssetReady=false` blockers and per-case artifact provenance, and `audit:k12-eval-claim` must turn those blockers into artifact-focused next targets instead of silently dropping them.
- Run `XUEMAI_EVAL_DATASET=/absolute/path/to/dataset.json npm run eval:k12-material` for real human-labeled acceptance.
- Before accepting an OCR/Vision provider or provider-configuration change, run `XUEMAI_BASELINE_PROVIDER_TRIAL_REPORT=/absolute/path/to/baseline-provider-trial-report.json XUEMAI_CANDIDATE_PROVIDER_TRIAL_REPORT=/absolute/path/to/candidate-provider-trial-report.json npm run compare:k12-vision-provider-regression`. Baseline and candidate must refer to the same source material; candidate output must not lose questions, crop refs, segmentation pass status, definitive readiness, or confidence beyond tolerance.
- Before accepting a reasoning model, provider, prompt, or schema change, run `XUEMAI_EVAL_BASELINE_DATASET=/absolute/path/to/baseline.json XUEMAI_EVAL_CANDIDATE_DATASET=/absolute/path/to/candidate.json npm run compare:k12-model-regression`. Baseline and candidate must use the same gold case IDs; candidate output must not introduce failed cases, metric regressions, or loss of `claimable99Correctness`.
- `validate:k12-eval-assets` can pass as a structural preflight while `claimable99AssetReady=no`; do not treat the asset set as product-claim ready until blockers are gone. A real OCR/Vision asset set must include `pipeline_trace.provider_candidates` with the selected provider marked `primary_candidate`, at least one benchmark/fallback candidate, evidence source URLs, license/deployment review notes, normalized annotation import coverage, and a ready gold label review report before it can be 99%-claim-ready.
- The command fails if `XUEMAI_EVAL_DATASET` is missing.
- The command fails unless `claimable99Correctness=yes`.
- For local smoke testing only, run `XUEMAI_EVAL_DATASET=tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json XUEMAI_EVAL_ALLOW_SMOKE=1 npm run eval:k12-material`.
- Never set `XUEMAI_EVAL_ALLOW_SMOKE=1` for a 99% claim or model/provider acceptance check.

## Minimum Automation
- Run validate-vision-evidence-packet.ts on plugin fixtures.
- Run `generate:k12-question-segmentation-review` or `generate:k12-eval-artifacts` so every real gold case has a redacted segmentation QA artifact.
- Run validate-analysis-schema.ts on analysis fixtures.
- Run check-evidence-coverage.ts on all analysis outputs.
- Run check-wechat-feedback-safety.ts on feedback drafts.
- Run the local evaluation harness against human-labeled gold cases before claiming 99% correctness.
- Run batch evaluation across the full gold set before changing model provider or prompt policy.
