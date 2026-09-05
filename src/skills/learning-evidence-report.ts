export type LearningEvidenceMaterialType =
  | "exam"
  | "homework"
  | "writing"
  | "reading_material"
  | "oral_practice"
  | "experiment_report"
  | "project_artifact"
  | "classroom_record"
  | "other";

export type LearningEvidenceAbilityDimension =
  | "task_understanding"
  | "core_concepts"
  | "process_method"
  | "expression_presentation"
  | "transfer_application"
  | "self_check";

export type LearningEvidenceAbilityLevel = "strong" | "stable" | "developing" | "needs_attention";
export type LearningEvidenceConfidence = "low" | "medium" | "high";
export type LearningEvidenceQuestionJudgement = "correct" | "partially_correct" | "incorrect" | "unknown" | "needs_teacher_review";
export type LearningEvidenceQuestionGate = "auto_judgement_allowed" | "teacher_review_required";

export type LearningEvidenceMaterialState =
  | "valid_student_material"
  | "insufficient_student_trace"
  | "blank_template"
  | "teacher_resource"
  | "low_quality"
  | "needs_review";

export type LearningEvidenceQuestionAnalysis = {
  question_id: string;
  question_number: string;
  question_type: string;
  stem_summary: string;
  student_answer_summary: string;
  answer_basis: "answer_key" | "rubric" | "teacher_correction" | "mixed" | "insufficient";
  judgement: LearningEvidenceQuestionJudgement;
  judgement_gate: LearningEvidenceQuestionGate;
  key_error: string;
  knowledge_points: string[];
  ability_dimensions: LearningEvidenceAbilityDimension[];
  mistake_pattern: string;
  recoverable_score_note: string;
  correction_suggestion: string;
  confidence_level: LearningEvidenceConfidence;
  evidence_refs: string[];
  teacher_review_required: boolean;
  review_reason?: string;
};

export type LearningEvidenceMonthlySnapshot = {
  source_analysis_id: string;
  student_id: string;
  month: string;
  subject: string;
  material_type: LearningEvidenceMaterialType;
  material_date: string;
  score_summary: string;
  question_count: number;
  analyzable_question_count: number;
  knowledge_points: string[];
  ability_dimensions: LearningEvidenceAbilityDimension[];
  error_patterns: string[];
  main_progress_signal: string;
  main_issue_signal: string;
  first_priority_action: string;
  parent_visible_summary: string;
  teacher_only_notes: string[];
  confidence_level: LearningEvidenceConfidence;
  evidence_refs: string[];
  teacher_confirmed: boolean;
};

export type LearningEvidenceMonthlyComparisonSeed = {
  previous_month_snapshot: {
    month: string;
    main_issue_signal: string;
    first_priority_action: string;
    confidence_level: LearningEvidenceConfidence;
  };
  current_month_snapshot: Pick<
    LearningEvidenceMonthlySnapshot,
    "month" | "main_progress_signal" | "main_issue_signal" | "first_priority_action" | "confidence_level"
  >;
  trend_by_knowledge_point: Array<{
    knowledge_point: string;
    trend: "improved" | "stable" | "watch" | "insufficient_evidence";
    evidence: string;
  }>;
  trend_by_ability_dimension: Array<{
    dimension: LearningEvidenceAbilityDimension;
    trend: "improved" | "stable" | "watch" | "insufficient_evidence";
    evidence: string;
  }>;
  trend_by_error_pattern: Array<{
    pattern: string;
    trend: "new" | "repeated" | "improved" | "insufficient_evidence";
    evidence: string;
  }>;
  new_issues: string[];
  improved_issues: string[];
  repeated_issues: string[];
  confidence_change: string;
  teacher_interpretation: string;
  parent_readable_comparison: string;
};

