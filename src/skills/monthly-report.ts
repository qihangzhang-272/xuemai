import type { MonthlyReportSnapshot } from "./student-learning-material-analyzer/types";

export type MonthlyReportScope = "student" | "class";
export type MonthlyReportConfidence = "high" | "medium" | "low";

export type MonthlyReportSource = {
  id: string;
  label: string;
  type: "learning_record" | "learning_evidence" | "feedback" | "class_lesson" | "teacher_note";
  summary: string;
  usable_for_parent: boolean;
};

export type StudentMonthlyComparison = {
  previous_month_label: string;
  current_month_label: string;
  summary: string;
  improved_signals: string[];
  stable_signals: string[];
  repeated_issues: string[];
  new_issues: string[];
  insufficient_evidence: string[];
  parent_readable_comparison: string;
  teacher_interpretation: string;
};

export type StudentMonthlyComparisonEvidence = {
  current_month_source_count: number;
  previous_month_source_count: number;
  previous_month_source_ids: string[];
  previous_month_report_used: boolean;
  previous_month_evidence_status: "available" | "missing";
};

export type StudentMonthlyReport = {
  schema_version: "student_monthly_report_v1";
  report_type: "student";
  audience: "parent";
  month_label: string;
  student_name: string;
  subject_area: string;
  readiness: {
    label: string;
    confidence_level: MonthlyReportConfidence;
    source_count: number;
    missing_sources: string[];
  };
  teacher_summary: {
    current_status: string;
    main_progress: string;
    main_issue: string;
    next_month_focus: string;
  };
  service_overview: {
    lesson_count: number;
    feedback_count: number;
    archived_record_count: number;
    material_count: number;
  };
  growth_signals: Array<{
    dimension: string;
    status: "stable" | "improving" | "watch";
    evidence: string;
    next_action: string;
  }>;
  month_over_month_comparison: StudentMonthlyComparison;
  comparison_evidence: StudentMonthlyComparisonEvidence;
  evidence_timeline: MonthlyReportSource[];
  next_month_plan: string[];
  parent_message: string;
  teacher_only_notes: string[];
  safeguards: string[];
};

export type ClassMonthlyReport = {
  schema_version: "class_monthly_report_v1";
  report_type: "class";
  audience: "teacher";
  month_label: string;
  class_name: string;
  subject_area: string;
  readiness: {
    label: string;
    confidence_level: MonthlyReportConfidence;
    source_count: number;
    missing_sources: string[];
  };
  teacher_overview: {
    class_status: string;
    teaching_rhythm: string;
    main_common_issue: string;
    next_month_priority: string;
  };
  service_metrics: {
    class_lesson_count: number;
    student_count: number;
    pending_feedback_count: number;
    ready_monthly_reports: number;
  };
  common_weaknesses: Array<{
    topic: string;
    affected_students: number;
    evidence: string;
    teaching_response: string;
  }>;
  student_segments: Array<{
    label: string;
    students: string[];
    teacher_action: string;
  }>;
  next_month_teaching_plan: Array<{
    layer: string;
    goal: string;
    action: string;
  }>;
  service_followups: Array<{
    item: string;
    owner: "teacher" | "assistant";
    status: "ready" | "needs_input" | "watch";
  }>;
  evidence_sources: MonthlyReportSource[];
  safeguards: string[];
};

export type MonthlyReport = StudentMonthlyReport | ClassMonthlyReport;

export type MonthlyReportSnapshotCandidate = Omit<MonthlyReportSnapshot, "teacher_confirmed"> & {
  teacher_confirmed: boolean;
  confirmed_at?: string;
  source_skill_run_id?: string;
  archive_record_id?: string;
  feedback_sent?: boolean;
};

export type ConfirmedMonthlyReportSnapshot = MonthlyReportSnapshotCandidate & {
  teacher_confirmed: true;
  confirmed_at: string;
};

export type MonthlyReportConfirmedSourceCandidate = {
  id: string;
  student_id: string;
  month: string;
  source_type: "learning_record" | "feedback" | "teacher_note";
  label: string;
  summary: string;
  occurred_at?: string;
  confirmed_at?: string;
  teacher_confirmed: boolean;
  usable_for_parent: boolean;
  subject_area?: string;
  progress_signals?: string[];
  issue_signals?: string[];
  next_actions?: string[];
  knowledge_points?: string[];
  ability_dimensions?: string[];
  evidenceRefs?: string[];
};

export type ConfirmedMonthlyReportSource = MonthlyReportConfirmedSourceCandidate & {
  teacher_confirmed: true;
  confirmed_at: string;
};

export type StudentMonthlyReportFromSnapshotsInput = {
  studentId: string;
  studentName: string;
  currentMonth: string;
  currentMonthLabel?: string;
  previousMonth?: string;
  previousMonthLabel?: string;
  subjectArea?: string;
  snapshots: MonthlyReportSnapshotCandidate[];
  previousMonthSnapshots?: MonthlyReportSnapshotCandidate[];
  confirmedSources?: MonthlyReportConfirmedSourceCandidate[];
  previousMonthConfirmedSources?: MonthlyReportConfirmedSourceCandidate[];
  previousReport?: StudentMonthlyReport;
  lessonCount?: number;
  feedbackCount?: number;
  archivedRecordCount?: number;
};

type PreviousReportReplayContext = {
  studentName: string;
  previousMonthLabel: string;
};

