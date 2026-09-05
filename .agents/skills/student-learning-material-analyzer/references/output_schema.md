# StudentLearningMaterialAnalysis Output Schema

This is the required shape for the text reasoning output. Implementations may use JSON Schema or Zod, and the reasoning model may change, but must preserve these lifecycle, evidence, reporting, monthly-report, and model-contract fields.

Business UI should not render this raw model JSON directly. Use `createStudentLearningMaterialUserFacingResult(...)` to assemble teacher report, parent feedback, and monthly result objects with user-facing source labels and internal source mapping.

## Root
- schema_version: student_learning_material_analysis.v0.4
- analysis_id: stable id for this run
- source_material_id
- student_id
- material_state
- material_classification
- gates[]
- accuracy_policy
- evidence_summary
- question_analyses[]
- student_profile_update_suggestions[]
- next_learning_actions[]
- teacher_professional_report
- wechat_parent_feedback_draft
- monthly_report_snapshot
- monthly_comparison_seed
- model_contract
- teacher_review_required
- risk_flags[]
- audit

## MaterialClassification
- material_type: exam | homework | wrong_question | wrong_question_book | unit_quiz | weekly_test | monthly_test | student_notes | practice_record | other_student_material
- subject: 语文 | 数学 | 英语 | 日语 | 俄语 | 德语 | 法语 | 西班牙语 | 物理 | 化学 | 生物 | 生物学 | 历史 | 地理 | 道德与法治 | 思想政治 | 科学 | 信息科技 | 信息技术 | 通用技术 | 其他
- education_stage: primary | middle | high | unknown
- grade_candidate
- region_or_curriculum_candidate
- classification_confidence
- evidenceRefs[]

## AccuracyPolicy
- high_confidence_target: >=99%
- auto_judgement_rule
- refusal_rule
- unsupported_definitive_judgement_allowed: false

## Gate
- gate_id
- status: pass | degrade | block | needs_teacher_review
- reason
- evidenceRefs[]

## QuestionAnalysis
- question_id
- question_number
- material_refs[]
- correctnessJudgement
- knowledgeMapping[]
- mistakeDiagnosis[]
- nextActions[]
- confidence
- evidenceRefs[]
- degradeReason optional

## CorrectnessJudgement
- status: correct | partially_correct | incorrect | unknown | needs_teacher_review
- source_basis: answer_key | rubric | teacher_correction | mixed | insufficient
- explanation
- evidenceRefs[]
- confidence
- degradeReason optional

## KnowledgeMapping
- knowledge_point_id optional
- knowledge_point_label
- mapping_reason
- evidenceRefs[]
- confidence

## MistakeDiagnosis
- diagnosis_type
- explanation
- evidenceRefs[]
- confidence
- suggested_verification optional

## ProfileUpdateSuggestion
- suggestion_type: weakness_event | ability_snapshot | recurrence_risk | action_plan | monthly_report_source | parent_communication_note
- content
- evidenceRefs[]
- confidence
- teacher_confirmation_required: true
- status: draft | needs_teacher_review | rejected | confirmed

## NextLearningAction
- action_type
- title
- detail
- priority
- verification_method
- evidenceRefs[]

## TeacherProfessionalReport
- report_title
- assessment_style: professional_evaluation
- material_overview
- overall_conclusion
- score_or_completion_summary
- question_table_summary
- knowledge_mastery_summary
- ability_dimension_summary
- error_pattern_summary
- priority_focus
- consolidation_suggestions[]
- teacher_review_boundary
- evidenceRefs[]

## WeChatParentFeedbackDraft
- status: draft | blocked | needs_teacher_review
- text
- sentences[] with text and evidenceRefs[]
- warnings[]
- forbidden_terms_found[]

## MonthlyReportSnapshot
- source_analysis_id
- student_id
- month
- subject
- material_type
- material_date
- score_summary
- question_count
- analyzable_question_count
- knowledge_points[]
- ability_dimensions[]
- error_patterns[]
- main_progress_signal
- main_issue_signal
- first_priority_action
- parent_visible_summary
- teacher_only_notes[]
- confidence
- evidenceRefs[]
- teacher_confirmed: false

The analyzer output is always an AI draft. Monthly report generation must not read this object directly as a final source. After teacher confirmation, archive/profile writeback may create a separate confirmed snapshot copy with `teacher_confirmed: true`, `confirmed_at`, and source SkillRun/archive identifiers for monthly aggregation.

## MonthlyComparisonSeed
- previous_month_snapshot optional; when present it must include replayable previous-month source evidenceRefs. If those refs are missing, user-facing outputs must state insufficient previous-month evidence instead of writing explicit progress/regression trends.
- current_month_snapshot
- trend_by_knowledge_point[]
- trend_by_ability_dimension[]
- trend_by_error_pattern[]
- new_issues[]
- improved_issues[]
- repeated_issues[]
- confidence_change
- teacher_interpretation
- parent_readable_comparison
- evidenceRefs[]

## ModelContract
- input_schema: VisionEvidencePacket
- output_schema: StudentLearningMaterialAnalysis
- vision_provider_replaceable: true
- reasoning_model_replaceable: true
- strict_json_schema_preferred: true
- provider_name optional
- model_name optional

## Audit
- runtime_model
- vision_plugin_run_id
- created_at
- error_sources[]
- token_usage optional
- context_record_ids[] optional