export type LearningEvidenceReport = {
  schema_version: "learning_evidence_report_v1";
  material_overview: {
    material_type: LearningEvidenceMaterialType;
    material_label: string;
    subject_area: string;
    input_summary: string;
    material_state: LearningEvidenceMaterialState;
    education_stage: "primary" | "middle" | "high" | "unknown";
    grade_candidate: string;
    region_or_curriculum_candidate: string;
    recognized_question_count: number;
    analyzable_question_count: number;
  };
  accuracy_policy: {
    target_for_high_confidence_items: ">=99%";
    auto_judgement_rule: string;
    refusal_rule: string;
    unsupported_definitive_judgement_allowed: false;
  };
  overview_judgement: {
    current_performance: string;
    main_strengths: string[];
    main_issues: string[];
    first_priority_action: string;
    confidence_level: LearningEvidenceConfidence;
  };
  data_validation: {
    usable_evidence: string[];
    missing_context: string[];
    reliability_notes: string[];
    teacher_review_required_items: string[];
  };
  question_analyses: LearningEvidenceQuestionAnalysis[];
  improvement_path_map: {
    recoverable_points: string[];
    bottlenecks: string[];
    next_breakthrough: string;
  };
  ability_profile: Array<{
    dimension: LearningEvidenceAbilityDimension;
    label: string;
    level: LearningEvidenceAbilityLevel;
    evidence: string;
    next_focus: string;
  }>;
  problem_pattern_clusters: Array<{
    cluster: string;
    evidence: string[];
    likely_cause: string;
    intervention: string;
  }>;
  key_evidence_cards: Array<{
    title: string;
    question_ref?: string;
    issue_type?: string;
    student_trace?: string;
    observation: string;
    implication: string;
    correction_suggestion?: string;
    teacher_check: string;
  }>;
  priority_queue: Array<{
    priority: 1 | 2 | 3;
    item: string;
    reason: string;
    action: string;
    acceptance_criteria: string;
  }>;
  recurrence_risks: Array<{
    risk: string;
    trigger_scene: string;
    warning_signal: string;
    prevention_action: string;
  }>;
  short_cycle_plan: {
    three_day: string[];
    seven_day: string[];
    next_three_lessons: string[];
  };
  next_learning_checklist: string[];
  collaboration_actions: {
    student: string[];
    teacher: string[];
    parent: string[];
  };
  parent_readable_summary: string;
  parent_feedback_draft: {
    status: "draft" | "blocked" | "needs_teacher_review";
    text: string;
    safety_warnings: string[];
    evidence_refs: string[];
  };
  teacher_professional_report: {
    report_title: string;
    assessment_style: "professional_evaluation";
    overall_conclusion: string;
    question_table_ready: boolean;
    priority_focus: string;
    teacher_review_boundary: string;
  };
  monthly_report_snapshot: LearningEvidenceMonthlySnapshot;
  monthly_comparison_seed: LearningEvidenceMonthlyComparisonSeed;
  model_contract: {
    vision_provider_replaceable: boolean;
    reasoning_model_replaceable: boolean;
    required_input_schema: "VisionEvidencePacket";
    required_output_schema: "StudentLearningMaterialAnalysis";
    strict_schema_preferred: boolean;
  };
  student_profile_update_suggestions: Array<{
    target: "ability_profile" | "weakness_event" | "recurrence_risk" | "action_plan" | "monthly_report_source";
    label: string;
    suggested_value: string;
    evidence: string;
    selected_by_default: boolean;
  }>;
};

export type LearningEvidenceReportSummary = {
  material_type: string;
  subject: string;
  current_performance: string;
  main_strengths: string[];
  main_issues: string[];
  first_priority_action: string;
  parent_summary: string;
};