type MonthlyReportInput = {
  scope: MonthlyReportScope;
  subjectName: string;
  subjectArea?: string;
  inputSummary?: string;
};

export function createMockMonthlyReport(input: MonthlyReportInput): MonthlyReport {
  if (input.scope === "class") return createMockClassMonthlyReport(input);
  return createMockStudentMonthlyReport(input);
}

export function createMockStudentMonthlyReport(input: Omit<MonthlyReportInput, "scope">): StudentMonthlyReport {
  const subjectArea = input.subjectArea || inferSubjectArea(input.inputSummary);

  return createStudentMonthlyReportFromConfirmedSnapshots({
    studentId: "student-monthly-mock",
    studentName: input.subjectName,
    currentMonth: "2026-06",
    previousMonth: "2026-05",
    subjectArea,
    confirmedSources: createMockConfirmedMonthlySources("student-monthly-mock"),
    snapshots: [
      createMockConfirmedSnapshot({
        id: "student-month-source-1",
        studentId: "student-monthly-mock",
        month: "2026-06",
        materialType: "exam",
        materialDate: "2026-06-10",
        scoreSummary: "一次函数应用题能抓住主要关系式，复杂条件下仍需补齐范围说明。",
        knowledgePoints: ["一次函数应用", "条件范围"],
        abilityDimensions: ["审题信息提取", "步骤表达"],
        errorPatterns: ["复杂题容易漏限制条件"],
        mainProgressSignal: "订正时更愿意补充步骤",
        mainIssueSignal: "复杂题容易漏限制条件",
        firstPriorityAction: "每次作业固定做题干条件标注",
        parentVisibleSummary: "本月订正后的步骤补充更主动，复杂题仍要继续关注条件提取。"
      }),
      createMockConfirmedSnapshot({
        id: "student-month-source-2",
        studentId: "student-monthly-mock",
        month: "2026-06",
        materialType: "homework",
        materialDate: "2026-06-18",
        scoreSummary: "作业基础题任务理解稳定，首次作答时答案表达仍需更完整。",
        knowledgePoints: ["应用题建模"],
        abilityDimensions: ["独立完成", "表达习惯"],
        errorPatterns: ["首次作答时答案表达不够完整"],
        mainProgressSignal: "基础题任务理解更稳定",
        mainIssueSignal: "首次作答时答案表达不够完整",
        firstPriorityAction: "每周复盘 2 道同类应用题",
        parentVisibleSummary: "基础题理解比之前稳定，后续继续练答案表达完整性。"
      }),
      createMockConfirmedSnapshot({
        id: "student-month-source-prev",
        studentId: "student-monthly-mock",
        month: "2026-05",
        materialType: "homework",
        materialDate: "2026-05-20",
        scoreSummary: "上月主要问题是复杂题条件提取和表达完整性。",
        knowledgePoints: ["一次函数应用"],
        abilityDimensions: ["审题信息提取", "表达习惯"],
        errorPatterns: ["复杂题容易漏限制条件", "首次作答时答案表达不够完整"],
        mainProgressSignal: "能跟上主要任务",
        mainIssueSignal: "复杂题容易漏限制条件",
        firstPriorityAction: "训练题干标注",
        parentVisibleSummary: "上月需要关注复杂题条件提取。"
      })
    ],
    lessonCount: 8,
    feedbackCount: 5,
    archivedRecordCount: 6
  });
}

