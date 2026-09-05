import { describe, expect, it } from "vitest";
import {
  createStudentMonthlyReportFromConfirmedSnapshots,
  type MonthlyReportConfirmedSourceCandidate,
  type MonthlyReportSnapshotCandidate
} from "../src/skills/monthly-report";

const forbiddenParentTerms = /严重|很差|完全不会|保证提分|不认真|基础很差|孩子不行|家长必须/u;

describe("student monthly report from confirmed learning material snapshots", () => {
  it("does not use unconfirmed snapshots or fabricate monthly conclusions", () => {
    const report = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: "student-wang",
      studentName: "王一路",
      currentMonth: "2026-06",
      subjectArea: "数学",
      snapshots: [
        makeSnapshot({
          teacher_confirmed: false,
          confirmed_at: undefined,
          main_progress_signal: "未确认草稿里的进步不应进入月报",
          main_issue_signal: "未确认草稿里的问题不应进入月报"
        })
      ]
    });

    expect(report.readiness).toEqual(
      expect.objectContaining({
        confidence_level: "low",
        source_count: 0
      })
    );
    expect(report.teacher_summary.current_status).toContain("暂无已确认学习材料证据");
    expect(report.month_over_month_comparison.insufficient_evidence).toContain("本月没有老师确认的学习材料分析快照");
    expect(report.evidence_timeline).toHaveLength(0);
    expect(report.parent_message).not.toMatch(forbiddenParentTerms);
  });

  it("aggregates confirmed current-month snapshots and compares them with previous month", () => {
    const report = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: "student-wang",
      studentName: "王一路",
      currentMonth: "2026-06",
      previousMonth: "2026-05",
      snapshots: [
        makeSnapshot({
          source_analysis_id: "current-a",
          source_skill_run_id: "skill-run-current-a",
          material_date: "2026-06-11",
          knowledge_points: ["一次函数应用", "条件范围"],
          ability_dimensions: ["审题信息提取"],
          error_patterns: ["条件范围遗漏"],
          main_progress_signal: "能抓住主要关系式",
          main_issue_signal: "条件范围遗漏",
          first_priority_action: "训练题干条件标注",
          parent_visible_summary: "能抓住主要关系式，后续继续练条件范围表达。"
        }),
        makeSnapshot({
          source_analysis_id: "current-b",
          source_skill_run_id: "skill-run-current-b",
          material_type: "homework",
          material_date: "2026-06-18",
          knowledge_points: ["应用题建模"],
          ability_dimensions: ["步骤表达"],
          error_patterns: ["步骤表达跳步"],
          main_progress_signal: "订正时愿意补充关键步骤",
          main_issue_signal: "步骤表达跳步",
          first_priority_action: "每次作业抽 1 题复述依据",
          parent_visible_summary: "订正配合更稳定，首次作答还要继续练步骤完整性。"
        }),
        makeSnapshot({
          source_analysis_id: "previous-a",
          month: "2026-05",
          material_date: "2026-05-19",
          error_patterns: ["条件范围提取不完整"],
          main_progress_signal: "能跟上基础任务",
          main_issue_signal: "条件范围提取不完整",
          first_priority_action: "圈画题干条件",
          parent_visible_summary: "上月需要关注条件提取。"
        }),
        makeSnapshot({
          source_analysis_id: "other-student",
          student_id: "student-li",
          main_issue_signal: "其他学生素材不应进入本学生月报"
        }),
        makeSnapshot({
          source_analysis_id: "unconfirmed-current",
          teacher_confirmed: false,
          confirmed_at: undefined,
          main_issue_signal: "未确认问题不应进入本学生月报"
        })
      ],
      lessonCount: 8,
      feedbackCount: 5,
      archivedRecordCount: 6
    });

    expect(report.readiness.source_count).toBe(2);
    expect(report.service_overview).toEqual(
      expect.objectContaining({
        lesson_count: 8,
        feedback_count: 5,
        archived_record_count: 6,
        material_count: 2
      })
    );
    expect(report.evidence_timeline.map((source) => source.id)).toEqual(["skill-run-current-a", "skill-run-current-b"]);
    expect(report.month_over_month_comparison.previous_month_label).toBe("2026 年 5 月");
    expect(report.month_over_month_comparison.parent_readable_comparison).toContain("和上个月相比");
    expect(report.month_over_month_comparison.repeated_issues).toContain("条件范围遗漏");
    expect(report.month_over_month_comparison.new_issues).toContain("步骤表达跳步");
    expect(report.comparison_evidence.previous_month_source_count).toBe(report.comparison_evidence.previous_month_source_ids.length);
    expect(report.comparison_evidence.previous_month_source_ids).toEqual(expect.arrayContaining(["skill-run-current"]));
    expect(report.teacher_only_notes.join(" ")).toContain("仅使用老师确认");
    expect(report.parent_message).not.toMatch(forbiddenParentTerms);
  });

  it("derives previous report evidence from replayable source ids instead of readiness count", () => {
    const previousReport = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: "student-wang",
      studentName: "王一路",
      currentMonth: "2026-05",
      previousMonth: "2026-04",
      snapshots: [
        makeSnapshot({
          source_analysis_id: "previous-a",
          source_skill_run_id: "skill-run-previous-a",
          month: "2026-05",
          material_date: "2026-05-12",
          main_issue_signal: "条件范围提取不完整"
        }),
        makeSnapshot({
          source_analysis_id: "previous-b",
          source_skill_run_id: "skill-run-previous-b",
          month: "2026-05",
          material_date: "2026-05-20",
          main_issue_signal: "步骤表达跳步"
        })
      ]
    });
    const tamperedPreviousReport = {
      ...previousReport,
      readiness: {
        ...previousReport.readiness,
        source_count: 99
      },
      evidence_timeline: [
        previousReport.evidence_timeline[0],
        previousReport.evidence_timeline[0],
        { ...previousReport.evidence_timeline[1], id: " " },
        previousReport.evidence_timeline[1]
      ]
    };

    const report = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: "student-wang",
      studentName: "王一路",
      currentMonth: "2026-06",
      previousMonth: "2026-05",
      snapshots: [
        makeSnapshot({
          source_analysis_id: "current-june",
          source_skill_run_id: "skill-run-current-june",
          main_progress_signal: "订正时愿意补充关键步骤",
          main_issue_signal: "条件范围遗漏"
        })
      ],
      previousReport: tamperedPreviousReport
    });

    expect(report.comparison_evidence.previous_month_source_ids).toEqual(["skill-run-previous-a", "skill-run-previous-b"]);
    expect(report.comparison_evidence.previous_month_source_count).toBe(2);
    expect(report.comparison_evidence.previous_month_source_count).not.toBe(tamperedPreviousReport.readiness.source_count);
    expect(report.comparison_evidence.previous_month_report_used).toBe(true);
    expect(report.comparison_evidence.previous_month_evidence_status).toBe("available");
  });

  it("does not treat a previous report without replayable source ids as longitudinal evidence", () => {
    const previousReport = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: "student-wang",
      studentName: "王一路",
      currentMonth: "2026-05",
      snapshots: [
        makeSnapshot({
          source_analysis_id: "previous-a",
          source_skill_run_id: "skill-run-previous-a",
          month: "2026-05",
          main_issue_signal: "条件范围提取不完整"
        })
      ]
    });
    const previousReportWithoutReplayableSources = {
      ...previousReport,
      readiness: {
        ...previousReport.readiness,
        source_count: 3
      },
      evidence_timeline: []
    };

    const report = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: "student-wang",
      studentName: "王一路",
      currentMonth: "2026-06",
      previousMonth: "2026-05",
      snapshots: [
        makeSnapshot({
          source_analysis_id: "current-june",
          source_skill_run_id: "skill-run-current-june",
          main_progress_signal: "订正时愿意补充关键步骤",
          main_issue_signal: "条件范围遗漏"
        })
      ],
      previousReport: previousReportWithoutReplayableSources
    });

    expect(report.comparison_evidence).toEqual(
      expect.objectContaining({
        previous_month_source_count: 0,
        previous_month_source_ids: [],
        previous_month_report_used: false,
        previous_month_evidence_status: "missing"
      })
    );
    expect(report.month_over_month_comparison.repeated_issues).toEqual([]);
    expect(report.month_over_month_comparison.new_issues).toEqual([]);
    expect(report.month_over_month_comparison.insufficient_evidence).toContain("缺少上月确认素材，不能做完整纵向比较。");
    expect(report.month_over_month_comparison.parent_readable_comparison).toContain("先不做强趋势判断");
  });

  it("does not treat a previous report for another student or month as longitudinal evidence", () => {
    const previousReport = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: "student-wang",
      studentName: "王一路",
      currentMonth: "2026-05",
      snapshots: [
        makeSnapshot({
          source_analysis_id: "previous-a",
          source_skill_run_id: "skill-run-previous-a",
          month: "2026-05",
          main_issue_signal: "条件范围提取不完整"
        })
      ]
    });

    const invalidPreviousReports = [
      { ...previousReport, student_name: "李同学" },
      { ...previousReport, month_label: "2026 年 4 月" }
    ];

    for (const invalidPreviousReport of invalidPreviousReports) {
      const report = createStudentMonthlyReportFromConfirmedSnapshots({
        studentId: "student-wang",
        studentName: "王一路",
        currentMonth: "2026-06",
        previousMonth: "2026-05",
        snapshots: [
          makeSnapshot({
            source_analysis_id: "current-june",
            source_skill_run_id: "skill-run-current-june",
            main_progress_signal: "订正时愿意补充关键步骤",
            main_issue_signal: "条件范围遗漏"
          })
        ],
        previousReport: invalidPreviousReport
      });

      expect(report.comparison_evidence).toEqual(
        expect.objectContaining({
          previous_month_source_count: 0,
          previous_month_source_ids: [],
          previous_month_report_used: false,
          previous_month_evidence_status: "missing"
        })
      );
      expect(report.month_over_month_comparison.insufficient_evidence).toContain("缺少上月确认素材，不能做完整纵向比较。");
      expect(report.month_over_month_comparison.parent_readable_comparison).toContain("先不做强趋势判断");
    }
  });

  it("marks longitudinal comparison insufficient when previous-month evidence is missing", () => {
    const report = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: "student-wang",
      studentName: "王一路",
      currentMonth: "2026-06",
      snapshots: [
        makeSnapshot({
          source_analysis_id: "current-only",
          main_progress_signal: "能抓住主要关系式",
          main_issue_signal: "条件范围遗漏"
        })
      ]
    });

    expect(report.readiness.source_count).toBe(1);
    expect(report.readiness.missing_sources).toContain("缺少上月确认素材，纵向比较只做有限提示");
    expect(report.month_over_month_comparison.repeated_issues).toEqual([]);
    expect(report.month_over_month_comparison.new_issues).toEqual([]);
    expect(report.month_over_month_comparison.insufficient_evidence).toContain("缺少上月确认素材，不能做完整纵向比较。");
    expect(report.month_over_month_comparison.parent_readable_comparison).toContain("先不做强趋势判断");
  });

  it("includes confirmed learning records, feedback, and teacher notes in the monthly source pool", () => {
    const report = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: "student-wang",
      studentName: "王一路",
      currentMonth: "2026-06",
      previousMonth: "2026-05",
      snapshots: [],
      confirmedSources: [
        makeConfirmedSource({
          id: "learning-record-current",
          source_type: "learning_record",
          label: "课堂学习记录",
          summary: "课堂能跟上主要任务，独立完成时仍会漏看条件。",
          occurred_at: "2026-06-08",
          progress_signals: ["课堂能跟上主要任务"],
          issue_signals: ["审题条件遗漏"],
          next_actions: ["继续训练圈画题干条件"],
          ability_dimensions: ["课堂理解", "审题信息提取"],
          knowledge_points: ["一次函数应用"]
        }),
        makeConfirmedSource({
          id: "feedback-current",
          source_type: "feedback",
          label: "已反馈家长记录",
          summary: "已向家长反馈本月关注点，强调具体材料和下月跟进。",
          occurred_at: "2026-06-12",
          usable_for_parent: false,
          progress_signals: ["家长反馈节奏稳定"],
          next_actions: ["下月反馈继续用具体材料说明变化"],
          ability_dimensions: ["家校沟通"]
        }),
        makeConfirmedSource({
          id: "teacher-note-current",
          source_type: "teacher_note",
          label: "老师备注",
          summary: "家长最近比较焦虑，月报不要写得太重。",
          occurred_at: "2026-06-20",
          usable_for_parent: false,
          next_actions: ["家长版表达保持温和、具体"],
          ability_dimensions: ["家校沟通"]
        }),
        makeConfirmedSource({
          id: "previous-learning-record",
          month: "2026-05",
          occurred_at: "2026-05-16",
          issue_signals: ["审题条件整理不稳定"],
          progress_signals: ["能跟上基础任务"]
        }),
        makeConfirmedSource({
          id: "unconfirmed-feedback",
          source_type: "feedback",
          teacher_confirmed: false,
          confirmed_at: undefined,
          issue_signals: ["未确认反馈不应进入月报"]
        }),
        makeConfirmedSource({
          id: "other-student-source",
          student_id: "student-li",
          issue_signals: ["其他学生记录不应进入王一路月报"]
        })
      ]
    });

    expect(report.readiness.source_count).toBe(3);
    expect(report.readiness.missing_sources).toContain("本月缺少已确认学习材料分析快照，逐题趋势依据不足");
    expect(report.service_overview).toEqual(
      expect.objectContaining({
        lesson_count: 1,
        feedback_count: 1,
        archived_record_count: 3,
        material_count: 0
      })
    );
    expect(report.evidence_timeline.map((source) => source.id)).toEqual(["learning-record-current", "feedback-current", "teacher-note-current"]);
    expect(report.evidence_timeline.map((source) => source.type)).toEqual(["learning_record", "feedback", "teacher_note"]);
    expect(report.month_over_month_comparison.repeated_issues).toContain("审题条件遗漏");
    expect(report.teacher_summary.main_progress).toContain("课堂能跟上主要任务");
    expect(report.teacher_summary.next_month_focus).toContain("继续训练圈画题干条件");
    expect(report.parent_message).not.toMatch(forbiddenParentTerms);
  });
});