export function createMockLearningEvidenceReport(input: {
  subjectName: string;
  inputSummary: string;
  subjectArea?: string;
}): LearningEvidenceReport {
  const material = inferLearningEvidenceMaterial(input.inputSummary);
  const subjectArea = normalizeProvidedSubjectArea(input.subjectArea) || inferSubjectArea(input.inputSummary);
  const evidenceText = input.inputSummary || "老师提供的学习材料摘要";
  const questionAnalyses = createMockQuestionAnalyses(subjectArea);
  const analyzableQuestionCount = questionAnalyses.filter((item) => item.judgement_gate === "auto_judgement_allowed").length;
  const monthlySnapshot = createMonthlySnapshot({
    materialType: material.type,
    subjectArea,
    subjectName: input.subjectName,
    questionAnalyses
  });

  return {
    schema_version: "learning_evidence_report_v1",
    material_overview: {
      material_type: material.type,
      material_label: material.label,
      subject_area: subjectArea,
      input_summary: evidenceText,
      material_state: "valid_student_material",
      education_stage: inferEducationStage(input.inputSummary),
      grade_candidate: inferGradeCandidate(input.inputSummary),
      region_or_curriculum_candidate: inferRegionOrCurriculum(input.inputSummary),
      recognized_question_count: questionAnalyses.length,
      analyzable_question_count: analyzableQuestionCount
    },
    accuracy_policy: {
      target_for_high_confidence_items: ">=99%",
      auto_judgement_rule: "只有题干、学生答案、答案/评分点或清晰批改痕迹都可用，且证据置信度达标时，才允许生成确定性逐题判断。",
      refusal_rule: "证据不足、答案缺失、题目切分不稳或学生作答识别不清时，必须标记为需老师确认，不得硬判。",
      unsupported_definitive_judgement_allowed: false
    },
    overview_judgement: {
      current_performance: `${input.subjectName}能理解材料的主要任务，但独立完成时对关键信息的提取和呈现还不够稳定。`,
      main_strengths: ["能抓住任务主线", "愿意根据反馈继续修正", "基础配合度较好"],
      main_issues: ["关键信息提取不稳定", "过程表达不够完整", "迁移到新任务时容易遗漏条件"],
      first_priority_action: "先训练审题/审材料流程：圈出任务目标、标出关键条件，再组织答案或解题步骤。",
      confidence_level: "medium"
    },
    data_validation: {
      usable_evidence: [evidenceText, "当前学生档案中的近期学习重点", "老师补充的课堂观察"],
      missing_context: input.inputSummary ? [] : ["缺少原始材料或老师对表现的具体描述"],
      reliability_notes: ["当前为 mock 分析，结论需老师确认后才能入档。", "未使用真实 AI 或真实数据库。"],
      teacher_review_required_items: questionAnalyses.filter((item) => item.teacher_review_required).map((item) => `${item.question_number}：${item.review_reason || "需要老师确认"}`)
    },
    question_analyses: questionAnalyses,
    improvement_path_map: {
      recoverable_points: ["任务目标识别", "关键条件标注", "步骤/观点表达完整性"],
      bottlenecks: ["没有先拆任务就开始作答", "检查时只看结果，不回看条件是否用全"],
      next_breakthrough: "把每次材料处理固定成三步：看目标、找证据、复查表达。"
    },
    ability_profile: [
      createAbility("task_understanding", "任务理解", "developing", "能理解大方向，但复杂任务下容易漏限制条件。", "每题先复述任务目标。"),
      createAbility("core_concepts", "核心知识/概念", "stable", "对本次材料中的基础概念能跟上。", "继续补足概念和具体任务之间的连接。"),
      createAbility("process_method", "方法过程", "developing", "过程能展开，但顺序和完整性不稳定。", "用固定步骤卡完成材料处理。"),
      createAbility("expression_presentation", "表达呈现", "needs_attention", "表达容易少依据或少结论。", "训练用证据支撑观点，并补完整结论。"),
      createAbility("transfer_application", "迁移应用", "developing", "换到新材料时稳定性下降。", "做同类材料小批量迁移。"),
      createAbility("self_check", "自我检查", "developing", "检查更多停留在结果层。", "按条件、步骤、表达三项复查。")
    ],
    problem_pattern_clusters: [
      {
        cluster: "任务条件遗漏",
        evidence: ["关键信息没有全部进入作答过程", "遇到材料较长时先做后审"],
        likely_cause: "处理任务前缺少稳定的标注流程。",
        intervention: "每次先圈任务目标和限制条件，再动笔。"
      },
      {
        cluster: "表达链条不完整",
        evidence: ["答案或说明中有观点，但证据和结论连接不足"],
        likely_cause: "知道意思，但没有形成完整表达模板。",
        intervention: "使用“观点-证据-结论”或“条件-步骤-结果”表达框架。"
      }
    ],
    key_evidence_cards: [
      {
        title: "条件提取不完整",
        question_ref: "第 2 题 / 材料片段 1",
        issue_type: "关键信息遗漏",
        student_trace: "能看出主要要求，但没有把限制条件完整带入作答。",
        observation: "学生抓住了主任务，但容易漏掉题干或材料里的关键限制。",
        implication: "这会影响后续步骤、表达完整性和迁移到同类题的稳定性。",
        correction_suggestion: "先圈出任务目标和限制条件，再写步骤或观点；最后按条件逐项回看。",
        teacher_check: "请老师核对本题是否确实存在关键条件遗漏。"
      },
      {
        title: "过程表达不够完整",
        question_ref: "第 7 题 / 材料片段 2",
        issue_type: "步骤或依据缺失",
        student_trace: "答案方向基本对，但中间依据、步骤或结论呈现不够完整。",
        observation: "学生能理解部分内容，但独立表达时容易少依据或少结论。",
        implication: "如果只看最终结果，后续遇到新题型或长材料时仍容易波动。",
        correction_suggestion: "用“条件/证据 - 步骤/观点 - 结论”固定表达结构。",
        teacher_check: "请老师补充最典型的一道题或一段材料。"
      },
      {
        title: "迁移到新任务时稳定性下降",
        question_ref: "综合题 / 同类变式",
        issue_type: "迁移应用波动",
        student_trace: "换成相似但条件不同的材料后，容易沿用旧方法或漏看新条件。",
        observation: "学生不是完全不会，而是流程还没有稳定迁移。",
        implication: "下次课更适合做少量同类变式复盘，而不是直接增加大量题量。",
        correction_suggestion: "先做 2-3 个同类变式，要求学生说出“这题和上一题哪里不同”。",
        teacher_check: "请老师确认这个问题是否在最近几次材料中反复出现。"
      }
    ],
    priority_queue: [
      {
        priority: 1,
        item: "任务理解流程",
        reason: "这是后续表达、迁移和检查的入口。",
        action: "每份材料先写出任务目标和限制条件。",
        acceptance_criteria: "能独立标出 80% 以上关键条件。"
      },
      {
        priority: 2,
        item: "表达完整性",
        reason: "影响作业、考试和家长可见成果。",
        action: "用固定句式补足依据和结论。",
        acceptance_criteria: "答案能包含观点/步骤、证据/条件、结论。"
      },
      {
        priority: 3,
        item: "迁移稳定性",
        reason: "同类新任务中容易复发。",
        action: "安排 3 组同类型变式材料。",
        acceptance_criteria: "新材料中错误类型明显减少。"
      }
    ],
    recurrence_risks: [
      {
        risk: "复杂任务中漏关键条件",
        trigger_scene: "题干较长、材料信息多、要求分步骤表达时。",
        warning_signal: "直接下笔、没有标注、答案缺少限制条件。",
        prevention_action: "先圈条件，再写步骤，最后按条件逐项复查。"
      }
    ],
    short_cycle_plan: {
      three_day: ["整理本次材料中的关键条件", "完成 2 道/2 段同类材料复盘"],
      seven_day: ["做一次小批量迁移练习", "让学生口头复述任务目标和作答依据"],
      next_three_lessons: ["第 1 次固定审题流程", "第 2 次训练表达完整性", "第 3 次做迁移和复查"]
    },
    next_learning_checklist: ["先说清任务目标", "标出关键条件或证据", "按步骤完成", "检查是否遗漏限制", "补完整结论或家长可见表达"],
    collaboration_actions: {
      student: ["每次先标注再作答", "完成后按清单自查"],
      teacher: ["下次课先示范一遍材料处理流程", "保留一条可入档的跟进记录"],
      parent: ["关注孩子是否按步骤处理材料", "不急着催速度，先看过程是否完整"]
    },
    parent_readable_summary: `${input.subjectName}这次材料能抓住主要任务，但还需要继续练习关键信息提取和表达完整性。后续建议先把审题/审材料流程固定下来，再做同类任务迁移。`,
    parent_feedback_draft: {
      status: "needs_teacher_review",
      text: `${input.subjectName}这次${material.label}整体能抓住主要任务，订正时也愿意根据提示补充过程。接下来更需要关注的是审题时关键信息提取和步骤表达完整性，我们会先把“圈条件、列步骤、回看答案”的流程稳定下来，再逐步做同类题迁移。家里配合时可以先看孩子有没有按步骤处理材料，不急着只看速度。`,
      safety_warnings: ["家长反馈仍需老师确认后再复制发送。", "不包含分数承诺和负面标签。"],
      evidence_refs: ["ev-q1-student-answer", "ev-q2-teacher-correction", "ev-report-summary"]
    },
    teacher_professional_report: {
      report_title: `${input.subjectName}${material.label}专业测评型学情报告`,
      assessment_style: "professional_evaluation",
      overall_conclusion: `${input.subjectName}本次材料显示任务理解有基础，但审题信息提取、步骤表达和自我检查仍是影响稳定性的主要变量。`,
      question_table_ready: true,
      priority_focus: "先稳定逐题审题标注和步骤复查流程。",
      teacher_review_boundary: "低置信题、缺少评分点题和学生答案识别不完整题只作为待确认线索，不写入长期画像。"
    },
    monthly_report_snapshot: monthlySnapshot,
    monthly_comparison_seed: createMonthlyComparisonSeed(monthlySnapshot),
    model_contract: {
      vision_provider_replaceable: true,
      reasoning_model_replaceable: true,
      required_input_schema: "VisionEvidencePacket",
      required_output_schema: "StudentLearningMaterialAnalysis",
      strict_schema_preferred: true
    },
    student_profile_update_suggestions: [
      {
        target: "ability_profile",
        label: "更新能力画像：表达呈现待加强",
        suggested_value: "表达呈现维度需要继续训练依据和结论完整性。",
        evidence: "本次材料中观点、条件和结论连接不够稳定。",
        selected_by_default: true
      },
      {
        target: "weakness_event",
        label: "新增薄弱点事件：关键信息提取不稳定",
        suggested_value: "复杂学习材料中容易遗漏关键条件。",
        evidence: evidenceText,
        selected_by_default: true
      },
      {
        target: "recurrence_risk",
        label: "新增复发风险：复杂任务漏条件",
        suggested_value: "材料长、条件多时容易先做后审。",
        evidence: "问题模式聚类显示任务条件遗漏。",
        selected_by_default: true
      },
      {
        target: "action_plan",
        label: "生成下次跟进：审题/审材料流程",
        suggested_value: "下次课先训练任务目标、关键条件、表达复查三步。",
        evidence: "第一优先动作指向流程稳定性。",
        selected_by_default: true
      },
      {
        target: "monthly_report_source",
        label: "加入月报素材：表达规范问题",
        suggested_value: "本次材料体现出表达完整性和过程呈现需要加强。",
        evidence: "能力画像中 expression_presentation 为 needs_attention。",
        selected_by_default: false
      }
    ]
  };
}