export function createStudentMonthlyReportFromConfirmedSnapshots(input: StudentMonthlyReportFromSnapshotsInput): StudentMonthlyReport {
  const currentMonthLabel = input.currentMonthLabel || formatMonthLabel(input.currentMonth);
  const previousMonth = input.previousMonth || getPreviousMonth(input.currentMonth);
  const previousMonthLabel = input.previousMonthLabel || formatMonthLabel(previousMonth);
  const currentSnapshots = filterConfirmedSnapshots(input.snapshots, input.studentId, input.currentMonth);
  const previousSnapshotPool = input.previousMonthSnapshots || input.snapshots;
  const previousSnapshots = previousMonth ? filterConfirmedSnapshots(previousSnapshotPool, input.studentId, previousMonth) : [];
  const currentConfirmedSources = filterConfirmedMonthlySources(input.confirmedSources || [], input.studentId, input.currentMonth);
  const previousConfirmedSourcePool = input.previousMonthConfirmedSources || input.confirmedSources || [];
  const previousConfirmedSources = previousMonth ? filterConfirmedMonthlySources(previousConfirmedSourcePool, input.studentId, previousMonth) : [];
  const replayablePreviousReport = getReplayablePreviousReport(input.previousReport, {
    studentName: input.studentName,
    previousMonthLabel
  });
  const currentEvidenceSources = buildMonthlyReportEvidenceSources(currentSnapshots, currentConfirmedSources);
  const previousEvidenceSources = buildMonthlyReportEvidenceSources(previousSnapshots, previousConfirmedSources);
  const sourceCount = currentEvidenceSources.length;
  const subjectArea = input.subjectArea || currentSnapshots[0]?.subject || currentConfirmedSources.find((source) => source.subject_area)?.subject_area || previousSnapshots[0]?.subject || "综合学科";

  if (sourceCount === 0) {
    return createInsufficientStudentMonthlyReport({
      input,
      subjectArea,
      currentMonthLabel,
      previousMonthLabel
    });
  }

  const confidenceLevel = inferMonthlyConfidence(currentSnapshots, currentConfirmedSources);
  const missingSources = buildMissingSources(currentSnapshots, previousSnapshots, currentConfirmedSources, previousConfirmedSources, replayablePreviousReport);
  const progressSignals = uniqueFilled([
    ...currentSnapshots.map((snapshot) => snapshot.main_progress_signal),
    ...currentConfirmedSources.flatMap((source) => source.progress_signals || [])
  ]);
  const issueSignals = uniqueFilled([
    ...currentSnapshots.flatMap((snapshot) => [snapshot.main_issue_signal, ...snapshot.error_patterns]),
    ...currentConfirmedSources.flatMap((source) => source.issue_signals || [])
  ]);
  const priorityActions = uniqueFilled([
    ...currentSnapshots.map((snapshot) => snapshot.first_priority_action),
    ...currentConfirmedSources.flatMap((source) => source.next_actions || [])
  ]);
  const knowledgePoints = topItems([
    ...currentSnapshots.flatMap((snapshot) => snapshot.knowledge_points),
    ...currentConfirmedSources.flatMap((source) => source.knowledge_points || [])
  ]);
  const comparison = buildStudentMonthlyComparison({
    currentMonthLabel,
    previousMonthLabel,
    currentSnapshots,
    previousSnapshots,
    currentConfirmedSources,
    previousConfirmedSources,
    previousReport: replayablePreviousReport
  });
  const comparisonEvidence = buildComparisonEvidenceMetadata(sourceCount, previousEvidenceSources, replayablePreviousReport);

  return {
    schema_version: "student_monthly_report_v1",
    report_type: "student",
    audience: "parent",
    month_label: currentMonthLabel,
    student_name: input.studentName,
    subject_area: subjectArea,
    readiness: {
      label: confidenceLevel === "high" ? "可生成，依据较充分" : "可生成，建议老师再核对一次",
      confidence_level: confidenceLevel,
      source_count: sourceCount,
      missing_sources: missingSources
    },
    teacher_summary: {
      current_status: `本月已读取 ${sourceCount} 条老师确认素材，主要涉及${formatList(knowledgePoints, "已确认材料")}。`,
      main_progress: formatList(progressSignals, "暂无足够证据判断本月主要进步。", 2),
      main_issue: formatList(issueSignals, "暂无足够证据判断本月主要问题。", 2),
      next_month_focus: formatList(priorityActions, "先补充并确认更多本月学习材料，再确定下月重点。", 2)
    },
    service_overview: {
      lesson_count: input.lessonCount ?? countConfirmedSourcesByType(currentConfirmedSources, "learning_record"),
      feedback_count: input.feedbackCount ?? countConfirmedSourcesByType(currentConfirmedSources, "feedback"),
      archived_record_count: input.archivedRecordCount ?? sourceCount,
      material_count: currentSnapshots.length
    },
    growth_signals: buildGrowthSignals(currentSnapshots, previousSnapshots, currentConfirmedSources),
    month_over_month_comparison: comparison,
    comparison_evidence: comparisonEvidence,
    evidence_timeline: currentEvidenceSources,
    next_month_plan: priorityActions.slice(0, 3),
    parent_message: buildParentMonthlyMessage(input.studentName, progressSignals, issueSignals, priorityActions),
    teacher_only_notes: [
      "仅使用老师确认后的学习材料分析快照生成月报草稿。",
      "不要把单月或单份材料问题写成长期定性。",
      ...uniqueFilled(currentSnapshots.flatMap((snapshot) => snapshot.teacher_only_notes)).slice(0, 2)
    ],
    safeguards: ["只使用已确认记录和老师可核对材料。", "家长版不写分数承诺，不使用负面标签。", "缺少上月可比证据时不做强趋势判断。"]
  };
}

