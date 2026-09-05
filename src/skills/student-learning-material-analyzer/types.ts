export type MaterialState =
  | "valid_student_material"
  | "insufficient_student_trace"
  | "blank_template"
  | "teacher_resource"
  | "low_quality"
  | "notes_only"
  | "needs_review";

export type GateStatus = "pass" | "degrade" | "block" | "needs_teacher_review";

export type AnalysisJobStatus = "queued" | "vision_ready" | "running" | "draft_ready" | "degraded" | "failed";

export type DegradedReason =
  | "no_student_trace"
  | "unsupported_material_state"
  | "low_image_quality"
  | "missing_question_id"
  | "missing_evidenceRefs"
  | "answer_key_missing"
  | "teacher_mark_answer_key_conflict"
  | "student_identity_uncertain"
  | "student_identity_conflict"
  | "notes_only"
  | "teacher_mark_only"
  | "out_of_k12_scope"
  | "vision_packet_invalid"
  | "model_output_invalid"
  | "wechat_feedback_unsafe";

export type BoundingBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  coord_space?: "normalized" | "pixel";
};

export type Polygon = {
  points: Array<{
    x: number;
    y: number;
  }>;
  coord_space?: "normalized" | "pixel";
};

export type VisionPipelineStageStatus = "not_run" | "pass" | "degrade" | "block" | "needs_teacher_review" | "failed";

export type VisionPipelineStageTrace = {
  stage_id:
    | "page_rendering"
    | "image_preprocessing"
    | "layout_detection"
    | "ocr_text_recognition"
    | "handwriting_recognition"
    | "formula_recognition"
    | "table_recognition"
    | "question_segmentation"
    | "student_trace_detection"
    | "teacher_correction_detection"
    | "answer_key_alignment";
  provider: string;
  model_version?: string;
  status: VisionPipelineStageStatus;
  confidence: number;
  output_refs: string[];
  risk_flags: string[];
  notes?: string[];
};

export type VisionEvidencePacketPipelineTrace = {
  selected_provider: string;
  provider_candidates?: Array<{
    name: string;
    role: "ocr" | "layout" | "formula" | "table" | "document_parser" | "question_segmentation" | "deployment";
    fit: "primary_candidate" | "fallback_candidate" | "benchmark_only" | "not_selected";
    license_note?: string;
    evidence_source_url?: string;
    notes?: string[];
  }>;
  preprocessing?: {
    source_kind?: "image" | "pdf" | "text" | "mock";
    rendered_page_count?: number;
    dpi?: number;
    deskewed?: boolean;
    denoised?: boolean;
    quality_notes?: string[];
  };
  stages: VisionPipelineStageTrace[];
  question_segmentation_policy: {
    definitive_question_requires_crop_ref: true;
    uncertain_boundary_routes_to_review: true;
    question_id_namespace: string;
  };
  evaluation_asset_policy?: {
    raw_student_material_retained_outside_gold_json: true;
    human_gold_required_for_99_claim: true;
    provider_change_requires_dataset_rerun: true;
  };
};

export type MaterialGate = {
  gate_id: string;
  status: GateStatus;
  reason: string;
  evidenceRefs: string[];
  risk_flags?: string[];
};

export type VisionEvidencePage = {
  page_id: string;
  page_index: number;
  page_image_ref?: string;
  width?: number;
  height?: number;
  image_quality_confidence: number;
  quality_flags: string[];
};

export type VisionEvidenceQuestion = {
  question_id: string;
  question_number?: string;
  question_type_candidate?: string;
  page_id?: string;
  regions: Array<{
    region_id: string;
    region_role: string;
    page_id: string;
    bbox?: BoundingBox;
    polygon?: Polygon;
    crop_ref?: string;
    confidence: number;
  }>;
  confidence: number;
  risk_flags: string[];
};

export type VisionEvidenceType =
  | "question_stem"
  | "student_original_answer"
  | "student_revised_answer"
  | "student_process"
  | "student_note"
  | "teacher_mark"
  | "teacher_comment"
  | "teacher_score"
  | "answer_key"
  | "rubric"
  | "material_metadata";

export type VisionEvidence = {
  evidence_id: string;
  evidence_ref: string;
  source_material_id: string;
  page_id: string;
  question_id: string;
  region_id?: string;
  evidence_type: VisionEvidenceType;
  text?: string;
  raw_ocr_text?: string;
  normalized_text?: string;
  bbox?: BoundingBox;
  polygon?: Polygon;
  crop_ref?: string;
  confidence: number;
  teacher_verified: boolean;
  risk_flags: string[];
};

export type VisionEvidencePacket = {
  schema_version: "vision_evidence_packet.v0.4";
  plugin_run_id: string;
  material_id: string;
  source_material_id: string;
  tenant_id?: string;
  teacher_id?: string;
  student_id: string;
  student_identity_status?: "confirmed" | "uncertain" | "conflict";
  plugin_provider: string;
  plugin_model_version: string;
  material_state: MaterialState;
  created_at: string;
  pages: VisionEvidencePage[];
  questions: VisionEvidenceQuestion[];
  evidences: VisionEvidence[];
  gates: MaterialGate[];
  plugin_errors: Array<{
    code: string;
    message: string;
    recoverable: boolean;
  }>;
  pipeline_trace?: VisionEvidencePacketPipelineTrace;
  metadata?: Record<string, unknown>;
};

