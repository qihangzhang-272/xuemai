import { describe, expect, it } from "vitest";
import { createSkillRun, runSkillMock, toSkillCardViewModel, transitionSkillRun } from "../src/skills/runner";
import type { LearningEvidenceReport } from "../src/skills/learning-evidence-report";
import type { MonthlyReport } from "../src/skills/monthly-report";
import type { SkillRunInput } from "../src/skills/types";

const feedbackInput: SkillRunInput = {
  skillId: "generate_feedback",
  scope: "student",
  subjectId: "student-001",
  subjectName: "王一路",
  inputSummary: "今天能听懂一次函数应用题，但独立做题时容易漏条件。"
};

const learningRecordInput: SkillRunInput = {
  skillId: "update_learning_record",
  scope: "student",
  subjectId: "student-001",
  subjectName: "王一路",
  inputSummary: "今天讲一次函数应用题，王一路能跟上，但读题容易漏条件，作业布置了 8 道专项题。"
};

describe("skill runner", () => {
  it("creates a generate_feedback SkillRun", () => {
    const skillRun = createSkillRun(feedbackInput);

    expect(skillRun.skillId).toBe("generate_feedback");
    expect(skillRun.skillType).toBe("generate_feedback");
    expect(skillRun.status).toBe("created");
    expect(skillRun.title).toContain("王一路");
    expect(skillRun.contextSources.length).toBeGreaterThan(0);
  });

  it("moves to draft_ready after runSkillMock", () => {
    const skillRun = runSkillMock(createSkillRun(feedbackInput));

    expect(skillRun.status).toBe("draft_ready");
    expect(skillRun.displayContent).toContain("王一路");
    expect(skillRun.structuredResult.parent_message).toBeTruthy();
  });

  it("transitions draft_ready to copied", () => {
    const skillRun = runSkillMock(createSkillRun(feedbackInput));
    const copiedRun = transitionSkillRun(skillRun, "copy_feedback");

    expect(copiedRun.status).toBe("copied");
  });

  it("transitions copied to sent", () => {
    const copiedRun = transitionSkillRun(runSkillMock(createSkillRun(feedbackInput)), "copy_feedback");
    const sentRun = transitionSkillRun(copiedRun, "mark_parent_sent");

    expect(sentRun.status).toBe("sent");
  });

  it("transitions sent to archived only after explicit archive action", () => {
    const copiedRun = transitionSkillRun(runSkillMock(createSkillRun(feedbackInput)), "copy_feedback");
    const sentRun = transitionSkillRun(copiedRun, "mark_parent_sent");
    const archivedRun = transitionSkillRun(sentRun, "archive");

    expect(archivedRun.status).toBe("archived");
  });

  it("does not allow direct archive before confirmation", () => {
    const skillRun = runSkillMock(createSkillRun(feedbackInput));
    const archivedRun = transitionSkillRun(skillRun, "archive");

    expect(archivedRun.status).toBe("failed");
    expect(archivedRun.error?.error_code).toBe("ARCHIVE_REQUIRES_CONFIRMATION");
  });

  it("allows non-feedback SkillCards to archive after explicit teacher review action", () => {
    const skillRun = runSkillMock(createSkillRun(learningRecordInput));
    const archivedRun = transitionSkillRun(skillRun, "archive");

    expect(archivedRun.status).toBe("archived");
  });

  it("keeps concrete subject evidence in learning record drafts", () => {
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "update_learning_record",
        scope: "student",
        subjectId: "student-001",
        subjectName: "王一路",
        inputSummary: "今天王一路物理单位换算比上周稳定，但受力分析画图时容易漏掉摩擦力，独立完成综合题时需要再提醒一次题目条件。",
        context: {
          inputSummary: "今天王一路物理单位换算比上周稳定，但受力分析画图时容易漏掉摩擦力，独立完成综合题时需要再提醒一次题目条件。",
          contextSources: [],
          metadata: {
            subjectArea: "物理"
          }
        }
      })
    );

    expect(skillRun.status).toBe("draft_ready");
    expect(skillRun.displayContent).toContain("单位换算");
    expect(skillRun.displayContent).toContain("摩擦力");
    expect(skillRun.displayContent).toContain("受力图");
    expect(skillRun.displayContent).not.toContain("。；");
    expect(skillRun.structuredResult).toEqual(
      expect.objectContaining({
        strengths: expect.arrayContaining(["单位换算比之前更稳定"]),
        weaknesses: expect.arrayContaining(["受力分析画图时容易漏掉摩擦力"]),
        next_follow_up: expect.arrayContaining(["受力图逐项标注", "单位换算检查"])
      })
    );
  });

  it("keeps multi-subject evidence in one student learning record draft", () => {
    const inputSummary = "今天刘晨数学应用题能列出等量关系，但经常漏掉题干里的限制条件；物理受力分析能画出大方向，但摩擦力方向和单位换算还不稳。";
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "update_learning_record",
        scope: "student",
        subjectId: "student-liu",
        subjectName: "刘晨",
        inputSummary,
        context: {
          inputSummary,
          contextSources: [],
          metadata: {
            subjectArea: "数学、物理"
          }
        }
      })
    );

    expect(skillRun.status).toBe("draft_ready");
    expect(skillRun.displayContent).toContain("等量关系");
    expect(skillRun.displayContent).toContain("限制条件");
    expect(skillRun.displayContent).toContain("受力");
    expect(skillRun.displayContent).toContain("摩擦力");
    expect(skillRun.structuredResult).toEqual(
      expect.objectContaining({
        strengths: expect.arrayContaining(["能列出等量关系", "能判断受力分析大方向"]),
        weaknesses: expect.arrayContaining(["题干限制条件需要二次核对", "受力分析画图时容易漏掉摩擦力"]),
        next_follow_up: expect.arrayContaining(["受力图逐项标注", "单位换算检查", "题目条件二次核对"])
      })
    );
  });

  it("keeps geometry proof reasons in learning record drafts", () => {
    const inputSummary = "刘思源今天几何证明能说出大致思路，但书写时容易跳过理由，尤其是平行线性质和三角形全等条件之间衔接不够完整。下次课需要训练每一步写出依据。";
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "update_learning_record",
        scope: "student",
        subjectId: "student-liu",
        subjectName: "刘思源",
        inputSummary,
        context: {
          inputSummary,
          contextSources: [],
          metadata: {
            subjectArea: "数学"
          }
        }
      })
    );

    expect(skillRun.status).toBe("draft_ready");
    expect(skillRun.displayContent).toContain("几何证明");
    expect(skillRun.displayContent).toContain("跳过理由");
    expect(skillRun.displayContent).toContain("平行线性质");
    expect(skillRun.structuredResult).toEqual(
      expect.objectContaining({
        strengths: expect.arrayContaining(["能说出几何证明大致思路"]),
        weaknesses: expect.arrayContaining(["证明书写容易跳过理由", "平行线性质和全等条件衔接需要更完整"]),
        next_follow_up: expect.arrayContaining(["几何证明步骤复盘", "每一步写出依据", "平行线性质与全等条件衔接"])
      })
    );
  });

  it("keeps concrete learning record evidence when generating parent feedback", () => {
    const inputSummary = "已整理为学习记录草稿：能列出等量关系，能判断受力分析大方向，但题干限制条件需要二次核对，受力分析画图时容易漏掉摩擦力；下次课重点训练受力图逐项标注、单位换算检查、题目条件二次核对。";
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "generate_feedback",
        scope: "student",
        subjectId: "student-liu",
        subjectName: "刘晨",
        inputSummary,
        context: {
          inputSummary,
          contextSources: [],
          metadata: {
            subjectArea: "数学、物理"
          }
        }
      })
    );

    expect(skillRun.status).toBe("draft_ready");
    expect(skillRun.displayContent).toContain("限制条件");
    expect(skillRun.displayContent).toContain("摩擦力");
    expect(skillRun.structuredResult.parent_message).toContain("受力图逐项标注");
  });

  it("keeps failed state structured", () => {
    const skillRun = createSkillRun({
      ...feedbackInput,
      inputSummary: ""
    });
    const failedRun = runSkillMock(skillRun);

    expect(failedRun.status).toBe("failed");
    expect(failedRun.error?.error_code).toBe("NEEDS_INPUT");
    expect(failedRun.error?.error_message).toBeTruthy();
  });

  it("converts every formal output into a SkillCard view model", () => {
    const copiedRun = transitionSkillRun(runSkillMock(createSkillRun(feedbackInput)), "copy_feedback");
    const skillCard = toSkillCardViewModel(copiedRun);

    expect(skillCard.skill_type).toBe("generate_feedback");
    expect(skillCard.title).toContain("王一路");
    expect(skillCard.status).toBe("copied");
    expect(skillCard.input_summary).toBeTruthy();
    expect(skillCard.confidence_level).toBe("medium");
    expect(skillCard.context_sources.length).toBeGreaterThan(0);
    expect(skillCard.actions.length).toBeGreaterThan(0);
    expect(skillCard.archive_target).toBeTruthy();
    expect(skillCard.next_suggestions.length).toBeGreaterThan(0);
    expect(skillCard.run_events).toHaveLength(1);
    expect(skillCard.run_events[0]).toEqual(expect.objectContaining({ action: "copy_feedback", event_type: "state_transition" }));
  });

  it("records non-state actions without changing the main SkillRun status", () => {
    const skillRun = runSkillMock(createSkillRun(learningRecordInput));
    const materialAction = transitionSkillRun(skillRun, "add_monthly_material");
    const practiceAction = transitionSkillRun(materialAction, "generate_practice");
    const noteAction = transitionSkillRun(practiceAction, "save_note");

    expect(materialAction.status).toBe("draft_ready");
    expect(practiceAction.status).toBe("draft_ready");
    expect(noteAction.status).toBe("draft_ready");
    expect(noteAction.events.map((event) => event.action)).toEqual(["add_monthly_material", "generate_practice", "save_note"]);
    expect(noteAction.events.map((event) => event.event_type)).toEqual(["material_action", "material_action", "note_action"]);
  });

  it("returns a subject-agnostic analyze_learning_evidence schema", () => {
    const examples = [
      "上传作文批改图，分析学生问题",
      "这是一份历史材料题作业，分析薄弱点",
      "这是英语口语练习记录，整理表现",
      "这是美术项目作业反馈，提炼进步和问题"
    ];

    for (const inputSummary of examples) {
      const skillRun = runSkillMock(
        createSkillRun({
          skillId: "analyze_learning_evidence",
          scope: "student",
          subjectId: "student-001",
          subjectName: "王一路",
          inputSummary
        })
      );

      expect(skillRun.status).toBe("draft_ready");
      expect(skillRun.structuredResult).toEqual(
        expect.objectContaining({
          material_type: expect.any(String),
          subject: expect.any(String),
          learning_goal: expect.any(String),
          observed_performance: expect.any(String),
          strengths: expect.any(Array),
          weaknesses: expect.any(Array),
          evidence_points: expect.any(Array),
          error_or_gap_patterns: expect.any(Array),
          next_steps: expect.any(Array),
          teacher_review_notes: expect.any(String),
          parent_summary: expect.any(String),
          confidence_level: expect.any(String),
          subject_specific_notes: expect.any(Array),
          teacher_report: expect.any(Object),
          parent_feedback: expect.any(Object),
          monthly_result: expect.any(Object),
          user_facing_result: expect.objectContaining({
            schema_version: "student_learning_material_user_facing_result.v0.1",
            teacher_report: expect.any(Object),
            parent_feedback: expect.any(Object),
            monthly_result: expect.any(Object)
          }),
          report: expect.any(Object)
        })
      );
    }
  });

  it("returns a complete all-subject learning evidence report behind the summary card", () => {
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "analyze_learning_evidence",
        scope: "student",
        subjectId: "student-001",
        subjectName: "王一路",
        inputSummary: "这是一份英语口语练习记录，整理表现和下次跟进"
      })
    );
    const report = skillRun.structuredResult.report as LearningEvidenceReport;
    const userFacingResult = skillRun.structuredResult.user_facing_result as Record<string, unknown>;

    expect(skillRun.displayContent).toContain("第一优先动作");
    expect(skillRun.displayContent.length).toBeLessThan(260);
    expect(userFacingResult).toEqual(
      expect.objectContaining({
        schema_version: "student_learning_material_user_facing_result.v0.1",
        teacher_report: expect.objectContaining({ assessment_style: "professional_evaluation" }),
        parent_feedback: expect.any(Object),
        monthly_result: expect.any(Object)
      })
    );
    expect(JSON.stringify(userFacingResult)).not.toContain("evidenceRefs");
    expect(report).toEqual(
      expect.objectContaining({
        schema_version: "learning_evidence_report_v1",
        material_overview: expect.any(Object),
        overview_judgement: expect.any(Object),
        data_validation: expect.any(Object),
        improvement_path_map: expect.any(Object),
        ability_profile: expect.any(Array),
        problem_pattern_clusters: expect.any(Array),
        key_evidence_cards: expect.any(Array),
        priority_queue: expect.any(Array),
        recurrence_risks: expect.any(Array),
        short_cycle_plan: expect.any(Object),
        next_learning_checklist: expect.any(Array),
        collaboration_actions: expect.any(Object),
        parent_readable_summary: expect.any(String),
        student_profile_update_suggestions: expect.any(Array)
      })
    );
    expect(report.ability_profile.map((item) => item.dimension)).toEqual([
      "task_understanding",
      "core_concepts",
      "process_method",
      "expression_presentation",
      "transfer_application",
      "self_check"
    ]);
    expect(report.student_profile_update_suggestions.map((item) => item.target)).toEqual([
      "ability_profile",
      "weakness_event",
      "recurrence_risk",
      "action_plan",
      "monthly_report_source"
    ]);
  });

  it("captures professional K12 paper analysis gates, per-question judgements, parent feedback, and monthly snapshot", () => {
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "analyze_learning_evidence",
        scope: "student",
        subjectId: "student-001",
        subjectName: "王一路",
        inputSummary: "上传初二数学试卷，有学生作答和老师批改，生成专业测评报告"
      })
    );
    const report = skillRun.structuredResult.report as LearningEvidenceReport;

    expect(report.material_overview).toEqual(
      expect.objectContaining({
        material_type: "exam",
        material_label: "试卷/考试材料",
        subject_area: "数学",
        material_state: "valid_student_material",
        education_stage: "middle",
        grade_candidate: "初二",
        region_or_curriculum_candidate: "未识别",
        recognized_question_count: 3,
        analyzable_question_count: 2
      })
    );
    expect(report.accuracy_policy).toEqual(
      expect.objectContaining({
        target_for_high_confidence_items: ">=99%",
        unsupported_definitive_judgement_allowed: false
      })
    );

    const blockedQuestion = report.question_analyses.find((item) => item.judgement_gate === "teacher_review_required");
    expect(blockedQuestion).toEqual(
      expect.objectContaining({
        judgement: "needs_teacher_review",
        confidence_level: "low",
        teacher_review_required: true
      })
    );
    expect(blockedQuestion?.review_reason).toContain("99%");
    expect(report.question_analyses.every((item) => item.evidence_refs.length > 0)).toBe(true);
    expect(report.data_validation.teacher_review_required_items.join(" ")).toContain("第 3 题");

    expect(report.teacher_professional_report).toEqual(
      expect.objectContaining({
        assessment_style: "professional_evaluation",
        question_table_ready: true
      })
    );
    expect(report.parent_feedback_draft.status).toBe("needs_teacher_review");
    expect(report.parent_feedback_draft.text).not.toMatch(/严重|很差|完全不会|保证提分|不认真|基础很差|一定提高|孩子不行|家长必须/u);

    expect(report.monthly_report_snapshot).toEqual(
      expect.objectContaining({
        question_count: 3,
        analyzable_question_count: 2,
        teacher_confirmed: false
      })
    );
    expect(report.monthly_comparison_seed).toEqual(
      expect.objectContaining({
        previous_month_snapshot: expect.any(Object),
        parent_readable_comparison: expect.stringContaining("和上个月相比")
      })
    );
    expect(report.model_contract).toEqual(
      expect.objectContaining({
        vision_provider_replaceable: true,
        reasoning_model_replaceable: true,
        required_input_schema: "VisionEvidencePacket",
        required_output_schema: "StudentLearningMaterialAnalysis"
      })
    );
  });

  it("keeps the learning evidence report core schema free of math-only fields", () => {
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "analyze_learning_evidence",
        scope: "student",
        subjectId: "student-001",
        subjectName: "王一路",
        inputSummary: "上传美术项目作品反馈，分析学生表现"
      })
    );
    const report = skillRun.structuredResult.report as LearningEvidenceReport;
    const topLevelKeys = Object.keys(report);

    expect(report.material_overview.subject_area).toBe("美术");
    expect(topLevelKeys).not.toEqual(expect.arrayContaining(["score_rate", "recoverable_score", "wrong_questions", "exam_total_score", "math_knowledge_points"]));
  });

  it("generates a parent-readable student monthly report schema", () => {
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "monthly_report",
        scope: "student",
        subjectId: "student-001",
        subjectName: "王一路",
        inputSummary: "整理本月学习记录和家长反馈"
      })
    );
    const report = skillRun.structuredResult.report as MonthlyReport;

    expect(skillRun.status).toBe("draft_ready");
    expect(skillRun.displayContent).toContain("学生月报已生成");
    expect(report).toEqual(
      expect.objectContaining({
        schema_version: "student_monthly_report_v1",
        report_type: "student",
        audience: "parent",
        teacher_summary: expect.any(Object),
        service_overview: expect.any(Object),
        growth_signals: expect.any(Array),
        month_over_month_comparison: expect.any(Object),
        evidence_timeline: expect.any(Array),
        parent_message: expect.any(String)
      })
    );
    if (report.report_type !== "student") throw new Error("expected student report");
    expect(report.parent_message).toContain("王一路");
    expect(report.month_over_month_comparison.parent_readable_comparison).toContain("和上个月相比");
    expect(report.month_over_month_comparison.repeated_issues).toContain("复杂题容易漏限制条件");
    expect(report.safeguards.join(" ")).toContain("家长版");
  });

  it("generates a teacher-facing class monthly report schema", () => {
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "monthly_report",
        scope: "class",
        subjectId: "class-001",
        subjectName: "初二数学 A 班",
        inputSummary: "生成班级月报，复盘本月共性薄弱点"
      })
    );
    const report = skillRun.structuredResult.report as MonthlyReport;

    expect(skillRun.status).toBe("draft_ready");
    expect(skillRun.displayContent).toContain("班级月报已生成");
    expect(report).toEqual(
      expect.objectContaining({
        schema_version: "class_monthly_report_v1",
        report_type: "class",
        audience: "teacher",
        teacher_overview: expect.any(Object),
        service_metrics: expect.any(Object),
        common_weaknesses: expect.any(Array),
        student_segments: expect.any(Array),
        next_month_teaching_plan: expect.any(Array),
        service_followups: expect.any(Array)
      })
    );
    if (report.report_type !== "class") throw new Error("expected class report");
    expect(report.safeguards.join(" ")).toContain("不作为家长群发文案");
  });

  it("returns actionable class lesson record output for teachers", () => {
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "class_lesson_record",
        scope: "class",
        subjectId: "class-001",
        subjectName: "模拟初二数学小班",
        inputSummary: "今天班课讲一次函数应用题。周一然能跟上讲解，但独立列式容易漏条件；陈思远计算速度快，但物理过程表达不够完整。下次课希望按两组分层训练。"
      })
    );

    expect(skillRun.status).toBe("draft_ready");
    expect(skillRun.displayContent).toContain("周一然");
    expect(skillRun.displayContent).toContain("陈思远");
    expect(skillRun.displayContent).toContain("下次课");
    expect(skillRun.displayContent).not.toContain("Skill");
    expect(skillRun.structuredResult).toEqual(
      expect.objectContaining({
        common_issue: expect.any(String),
        student_followups: expect.arrayContaining([
          expect.objectContaining({ student: "周一然", next_action: expect.any(String) }),
          expect.objectContaining({ student: "陈思远", next_action: expect.any(String) })
        ]),
        can_split_to_student_profiles: true
      })
    );
  });

  it("returns actionable next lesson plan output instead of a generic placeholder", () => {
    const skillRun = runSkillMock(
      createSkillRun({
        skillId: "next_lesson_plan",
        scope: "student",
        subjectId: "student-001",
        subjectName: "陈思远",
        inputSummary: "物理浮力题过程表达不完整，单位换算漏了一步。"
      })
    );

    expect(skillRun.status).toBe("draft_ready");
    expect(skillRun.displayContent).toContain("下次课建议");
    expect(skillRun.displayContent).toContain("课后");
    expect(skillRun.displayContent).not.toContain("AI 结果卡");
    expect(skillRun.structuredResult).toEqual(
      expect.objectContaining({
        lesson_goal: expect.any(String),
        warm_up: expect.any(String),
        in_class_training: expect.any(Array),
        exit_check: expect.any(String)
      })
    );
  });
});