export function createMockClassMonthlyReport(input: Omit<MonthlyReportInput, "scope">): ClassMonthlyReport {
  const subjectArea = input.subjectArea || inferSubjectArea(input.inputSummary);

  return {
    schema_version: "class_monthly_report_v1",
    report_type: "class",
    audience: "teacher",
    month_label: "2026 年 6 月",
    class_name: input.subjectName,
    subject_area: subjectArea,
    readiness: {
      label: "老师复盘版已生成",
      confidence_level: "medium",
      source_count: 9,
      missing_sources: ["还有 2 名学生缺少本月个人反馈素材"]
    },
    teacher_overview: {
      class_status: "本月班课推进稳定，学生能完成基础任务，但综合应用题的条件整理和步骤表达仍是共性卡点。",
      teaching_rhythm: "班课节奏适合继续保持：先复盘典型错因，再做同类变式，最后拆分到学生个人跟进。",
      main_common_issue: "共性薄弱点集中在条件提取、过程书写和答案完整性。",
      next_month_priority: "先做共性错因复盘，再按学生层级安排变式训练。"
    },
    service_metrics: {
      class_lesson_count: 8,
      student_count: 12,
      pending_feedback_count: 3,
      ready_monthly_reports: 7
    },
    common_weaknesses: [
      {
        topic: "条件提取不完整",
        affected_students: 7,
        evidence: "多次材料中出现题干限制条件遗漏。",
        teaching_response: "下月班课前 10 分钟固定做条件标注训练。"
      },
      {
        topic: "过程表达跳步",
        affected_students: 5,
        evidence: "学生能得出方向，但步骤说明不够完整。",
        teaching_response: "要求每次练习保留关键依据句。"
      },
      {
        topic: "综合题迁移不稳",
        affected_students: 4,
        evidence: "换场景后需要老师二次提示。",
        teaching_response: "按基础保持组和迁移训练组分层布置任务。"
      }
    ],
    student_segments: [
      {
        label: "稳定推进",
        students: ["李明轩", "张子涵", "周可"],
        teacher_action: "保持当前节奏，月报里强调稳定和下一步挑战。"
      },
      {
        label: "需要跟进",
        students: ["王一路", "陈思远", "赵一鸣"],
        teacher_action: "优先补齐个人反馈和错题证据。"
      },
      {
        label: "重点关注",
        students: ["林小北"],
        teacher_action: "下次课单独观察作业完成和课堂参与。"
      }
    ],
    next_month_teaching_plan: [
      {
        layer: "全班共性",
        goal: "稳定条件提取流程",
        action: "每节课设置 1 道审题标注题，统一讲评。"
      },
      {
        layer: "中段学生",
        goal: "提升综合题迁移",
        action: "布置同模型不同场景的变式练习。"
      },
      {
        layer: "重点学生",
        goal: "补齐个人证据",
        action: "课后补一条个人反馈，避免月报只有班级结论。"
      }
    ],
    service_followups: [
      {
        item: "3 名学生需要补本月反馈",
        owner: "teacher",
        status: "needs_input"
      },
      {
        item: "7 份学生月报素材已就绪",
        owner: "assistant",
        status: "ready"
      },
      {
        item: "下月分层练习建议已生成草稿",
        owner: "assistant",
        status: "ready"
      }
    ],
    evidence_sources: [
      {
        id: "class-month-source-1",
        label: "班课记录",
        type: "class_lesson",
        summary: "本月完成 8 次班课，主要围绕函数应用题与几何证明。",
        usable_for_parent: false
      },
      {
        id: "class-month-source-2",
        label: "学习材料分析",
        type: "learning_evidence",
        summary: "共性问题集中在条件提取、过程表达和综合迁移。",
        usable_for_parent: false
      },
      {
        id: "class-month-source-3",
        label: "学生反馈状态",
        type: "feedback",
        summary: "3 名学生还缺本月个人反馈，建议优先补齐。",
        usable_for_parent: false
      }
    ],
    safeguards: ["班级月报只服务老师复盘，不作为家长群发文案。", "班级共性结论不能自动覆盖学生个人档案。"]
  };
}

export function summarizeMonthlyReport(report: MonthlyReport) {
  if (report.report_type === "class") {
    return `班级月报已生成：${report.teacher_overview.main_common_issue} 下月优先做：${report.teacher_overview.next_month_priority}`;
  }

  return `学生月报已生成：${report.teacher_summary.main_progress} 下月重点：${report.teacher_summary.next_month_focus}`;
}

type CreateMockConfirmedSnapshotInput = {
  id: string;
  studentId: string;
  month: string;
  materialType: MonthlyReportSnapshot["material_type"];
  materialDate: string;
  scoreSummary: string;
  knowledgePoints: string[];
  abilityDimensions: string[];
  errorPatterns: string[];
  mainProgressSignal: string;
  mainIssueSignal: string;
  firstPriorityAction: string;
  parentVisibleSummary: string;
};

type CreateInsufficientStudentMonthlyReportInput = {
  input: StudentMonthlyReportFromSnapshotsInput;
  subjectArea: string;
  currentMonthLabel: string;
  previousMonthLabel: string;
};

type BuildStudentMonthlyComparisonInput = {
  currentMonthLabel: string;
  previousMonthLabel: string;
  currentSnapshots: ConfirmedMonthlyReportSnapshot[];
  previousSnapshots: ConfirmedMonthlyReportSnapshot[];
  currentConfirmedSources: ConfirmedMonthlyReportSource[];
  previousConfirmedSources: ConfirmedMonthlyReportSource[];
  previousReport?: StudentMonthlyReport;
};

function createMockConfirmedSnapshot(input: CreateMockConfirmedSnapshotInput): ConfirmedMonthlyReportSnapshot {
  return {
    source_analysis_id: input.id,
    student_id: input.studentId,
    month: input.month,
    subject: "数学",
    material_type: input.materialType,
    material_date: input.materialDate,
    score_summary: input.scoreSummary,
    question_count: 4,
    analyzable_question_count: 4,
    knowledge_points: input.knowledgePoints,
    ability_dimensions: input.abilityDimensions,
    error_patterns: input.errorPatterns,
    main_progress_signal: input.mainProgressSignal,
    main_issue_signal: input.mainIssueSignal,
    first_priority_action: input.firstPriorityAction,
    parent_visible_summary: input.parentVisibleSummary,
    teacher_only_notes: ["本条快照来自老师确认后的学习材料分析。"],
    confidence: 0.84,
    evidenceRefs: [`evidence-${input.id}`],
    teacher_confirmed: true,
    confirmed_at: `${input.materialDate}T10:00:00+08:00`,
    source_skill_run_id: `skill-run-${input.id}`,
    archive_record_id: `archive-${input.id}`,
    feedback_sent: true
  };
}