export type VisionProviderInput = {
  materialId: string;
  studentId: string;
  teacherId?: string;
  tenantId?: string;
  fixtureId?: MockVisionFixtureId;
  sourceKind?: "image" | "pdf" | "text" | "mock";
  uploadedFileRef?: string;
  textHint?: string;
};

export type VisionProvider = {
  name: string;
  analyzeMaterial(input: VisionProviderInput): Promise<VisionEvidencePacket>;
};

export type MockVisionFixtureId =
  | "clear_exam_with_teacher_correction"
  | "wrong_question_final_answer_no_key"
  | "blank_question_template"
  | "student_notes_only"
  | "student_identity_mismatch";

export type CorrectnessStatus = "correct" | "partially_correct" | "incorrect" | "unknown" | "needs_teacher_review";

export type K12MaterialType =
  | "exam"
  | "homework"
  | "wrong_question"
  | "wrong_question_book"
  | "unit_quiz"
  | "weekly_test"
  | "monthly_test"
  | "student_notes"
  | "practice_record"
  | "other_student_material";

export type K12EducationStage = "primary" | "middle" | "high" | "unknown";

export type K12Subject =
  | "语文"
  | "数学"
  | "英语"
  | "日语"
  | "俄语"
  | "德语"
  | "法语"
  | "西班牙语"
  | "物理"
  | "化学"
  | "生物"
  | "生物学"
  | "历史"
  | "地理"
  | "道德与法治"
  | "思想政治"
  | "科学"
  | "信息科技"
  | "信息技术"
  | "通用技术"
  | "其他";

export type K12MaterialClassification = {
  material_type: K12MaterialType;
  subject: K12Subject;
  education_stage: K12EducationStage;
  grade_candidate: string;
  region_or_curriculum_candidate: string;
  classification_confidence: number;
  evidenceRefs: string[];
};

export type CorrectnessJudgement = {
  status: CorrectnessStatus;
  source_basis: "answer_key" | "rubric" | "teacher_correction" | "mixed" | "insufficient";
  explanation: string;
  evidenceRefs: string[];
  confidence: number;
  degradeReason?: DegradedReason;
};

export type KnowledgeMapping = {
  knowledge_point_id?: string;
  knowledge_point_label: string;
  mapping_reason: string;
  evidenceRefs: string[];
  confidence: number;
};

export type MistakeDiagnosis = {
  diagnosis_type:
    | "knowledge_gap"
    | "condition_extraction_error"
    | "process_omission"
    | "representation_error"
    | "calculation_error"
    | "expression_incomplete"
    | "review_or_checking_gap"
    | "unknown";
  explanation: string;
  evidenceRefs: string[];
  confidence: number;
  suggested_verification?: string;
};

export type StudentProfileUpdateSuggestion = {
  suggestion_type:
    | "weakness_event"
    | "ability_snapshot"
    | "recurrence_risk"
    | "action_plan"
    | "monthly_report_source"
    | "parent_communication_note";
  content: string;
  evidenceRefs: string[];
  confidence: number;
  teacher_confirmation_required: true;
  status: "draft" | "needs_teacher_review" | "rejected" | "confirmed";
};

export type NextLearningAction = {
  action_type: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  verification_method: string;
  evidenceRefs: string[];
};

export type WeChatFeedbackSentence = {
  text: string;
  evidenceRefs: string[];
};

export type WeChatParentFeedbackDraft = {
  status: "draft" | "blocked" | "needs_teacher_review";
  text: string;
  sentences: WeChatFeedbackSentence[];
  warnings: string[];
  forbidden_terms_found: string[];
};

export type TeacherProfessionalReport = {
  report_title: string;
  assessment_style: "professional_evaluation";
  material_overview: string;
  overall_conclusion: string;
  score_or_completion_summary: string;
  question_table_summary: string;
  knowledge_mastery_summary: string;
  ability_dimension_summary: string;
  error_pattern_summary: string;
  priority_focus: string;
  consolidation_suggestions: string[];
  teacher_review_boundary: string;
  evidenceRefs: string[];
};

export type MonthlyReportSnapshot = {
  source_analysis_id: string;
  student_id: string;
  month: string;
  subject: K12Subject;
  material_type: K12MaterialType;
  material_date: string;
  score_summary: string;
  question_count: number;
  analyzable_question_count: number;
  knowledge_points: string[];
  ability_dimensions: string[];
  error_patterns: string[];
  main_progress_signal: string;
  main_issue_signal: string;
  first_priority_action: string;
  parent_visible_summary: string;
  teacher_only_notes: string[];
  confidence: number;
  evidenceRefs: string[];
  teacher_confirmed: false;
};