export function summarizeLearningEvidenceReport(report: LearningEvidenceReport): LearningEvidenceReportSummary {
  return {
    material_type: report.material_overview.material_label,
    subject: report.material_overview.subject_area,
    current_performance: report.overview_judgement.current_performance,
    main_strengths: report.overview_judgement.main_strengths,
    main_issues: report.overview_judgement.main_issues,
    first_priority_action: report.overview_judgement.first_priority_action,
    parent_summary: report.parent_readable_summary
  };
}

function createAbility(
  dimension: LearningEvidenceAbilityDimension,
  label: string,
  level: LearningEvidenceAbilityLevel,
  evidence: string,
  nextFocus: string
) {
  return {
    dimension,
    label,
    level,
    evidence,
    next_focus: nextFocus
  };
}

function createMockQuestionAnalyses(subjectArea: string): LearningEvidenceQuestionAnalysis[] {
  const coreKnowledgePoint = subjectArea.includes("英语")
    ? "阅读信息定位与表达完整性"
    : subjectArea.includes("语文")
      ? "材料信息提取与观点表达"
      : subjectArea.includes("数学")
        ? "应用题条件提取与步骤表达"
        : "学习材料关键信息提取";

  return [
    {
      question_id: "q1",
      question_number: "第 1 题",
      question_type: "基础理解题",
      stem_summary: "考查学生是否能识别题目核心要求并调用基础知识。",
      student_answer_summary: "学生答案方向基本正确，关键步骤或依据表达较完整。",
      answer_basis: "mixed",
      judgement: "correct",
      judgement_gate: "auto_judgement_allowed",
      key_error: "未见明显关键错误。",
      knowledge_points: [coreKnowledgePoint],
      ability_dimensions: ["task_understanding", "core_concepts"],
      mistake_pattern: "无明显错误模式",
      recoverable_score_note: "该题可作为稳定表现证据。",
      correction_suggestion: "保持先标注任务目标再作答的流程。",
      confidence_level: "high",
      evidence_refs: ["ev-q1-stem", "ev-q1-student-answer", "ev-q1-answer-key"],
      teacher_review_required: false
    },
    {
      question_id: "q2",
      question_number: "第 2 题",
      question_type: "综合应用题",
      stem_summary: "题干条件较多，需要学生先提取限制条件再组织步骤。",
      student_answer_summary: "学生能抓住主方向，但答案中遗漏一个关键限制条件。",
      answer_basis: "teacher_correction",
      judgement: "partially_correct",
      judgement_gate: "auto_judgement_allowed",
      key_error: "关键条件没有完整进入作答过程。",
      knowledge_points: [coreKnowledgePoint, "条件筛选与过程表达"],
      ability_dimensions: ["task_understanding", "process_method", "self_check"],
      mistake_pattern: "复杂任务中漏关键条件",
      recoverable_score_note: "若补齐限制条件和对应步骤，本题有明确可追回分。",
      correction_suggestion: "订正时要求学生圈出所有限制条件，并逐项说明答案是否用到。",
      confidence_level: "high",
      evidence_refs: ["ev-q2-stem", "ev-q2-student-answer", "ev-q2-teacher-correction"],
      teacher_review_required: false
    },
    {
      question_id: "q3",
      question_number: "第 3 题",
      question_type: "过程表达题",
      stem_summary: "需要结合材料或条件写出完整过程。",
      student_answer_summary: "学生答案局部可见，但关键步骤识别不完整。",
      answer_basis: "insufficient",
      judgement: "needs_teacher_review",
      judgement_gate: "teacher_review_required",
      key_error: "不能仅凭当前证据确定错因。",
      knowledge_points: [coreKnowledgePoint],
      ability_dimensions: ["expression_presentation", "self_check"],
      mistake_pattern: "证据不足，不能确定错误模式",
      recoverable_score_note: "缺少清晰评分点或完整学生作答，不计算可追回分。",
      correction_suggestion: "请老师补充本题标准答案、评分点或更清晰的学生作答截图。",
      confidence_level: "low",
      evidence_refs: ["ev-q3-partial-answer"],
      teacher_review_required: true,
      review_reason: "学生答案或评分点不完整，按 99% 口径拒绝自动硬判"
    }
  ];
}