function createMockConfirmedMonthlySources(studentId: string): MonthlyReportConfirmedSourceCandidate[] {
  return [
    {
      id: "learning-record-2026-06-08",
      student_id: studentId,
      month: "2026-06",
      source_type: "learning_record",
      label: "课堂学习记录",
      summary: "课堂能跟上主要任务，订正时愿意补充步骤。",
      occurred_at: "2026-06-08",
      confirmed_at: "2026-06-08T21:00:00+08:00",
      teacher_confirmed: true,
      usable_for_parent: true,
      subject_area: "数学",
      progress_signals: ["课堂能跟上主要任务"],
      issue_signals: ["独立完成时仍需回看条件"],
      next_actions: ["课堂追问时继续让学生说清条件来源"],
      knowledge_points: ["一次函数应用"],
      ability_dimensions: ["课堂理解", "表达习惯"],
      evidenceRefs: ["learning-record-2026-06-08"]
    },
    {
      id: "feedback-2026-06-12",
      student_id: studentId,
      month: "2026-06",
      source_type: "feedback",
      label: "已反馈家长记录",
      summary: "已向家长反馈本月重点：条件提取和步骤表达，不制造焦虑。",
      occurred_at: "2026-06-12",
      confirmed_at: "2026-06-12T21:10:00+08:00",
      teacher_confirmed: true,
      usable_for_parent: false,
      subject_area: "数学",
      progress_signals: ["家长反馈节奏保持稳定"],
      issue_signals: [],
      next_actions: ["下月反馈继续用具体材料说明变化"],
      knowledge_points: [],
      ability_dimensions: ["家校沟通"],
      evidenceRefs: ["feedback-2026-06-12"]
    },
    {
      id: "teacher-note-2026-06-20",
      student_id: studentId,
      month: "2026-06",
      source_type: "teacher_note",
      label: "老师备注",
      summary: "月报不要写得太重，重点放在正向变化和下月跟进。",
      occurred_at: "2026-06-20",
      confirmed_at: "2026-06-20T20:20:00+08:00",
      teacher_confirmed: true,
      usable_for_parent: false,
      subject_area: "数学",
      progress_signals: [],
      issue_signals: [],
      next_actions: ["家长版表达保持温和、具体、可执行"],
      knowledge_points: [],
      ability_dimensions: ["家校沟通"],
      evidenceRefs: ["teacher-note-2026-06-20"]
    },
    {
      id: "learning-record-2026-05-18",
      student_id: studentId,
      month: "2026-05",
      source_type: "learning_record",
      label: "上月课堂学习记录",
      summary: "上月课堂能跟上基础任务，复杂题条件整理不稳定。",
      occurred_at: "2026-05-18",
      confirmed_at: "2026-05-18T21:00:00+08:00",
      teacher_confirmed: true,
      usable_for_parent: true,
      subject_area: "数学",
      progress_signals: ["能跟上基础任务"],
      issue_signals: ["复杂题条件整理不稳定"],
      next_actions: ["训练题干标注"],
      knowledge_points: ["一次函数应用"],
      ability_dimensions: ["课堂理解", "审题信息提取"],
      evidenceRefs: ["learning-record-2026-05-18"]
    }
  ];
}

function createInsufficientStudentMonthlyReport({
  input,
  subjectArea,
  currentMonthLabel,
  previousMonthLabel
}: CreateInsufficientStudentMonthlyReportInput): StudentMonthlyReport {
  const replayablePreviousReport = getReplayablePreviousReport(input.previousReport, {
    studentName: input.studentName,
    previousMonthLabel
  });

  return {
    schema_version: "student_monthly_report_v1",
    report_type: "student",
    audience: "parent",
    month_label: currentMonthLabel,
    student_name: input.studentName,
    subject_area: subjectArea,
    readiness: {
      label: "依据不足，暂不建议生成正式月报",
      confidence_level: "low",
      source_count: 0,
      missing_sources: ["本月没有老师确认的学习材料分析快照"]
    },
    teacher_summary: {
      current_status: "本月暂无已确认学习材料证据，不能判断学生表现变化。",
      main_progress: "暂无足够证据判断本月主要进步。",
      main_issue: "暂无足够证据判断本月主要问题。",
      next_month_focus: "先补充并确认本月学习记录或材料分析，再生成月报。"
    },
    service_overview: {
      lesson_count: input.lessonCount ?? 0,
      feedback_count: input.feedbackCount ?? 0,
      archived_record_count: input.archivedRecordCount ?? 0,
      material_count: 0
    },
    growth_signals: [],
    month_over_month_comparison: {
      previous_month_label: previousMonthLabel,
      current_month_label: currentMonthLabel,
      summary: "本月缺少已确认学习材料快照，暂不做和上月的纵向变化判断。",
      improved_signals: [],
      stable_signals: [],
      repeated_issues: [],
      new_issues: [],
      insufficient_evidence: ["本月没有老师确认的学习材料分析快照", "缺少可核对证据，不能生成表现趋势"],
      parent_readable_comparison: "本月还需要先补齐老师确认过的学习材料记录，暂不对孩子的月度变化做结论。",
      teacher_interpretation: "月报只能读取已确认记录；没有确认素材时应提示依据不足，不生成趋势判断。"
    },
    comparison_evidence: buildComparisonEvidenceMetadata(
      0,
      buildMonthlyReportEvidenceSources(
        filterConfirmedSnapshots(
          input.previousMonthSnapshots || input.snapshots,
          input.studentId,
          input.previousMonth || getPreviousMonth(input.currentMonth)
        ),
        filterConfirmedMonthlySources(
          input.previousMonthConfirmedSources || input.confirmedSources || [],
          input.studentId,
          input.previousMonth || getPreviousMonth(input.currentMonth)
        )
      ),
      replayablePreviousReport
    ),
    evidence_timeline: [],
    next_month_plan: ["补齐并确认本月学习材料分析", "优先选择有学生作答和老师批改痕迹的材料"],
    parent_message: `${input.studentName}本月还缺少足够的已确认学习材料，老师会先补齐可核对记录后，再形成更完整的月度反馈。`,
    teacher_only_notes: ["未确认 AI 草稿不能进入月报正式素材。", "不要用空白或证据不足材料推断学生表现。"],
    safeguards: ["只使用已确认记录和老师可核对材料。", "家长版不写分数承诺，不使用负面标签。", "证据不足时不生成趋势判断。"]
  };
}