function makeSnapshot(overrides: Partial<MonthlyReportSnapshotCandidate> = {}): MonthlyReportSnapshotCandidate {
  return {
    source_analysis_id: "analysis-current",
    student_id: "student-wang",
    month: "2026-06",
    subject: "数学",
    material_type: "exam",
    material_date: "2026-06-10",
    score_summary: "本次可见条件范围表达需要继续巩固。",
    question_count: 4,
    analyzable_question_count: 4,
    knowledge_points: ["一次函数应用"],
    ability_dimensions: ["审题信息提取"],
    error_patterns: ["条件范围遗漏"],
    main_progress_signal: "能抓住主要关系式",
    main_issue_signal: "条件范围遗漏",
    first_priority_action: "训练题干条件标注",
    parent_visible_summary: "能抓住主要关系式，后续继续练条件范围表达。",
    teacher_only_notes: ["老师确认后才能进入月报素材池。"],
    confidence: 0.84,
    evidenceRefs: ["evidence-current"],
    teacher_confirmed: true,
    confirmed_at: "2026-06-10T10:00:00+08:00",
    source_skill_run_id: "skill-run-current",
    archive_record_id: "archive-current",
    feedback_sent: true,
    ...overrides
  };
}

function makeConfirmedSource(overrides: Partial<MonthlyReportConfirmedSourceCandidate> = {}): MonthlyReportConfirmedSourceCandidate {
  return {
    id: "learning-record-current",
    student_id: "student-wang",
    month: "2026-06",
    source_type: "learning_record",
    label: "课堂学习记录",
    summary: "课堂能跟上主要任务，独立完成时仍会漏看条件。",
    occurred_at: "2026-06-08",
    confirmed_at: "2026-06-08T20:00:00+08:00",
    teacher_confirmed: true,
    usable_for_parent: true,
    subject_area: "数学",
    progress_signals: ["课堂能跟上主要任务"],
    issue_signals: ["审题条件遗漏"],
    next_actions: ["继续训练圈画题干条件"],
    knowledge_points: ["一次函数应用"],
    ability_dimensions: ["课堂理解", "审题信息提取"],
    evidenceRefs: ["learning-record-current"],
    ...overrides
  };
}