export type MonthlyComparisonSeed = {
  previous_month_snapshot?: {
    month: string;
    main_issue_signal: string;
    first_priority_action: string;
    confidence: number;
    evidenceRefs: string[];
  };
  current_month_snapshot: {
    month: string;
    main_progress_signal: string;
    main_issue_signal: string;
    first_priority_action: string;
    confidence: number;
  };
  trend_by_knowledge_point: Array<{
    knowledge_point: string;
    trend: "improved" | "stable" | "watch" | "insufficient_evidence";
    evidenceRefs: string[];
  }>;
  trend_by_ability_dimension: Array<{
    dimension: string;
    trend: "improved" | "stable" | "watch" | "insufficient_evidence";
    evidenceRefs: string[];
  }>;
  trend_by_error_pattern: Array<{
    pattern: string;
    trend: "new" | "repeated" | "improved" | "insufficient_evidence";
    evidenceRefs: string[];
  }>;
  new_issues: string[];
  improved_issues: string[];
  repeated_issues: string[];
  confidence_change: string;
  teacher_interpretation: string;
  parent_readable_comparison: string;
  evidenceRefs: string[];
};

export type ModelExecutionContract = {
  input_schema: "VisionEvidencePacket";
  output_schema: "StudentLearningMaterialAnalysis";
  vision_provider_replaceable: boolean;
  reasoning_model_replaceable: boolean;
  strict_json_schema_preferred: boolean;
  provider_name?: string;
  model_name?: string;
};

export type StudentLearningMaterialAnalysis = {
  schema_version: "student_learning_material_analysis.v0.4";
  analysis_id: string;
  source_material_id: string;
  student_id: string;
  material_state: MaterialState;
  material_classification: K12MaterialClassification;
  gates: MaterialGate[];
  accuracy_policy: {
    high_confidence_target: ">=99%";
    auto_judgement_rule: string;
    refusal_rule: string;
    unsupported_definitive_judgement_allowed: false;
  };
  evidence_summary: {
    usableEvidenceRefs: string[];
    missing_context: string[];
    reliability_notes: string[];
  };
  question_analyses: Array<{
    question_id: string;
    question_number?: string;
    material_refs: string[];
    correctnessJudgement: CorrectnessJudgement;
    knowledgeMapping: KnowledgeMapping[];
    mistakeDiagnosis: MistakeDiagnosis[];
    nextActions: NextLearningAction[];
    confidence: number;
    evidenceRefs: string[];
    degradeReason?: DegradedReason;
  }>;
  student_profile_update_suggestions: StudentProfileUpdateSuggestion[];
  next_learning_actions: NextLearningAction[];
  teacher_professional_report: TeacherProfessionalReport;
  wechat_parent_feedback_draft: WeChatParentFeedbackDraft;
  monthly_report_snapshot: MonthlyReportSnapshot;
  monthly_comparison_seed: MonthlyComparisonSeed;
  model_contract: ModelExecutionContract;
  teacher_review_required: boolean;
  risk_flags: string[];
  audit: {
    runtime_model: string;
    vision_plugin_run_id: string;
    created_at: string;
    error_sources: string[];
    context_record_ids?: string[];
    token_usage?: Record<string, unknown>;
  };
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type TrustedTeacherContext = {
  teacherId: string;
  tenantId?: string;
};

export type AnalysisJob = {
  id: string;
  materialId: string;
  studentId: string;
  teacherId: string;
  tenantId?: string;
  status: AnalysisJobStatus;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export type TeacherReviewItem = {
  id: string;
  analysisId: string;
  analysisJobId: string;
  materialId: string;
  studentId: string;
  teacherId: string;
  itemType: "risk" | "profile_update" | "wechat_feedback" | "correctness_review" | "next_action";
  title: string;
  content: Record<string, unknown>;
  evidenceRefs: string[];
  status: "pending" | "confirmed" | "rejected";
  riskFlags: string[];
};

export type LearningMaterialAnalyzerRepository = {
  saveVisionEvidencePacket(context: TrustedTeacherContext, packet: VisionEvidencePacket): Promise<{ packetId: string }>;
  getVisionEvidencePacket(context: TrustedTeacherContext, materialId: string): Promise<VisionEvidencePacket | null>;
  saveStudentLearningMaterialAnalysisDraft(
    context: TrustedTeacherContext,
    input: {
      analysisJobId: string;
      materialId: string;
      packetId?: string;
      analysis: StudentLearningMaterialAnalysis;
      validationErrors: string[];
      safetyWarnings: string[];
    }
  ): Promise<{ analysisId: string }>;
  createTeacherReviewItems(context: TrustedTeacherContext, items: TeacherReviewItem[]): Promise<TeacherReviewItem[]>;
  getAnalysisJob(context: TrustedTeacherContext, analysisJobId: string): Promise<AnalysisJob | null>;
  updateAnalysisJobStatus(
    context: TrustedTeacherContext,
    analysisJobId: string,
    status: AnalysisJobStatus,
    metadata?: Record<string, unknown>
  ): Promise<void>;
};

export type LearningMaterialAnalysisModel = {
  generateAnalysis(input: {
    packet: VisionEvidencePacket;
    answerKeys?: unknown[];
    rubrics?: unknown[];
    knowledgePoints?: unknown[];
    studentProfileHistory?: unknown[];
    prompt: string;
  }): Promise<unknown>;
};