function filterConfirmedSnapshots(snapshots: MonthlyReportSnapshotCandidate[], studentId: string, month: string): ConfirmedMonthlyReportSnapshot[] {
  return snapshots.filter(
    (snapshot): snapshot is ConfirmedMonthlyReportSnapshot =>
      snapshot.teacher_confirmed === true && Boolean(snapshot.confirmed_at) && snapshot.student_id === studentId && snapshot.month === month
  );
}

function filterConfirmedMonthlySources(
  sources: MonthlyReportConfirmedSourceCandidate[],
  studentId: string,
  month: string
): ConfirmedMonthlyReportSource[] {
  return sources.filter(
    (source): source is ConfirmedMonthlyReportSource =>
      source.teacher_confirmed === true && Boolean(source.confirmed_at) && source.student_id === studentId && source.month === month
  );
}

function inferMonthlyConfidence(snapshots: ConfirmedMonthlyReportSnapshot[], sources: ConfirmedMonthlyReportSource[] = []): MonthlyReportConfidence {
  const averageConfidence = average(snapshots.map((snapshot) => snapshot.confidence));
  if (snapshots.length >= 3 && averageConfidence >= 0.82) return "high";
  if (snapshots.length >= 1 && averageConfidence >= 0.65) return "medium";
  if (sources.length >= 2) return "medium";
  if (sources.length >= 1) return "low";
  return "low";
}

function buildMissingSources(
  currentSnapshots: ConfirmedMonthlyReportSnapshot[],
  previousSnapshots: ConfirmedMonthlyReportSnapshot[],
  currentConfirmedSources: ConfirmedMonthlyReportSource[],
  previousConfirmedSources: ConfirmedMonthlyReportSource[],
  previousReport?: StudentMonthlyReport
) {
  const missingSources: string[] = [];
  const currentSourceCount = currentSnapshots.length + currentConfirmedSources.length;
  const previousSourceCount = previousSnapshots.length + previousConfirmedSources.length;
  if (currentSourceCount < 2) missingSources.push("本月已确认素材偏少，趋势判断需谨慎");
  if (currentSnapshots.length === 0) missingSources.push("本月缺少已确认学习材料分析快照，逐题趋势依据不足");
  if (previousSourceCount === 0 && !previousReport) missingSources.push("缺少上月确认素材，纵向比较只做有限提示");
  if (average(currentSnapshots.map((snapshot) => snapshot.confidence)) < 0.75) missingSources.push("部分素材置信度偏低，需老师复核");
  return missingSources;
}