function createMonthlySnapshot(input: {
  materialType: LearningEvidenceMaterialType;
  subjectArea: string;
  subjectName: string;
  questionAnalyses: LearningEvidenceQuestionAnalysis[];
}): LearningEvidenceMonthlySnapshot {
  const analyzableQuestions = input.questionAnalyses.filter((item) => item.judgement_gate === "auto_judgement_allowed");

  return {
    source_analysis_id: "mock_analysis_learning_evidence_001",
    student_id: input.subjectName,
    month: "2026-06",
    subject: input.subjectArea,
    material_type: input.materialType,
    material_date: "2026-06-19",
    score_summary: "当前 mock 材料未读取真实总分；只沉淀可核对的逐题表现信号。",
    question_count: input.questionAnalyses.length,
    analyzable_question_count: analyzableQuestions.length,
    knowledge_points: Array.from(new Set(input.questionAnalyses.flatMap((item) => item.knowledge_points))),
    ability_dimensions: Array.from(new Set(input.questionAnalyses.flatMap((item) => item.ability_dimensions))),
    error_patterns: Array.from(new Set(input.questionAnalyses.map((item) => item.mistake_pattern).filter((item) => item !== "无明显错误模式"))),
    main_progress_signal: "订正和基础题表现能显示出愿意按提示修正。",
    main_issue_signal: "复杂任务中关键信息提取和步骤表达仍不稳定。",
    first_priority_action: "下月继续固定圈条件、列步骤、回看答案的流程。",
    parent_visible_summary: `${input.subjectName}本月材料显示基础配合度较好，但复杂题中还要继续稳定审题和表达流程。`,
    teacher_only_notes: ["低置信题不进入确定性月报趋势。", "月报纵向比较只使用老师确认后的分析快照。"],
    confidence_level: "medium",
    evidence_refs: Array.from(new Set(input.questionAnalyses.flatMap((item) => item.evidence_refs))),
    teacher_confirmed: false
  };
}