function buildStudentMonthlyComparison(input: BuildStudentMonthlyComparisonInput): StudentMonthlyComparison {
  const replayablePreviousReport = getReplayablePreviousReport(input.previousReport);
  const currentIssues = uniqueFilled([
    ...input.currentSnapshots.flatMap((snapshot) => [snapshot.main_issue_signal, ...snapshot.error_patterns]),
    ...input.currentConfirmedSources.flatMap((source) => source.issue_signals || [])
  ]);
  const previousIssues = uniqueFilled([
    ...input.previousSnapshots.flatMap((snapshot) => [snapshot.main_issue_signal, ...snapshot.error_patterns]),
    ...input.previousConfirmedSources.flatMap((source) => source.issue_signals || []),
    ...(replayablePreviousReport?.month_over_month_comparison.repeated_issues ?? []),
    ...(replayablePreviousReport?.month_over_month_comparison.new_issues ?? [])
  ]);
  const currentSourceCount = input.currentSnapshots.length + input.currentConfirmedSources.length;
  const hasPreviousEvidence = input.previousSnapshots.length > 0 || input.previousConfirmedSources.length > 0 || Boolean(replayablePreviousReport);
  const repeatedIssues = hasPreviousEvidence ? currentIssues.filter((issue) => previousIssues.some((previousIssue) => hasMeaningfulOverlap(issue, previousIssue))) : [];
  const newIssues = hasPreviousEvidence ? currentIssues.filter((issue) => !previousIssues.some((previousIssue) => hasMeaningfulOverlap(issue, previousIssue))) : [];
  const currentPositiveSignals = uniqueFilled([
    ...input.currentSnapshots.map((snapshot) => snapshot.main_progress_signal),
    ...input.currentConfirmedSources.flatMap((source) => source.progress_signals || [])
  ]).slice(0, 3);
  const improvedSignals = hasPreviousEvidence ? currentPositiveSignals : [];
  const stableSignals = hasPreviousEvidence ? buildStableSignals(input.currentSnapshots, input.previousSnapshots, replayablePreviousReport) : [];
  const insufficientEvidence: string[] = [];

  if (!hasPreviousEvidence) insufficientEvidence.push("缺少上月确认素材，不能做完整纵向比较。");
  if (currentSourceCount < 2) insufficientEvidence.push("本月样本数偏少，趋势判断需老师复核。");

  const mainProgress = formatList(currentPositiveSignals, "暂无足够证据判断本月主要进步。", 2);
  const mainIssue = formatList(currentIssues, "暂无足够证据判断本月主要问题。", 2);

  return {
    previous_month_label: input.previousMonthLabel,
    current_month_label: input.currentMonthLabel,
    summary: hasPreviousEvidence
      ? `和上月相比，本月主要积极变化是${mainProgress}；仍需关注${mainIssue}。`
      : `本月已形成 ${currentSourceCount} 条确认素材，但缺少上月可比素材，暂不做完整纵向结论。`,
    improved_signals: improvedSignals,
    stable_signals: stableSignals,
    repeated_issues: repeatedIssues,
    new_issues: newIssues,
    insufficient_evidence: insufficientEvidence,
    parent_readable_comparison: hasPreviousEvidence
      ? `和上个月相比，孩子本月在${mainProgress}方面有积极变化。接下来还会继续关注${mainIssue}，先把下月重点做稳定。`
      : "本月已经整理出可核对的学习材料依据，但上月可比材料不足，先不做强趋势判断。",
    teacher_interpretation: "月报纵向比较只读取老师确认后的快照或上月已确认月报；证据不足的变化不写成结论。"
  };
}

function buildComparisonEvidenceMetadata(
  currentMonthSourceCount: number,
  previousMonthSources: MonthlyReportSource[],
  previousReport?: StudentMonthlyReport
): StudentMonthlyComparisonEvidence {
  const previousReportSourceIds = getReplayablePreviousReportSourceIds(previousReport);
  const previousSourceIds = uniqueFilled([
    ...previousMonthSources.map((source) => source.id),
    ...previousReportSourceIds
  ]);
  const previousSourceCount = previousSourceIds.length;

  return {
    current_month_source_count: currentMonthSourceCount,
    previous_month_source_count: previousSourceCount,
    previous_month_source_ids: previousSourceIds,
    previous_month_report_used: previousReportSourceIds.length > 0,
    previous_month_evidence_status: previousSourceCount > 0 ? "available" : "missing"
  };
}

function getReplayablePreviousReport(previousReport?: StudentMonthlyReport, context?: PreviousReportReplayContext) {
  if (!previousReport) return undefined;
  if (context && (previousReport.student_name !== context.studentName || previousReport.month_label !== context.previousMonthLabel)) return undefined;
  return getReplayablePreviousReportSourceIds(previousReport).length > 0 ? previousReport : undefined;
}

function getReplayablePreviousReportSourceIds(previousReport?: StudentMonthlyReport) {
  if (!Array.isArray(previousReport?.evidence_timeline)) return [];
  return uniqueFilled(previousReport.evidence_timeline.map((source) => source.id));
}

function buildStableSignals(
  currentSnapshots: ConfirmedMonthlyReportSnapshot[],
  previousSnapshots: ConfirmedMonthlyReportSnapshot[],
  previousReport?: StudentMonthlyReport
) {
  const currentDimensions = topItems(currentSnapshots.flatMap((snapshot) => snapshot.ability_dimensions));
  const previousDimensions = topItems(previousSnapshots.flatMap((snapshot) => snapshot.ability_dimensions));
  const repeatedDimensions = currentDimensions.filter((dimension) => previousDimensions.some((previousDimension) => hasMeaningfulOverlap(dimension, previousDimension)));
  if (repeatedDimensions.length > 0) return repeatedDimensions.slice(0, 3);
  return previousReport?.month_over_month_comparison.stable_signals.slice(0, 2) ?? [];
}

function buildGrowthSignals(
  currentSnapshots: ConfirmedMonthlyReportSnapshot[],
  previousSnapshots: ConfirmedMonthlyReportSnapshot[],
  currentConfirmedSources: ConfirmedMonthlyReportSource[]
): StudentMonthlyReport["growth_signals"] {
  const dimensions = topItems([
    ...currentSnapshots.flatMap((snapshot) => snapshot.ability_dimensions),
    ...currentConfirmedSources.flatMap((source) => source.ability_dimensions || [])
  ]).slice(0, 3);
  const previousIssues = uniqueFilled(previousSnapshots.flatMap((snapshot) => [snapshot.main_issue_signal, ...snapshot.error_patterns]));

  return dimensions.map((dimension) => {
    const relatedSnapshot = currentSnapshots.find((snapshot) => snapshot.ability_dimensions.some((item) => hasMeaningfulOverlap(item, dimension))) || currentSnapshots[0];
    const relatedSource = currentConfirmedSources.find((source) => source.ability_dimensions?.some((item) => hasMeaningfulOverlap(item, dimension)));
    const relatedIssue = relatedSnapshot?.error_patterns.find((pattern) => previousIssues.some((previousIssue) => hasMeaningfulOverlap(pattern, previousIssue)));
    const status: StudentMonthlyReport["growth_signals"][number]["status"] = relatedIssue ? "watch" : previousSnapshots.length > 0 ? "stable" : "improving";

    return {
      dimension,
      status,
      evidence: relatedSnapshot
        ? `${formatMaterialLabel(relatedSnapshot.material_type)}：${relatedSnapshot.parent_visible_summary || relatedSnapshot.score_summary}`
        : `${relatedSource?.label || "确认素材"}：${relatedSource?.summary || "已确认来源支持该维度观察。"}`,
      next_action: relatedSnapshot?.first_priority_action || relatedSource?.next_actions?.[0] || "继续补充可核对学习证据"
    };
  });
}

function buildMonthlyReportEvidenceSources(
  snapshots: ConfirmedMonthlyReportSnapshot[],
  sources: ConfirmedMonthlyReportSource[]
): MonthlyReportSource[] {
  return [
    ...snapshots.map((snapshot) => ({
      sourceDate: snapshot.material_date,
      source: snapshotToMonthlySource(snapshot)
    })),
    ...sources.map((source) => ({
      sourceDate: source.occurred_at || source.confirmed_at,
      source: confirmedSourceToMonthlySource(source)
    }))
  ]
    .sort((a, b) => a.sourceDate.localeCompare(b.sourceDate))
    .map((item) => item.source);
}

function snapshotToMonthlySource(snapshot: ConfirmedMonthlyReportSnapshot): MonthlyReportSource {
  return {
    id: snapshot.source_skill_run_id || snapshot.source_analysis_id,
    label: formatMaterialLabel(snapshot.material_type),
    type: "learning_evidence",
    summary: snapshot.parent_visible_summary || snapshot.score_summary,
    usable_for_parent: snapshot.confidence >= 0.65 && snapshot.parent_visible_summary.trim().length > 0
  };
}

function confirmedSourceToMonthlySource(source: ConfirmedMonthlyReportSource): MonthlyReportSource {
  return {
    id: source.id,
    label: source.label,
    type: source.source_type,
    summary: source.summary,
    usable_for_parent: source.usable_for_parent
  };
}

function countConfirmedSourcesByType(sources: ConfirmedMonthlyReportSource[], sourceType: ConfirmedMonthlyReportSource["source_type"]) {
  return sources.filter((source) => source.source_type === sourceType).length;
}

function buildParentMonthlyMessage(studentName: string, progressSignals: string[], issueSignals: string[], priorityActions: string[]) {
  const progress = formatList(progressSignals, "学习状态有可继续观察的积极信号", 1);
  const issue = formatList(issueSignals, "需要继续通过材料观察的学习点", 1);
  const action = formatList(priorityActions, "先稳定一个具体学习动作", 1);
  return `${studentName}本月${progress}。接下来我们会继续关注${issue}，下月先围绕${action}做稳定巩固。`;
}

function buildMissingLabel(month: string) {
  return month || "上月";
}

function formatMonthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return buildMissingLabel(month);
  return `${match[1]} 年 ${Number(match[2])} 月`;
}

function getPreviousMonth(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return "";
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  const previousDate = new Date(Date.UTC(year, monthIndex - 2, 1));
  return `${previousDate.getUTCFullYear()}-${String(previousDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMaterialLabel(materialType: MonthlyReportSnapshot["material_type"]) {
  const labels: Record<MonthlyReportSnapshot["material_type"], string> = {
    exam: "试卷分析",
    homework: "作业分析",
    wrong_question: "错题分析",
    wrong_question_book: "错题本分析",
    unit_quiz: "单元测验分析",
    weekly_test: "周测分析",
    monthly_test: "月考分析",
    student_notes: "笔记分析",
    practice_record: "练习记录分析",
    other_student_material: "学习材料分析"
  };
  return labels[materialType] || "学习材料分析";
}

function formatList(items: string[], fallback: string, limit = 3) {
  const values = uniqueFilled(items).slice(0, limit);
  if (values.length === 0) return fallback;
  return values.join("、");
}

function topItems(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const normalizedItem = item.trim();
    if (!normalizedItem) continue;
    counts.set(normalizedItem, (counts.get(normalizedItem) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))
    .map(([item]) => item);
}

function uniqueFilled(items: Array<string | undefined | null>) {
  return Array.from(new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item))));
}

function average(numbers: number[]) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function hasMeaningfulOverlap(a: string, b: string) {
  const left = normalizeForComparison(a);
  const right = normalizeForComparison(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 4 && right.includes(left)) return true;
  if (right.length >= 4 && left.includes(right)) return true;

  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  for (let index = 0; index <= shorter.length - 4; index += 1) {
    if (longer.includes(shorter.slice(index, index + 4))) return true;
  }
  return false;
}

function normalizeForComparison(value: string) {
  return value.replace(/[，。、“”‘’；：:;,.!\s]/gu, "");
}

function inferSubjectArea(inputSummary = "") {
  if (/英语|口语|阅读|作文/u.test(inputSummary)) return "英语";
  if (/语文|作文|阅读/u.test(inputSummary)) return "语文";
  if (/物理|力学|电路/u.test(inputSummary)) return "物理";
  if (/化学|实验/u.test(inputSummary)) return "化学";
  if (/历史|地理|政治/u.test(inputSummary)) return "文综";
  return "数学";
}