function createMonthlyComparisonSeed(snapshot: LearningEvidenceMonthlySnapshot): LearningEvidenceMonthlyComparisonSeed {
  return {
    previous_month_snapshot: {
      month: "2026-05",
      main_issue_signal: "上月主要问题集中在读题后直接下笔，缺少条件整理。",
      first_priority_action: "先训练题干条件标注。",
      confidence_level: "medium"
    },
    current_month_snapshot: {
      month: snapshot.month,
      main_progress_signal: snapshot.main_progress_signal,
      main_issue_signal: snapshot.main_issue_signal,
      first_priority_action: snapshot.first_priority_action,
      confidence_level: snapshot.confidence_level
    },
    trend_by_knowledge_point: snapshot.knowledge_points.slice(0, 2).map((knowledgePoint, index) => ({
      knowledge_point: knowledgePoint,
      trend: index === 0 ? "stable" : "watch",
      evidence: index === 0 ? "基础理解题表现较稳定。" : "综合应用题仍出现条件遗漏。"
    })),
    trend_by_ability_dimension: [
      {
        dimension: "task_understanding",
        trend: "improved",
        evidence: "能更快抓住题目主任务。"
      },
      {
        dimension: "self_check",
        trend: "watch",
        evidence: "复杂条件下仍需要老师提醒回看答案。"
      }
    ],
    trend_by_error_pattern: [
      {
        pattern: "复杂任务中漏关键条件",
        trend: "repeated",
        evidence: "本月材料仍出现同类条件遗漏。"
      }
    ],
    new_issues: [],
    improved_issues: ["基础题任务理解更稳定"],
    repeated_issues: ["复杂题条件遗漏"],
    confidence_change: "本月证据量与上月相近，可做谨慎纵向比较。",
    teacher_interpretation: "进步点在基础任务理解，复发点在复杂题审题流程，月报应同时呈现正向变化和下月重点。",
    parent_readable_comparison: "和上个月相比，孩子在基础题任务理解上更稳定一些；本月还需要继续关注复杂题中关键信息提取的稳定性。"
  };
}

function inferLearningEvidenceMaterial(inputSummary: string): { type: LearningEvidenceMaterialType; label: string } {
  if (inputSummary.includes("作文")) return { type: "writing", label: "作文/写作材料" };
  if (inputSummary.includes("口语")) return { type: "oral_practice", label: "口语练习记录" };
  if (inputSummary.includes("历史") || inputSummary.includes("阅读") || inputSummary.includes("材料题")) {
    return { type: "reading_material", label: "阅读/材料题" };
  }
  if (inputSummary.includes("实验")) return { type: "experiment_report", label: "实验报告" };
  if (inputSummary.includes("美术") || inputSummary.includes("音乐") || inputSummary.includes("作品") || inputSummary.includes("项目")) {
    return { type: "project_artifact", label: "艺术/项目制作品" };
  }
  if (inputSummary.includes("试卷") || inputSummary.includes("卷子") || inputSummary.includes("考试")) return { type: "exam", label: "试卷/考试材料" };
  if (inputSummary.includes("作业")) return { type: "homework", label: "作业材料" };
  if (inputSummary.includes("课堂") || inputSummary.includes("今天")) return { type: "classroom_record", label: "课堂记录" };
  return { type: "other", label: "老师提供的学习材料" };
}

function inferSubjectArea(inputSummary: string) {
  const subjects: string[] = [];
  if (inputSummary.includes("数学") || inputSummary.includes("函数") || inputSummary.includes("计算")) subjects.push("数学");
  if (inputSummary.includes("物理") || inputSummary.includes("受力") || inputSummary.includes("单位换算")) subjects.push("物理");
  if (inputSummary.includes("化学")) subjects.push("化学");
  if (inputSummary.includes("生物")) subjects.push("生物");
  if (inputSummary.includes("英语") || inputSummary.includes("口语")) subjects.push("英语");
  if (inputSummary.includes("作文") || inputSummary.includes("语文") || inputSummary.includes("阅读")) subjects.push("语文");
  if (inputSummary.includes("历史")) subjects.push("历史");
  if (inputSummary.includes("地理")) subjects.push("地理");
  if (inputSummary.includes("政治")) subjects.push("政治");
  if (inputSummary.includes("美术")) subjects.push("美术");
  if (inputSummary.includes("音乐")) subjects.push("音乐");

  if (subjects.length) return Array.from(new Set(subjects)).join("、");
  if (inputSummary.includes("实验")) return "科学/实验探究";
  if (inputSummary.includes("作品")) return "艺术/项目学习";
  return "全学科通用";
}

function normalizeProvidedSubjectArea(subjectArea?: string) {
  if (!subjectArea) return "";
  const normalized = subjectArea.trim();
  if (!normalized || normalized === "综合" || normalized === "全部" || normalized === "全部科目" || normalized === "全学科通用") return "";
  return normalized;
}

function inferEducationStage(inputSummary: string): LearningEvidenceReport["material_overview"]["education_stage"] {
  if (/高[一二三123]|高中/u.test(inputSummary)) return "high";
  if (/初[一二三123]|初中|中考/u.test(inputSummary)) return "middle";
  if (/小[一二三四五六123456]|小学/u.test(inputSummary)) return "primary";
  return "unknown";
}

function inferGradeCandidate(inputSummary: string) {
  const gradeMatch = inputSummary.match(/(小[一二三四五六]|小学[一二三四五六123456]年级|初[一二三]|初中[一二三123]年级|高[一二三]|高中[一二三123]年级)/u);
  return gradeMatch?.[0] || "未识别";
}

function inferRegionOrCurriculum(inputSummary: string) {
  const regionMatch = inputSummary.match(/(北京|上海|广东|深圳|广州|江苏|浙江|山东|河南|河北|四川|重庆|湖北|湖南|福建|安徽|陕西|山西|天津|辽宁|吉林|黑龙江|广西|云南|贵州|江西|海南|内蒙古|新疆|西藏|宁夏|青海|甘肃)/u);
  return regionMatch?.[0] || "未识别";
}
