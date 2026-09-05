import { getSkillById } from "./registry";
import { createEditableSkillCardState } from "./actions";
import { createLearningRecordDraft } from "./learning-record-summary";
import { createMockLearningEvidenceReport, summarizeLearningEvidenceReport } from "./learning-evidence-report";
import { createMockMonthlyReport, summarizeMonthlyReport } from "./monthly-report";
import { createMockStudentLearningMaterialUserFacingResult } from "./student-learning-material-analyzer/mock-user-facing-result";
import type {
  MockSkillRunInput,
  MockSkillRunResult,
  SkillActionId,
  SkillRunEventType,
  SkillDefinition,
  SkillId,
  SkillRunContext,
  SkillRunInput,
  SkillRunResult,
  SkillScope,
  SkillSubjectType,
  SkillCardViewModel
} from "./types";

export function createSkillRun(input: SkillRunInput): SkillRunResult {
  const skill = getSkillById(input.skillId);

  if (!skill) {
    return createFailedRun(input, "SKILL_NOT_FOUND", "未找到对应教学任务定义。");
  }

  const inputSummary = input.inputSummary?.trim() || "";
  const context = buildRunContext(skill, inputSummary, input.context);
  const status = needsInput(skill, inputSummary) ? "needs_input" : "created";

  return {
    runId: buildRunId(input.skillId, input.scope, input.subjectId),
    skillId: skill.id,
    skillType: skill.id,
    title: `${input.subjectName} · ${skill.label}`,
    scope: input.scope,
    subjectId: input.subjectId,
    subjectName: input.subjectName,
    status,
    inputSummary: inputSummary || "等待老师补充必要输入",
    context,
    contextSources: context.contextSources,
    confidenceLevel: skill.confidenceLevel,
    structuredResult: {},
    displayContent: "",
    archiveTarget: skill.archiveTarget,
    actions: skill.actions,
    nextSuggestions: skill.nextSuggestions,
    steps: skill.steps,
    events: []
  };
}

export function runSkillMock(skillRun: SkillRunResult): SkillRunResult {
  if (skillRun.status === "needs_input") {
    return failSkillRun(skillRun, "regenerate", "NEEDS_INPUT", "当前教学任务缺少必要输入，不能生成草稿。", true);
  }

  const skill = getSkillById(skillRun.skillId);

  if (!skill) {
    return failSkillRun(skillRun, "regenerate", "SKILL_NOT_FOUND", "未找到对应教学任务定义。", false);
  }

  const subjectArea = typeof skillRun.context.metadata?.subjectArea === "string" ? skillRun.context.metadata.subjectArea : undefined;
  const result = buildMockResult(skillRun.skillId, skillRun.subjectName, skillRun.inputSummary, skillRun.scope, skillRun.runId, skillRun.subjectId, subjectArea);

  return {
    ...skillRun,
    status: "draft_ready",
    structuredResult: result.structuredResult,
    displayContent: result.displayContent,
    actions: skill.actions,
    archiveTarget: skill.archiveTarget,
    error: undefined
  };
}

export function transitionSkillRun(skillRun: SkillRunResult, action: SkillActionId): SkillRunResult {
  if (action === "copy_feedback") {
    if (skillRun.status !== "draft_ready" && skillRun.status !== "copied") {
      return failSkillRun(skillRun, action, "INVALID_TRANSITION", "只有草稿就绪后才能复制。", true);
    }

    return appendRunEvent({ ...skillRun, status: "copied", error: undefined }, action, "state_transition", skillRun.status, "已复制微信反馈。");
  }

  if (action === "mark_parent_sent") {
    if (skillRun.status !== "copied" && skillRun.status !== "sent") {
      return failSkillRun(skillRun, action, "INVALID_TRANSITION", "需要先复制或确认草稿后，才能标记已发送。", true);
    }

    return appendRunEvent({ ...skillRun, status: "sent", error: undefined }, action, "state_transition", skillRun.status, "已标记已发给家长。");
  }

  if (action === "archive") {
    if (requiresSentBeforeArchive(skillRun)) {
      if (skillRun.status !== "sent") {
        return failSkillRun(skillRun, action, "ARCHIVE_REQUIRES_CONFIRMATION", "微信反馈必须先复制并标记已发给家长，才能确认入档。", false);
      }

      return appendRunEvent({ ...skillRun, status: "archived", error: undefined }, action, "state_transition", skillRun.status, "老师确认入档。");
    }

    if (skillRun.status !== "draft_ready" && skillRun.status !== "copied" && skillRun.status !== "sent") {
      return failSkillRun(skillRun, action, "ARCHIVE_REQUIRES_REVIEW", "只有草稿就绪并由老师明确确认后，才能入档。", false);
    }

    return appendRunEvent({ ...skillRun, status: "archived", error: undefined }, action, "state_transition", skillRun.status, "老师确认入档。");
  }

  if (action === "regenerate") {
    return appendRunEvent({ ...skillRun, status: "generating", error: undefined }, action, "state_transition", skillRun.status, "老师请求重新生成。");
  }

  if (action === "make_warmer" || action === "make_shorter") {
    if (skillRun.status !== "draft_ready" && skillRun.status !== "copied") {
      return failSkillRun(skillRun, action, "INVALID_TRANSITION", "只有草稿生成后才能调整表达。", true);
    }

    return appendRunEvent({ ...skillRun, status: "draft_ready", error: undefined }, action, "state_transition", skillRun.status, action === "make_warmer" ? "老师请求改得更温和。" : "老师请求改得更简洁。");
  }

  return appendRunEvent(
    { ...skillRun, error: undefined },
    action,
    getNonStateEventType(action),
    skillRun.status,
    getNonStateActionMessage(action)
  );
}

export function toSkillCardViewModel(skillRun: SkillRunResult): SkillCardViewModel {
  const editableState = createEditableSkillCardState({
    skillRunId: skillRun.runId,
    displayContent: skillRun.displayContent,
    structuredResult: skillRun.structuredResult
  });

  return {
    run_id: skillRun.runId,
    skill_run_id: skillRun.runId,
    skill_type: skillRun.skillType,
    title: skillRun.title,
    status: skillRun.status,
    input_summary: skillRun.inputSummary,
    context_sources: skillRun.contextSources,
    confidence_level: skillRun.confidenceLevel,
    structured_result: skillRun.structuredResult,
    display_content: skillRun.displayContent,
    original_output: editableState.original_output,
    current_output: editableState.current_output,
    edit_events: editableState.edit_events,
    run_events: [...skillRun.events],
    actions: skillRun.actions,
    archive_target: skillRun.archiveTarget,
    next_suggestions: skillRun.nextSuggestions,
    error_code: skillRun.error?.error_code,
    error_message: skillRun.error?.error_message
  };
}

export function runMockSkill(input: MockSkillRunInput): MockSkillRunResult {
  const skill = getSkillById(input.skillId);

  if (!skill) {
    throw new Error(`Unknown skill: ${input.skillId}`);
  }

  const skillRun = runSkillMock(
    createSkillRun({
      skillId: input.skillId,
      scope: mapSubjectTypeToScope(input.subjectType),
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      inputSummary: input.inputSummary || "由当前会话和老师输入触发",
      context: input.subject
        ? {
            inputSummary: input.inputSummary,
            contextSources: skill.contextSources,
            metadata: {
              subjectArea: input.subject
            }
          }
        : undefined
    })
  );

  return {
    skillId: skill.id,
    title: skillRun.title,
    status: skillRun.status,
    inputSummary: skillRun.inputSummary,
    contextSources: skillRun.contextSources,
    confidenceLevel: skillRun.confidenceLevel,
    structuredResult: skillRun.structuredResult,
    displayContent: skillRun.displayContent,
    archiveTarget: skillRun.archiveTarget,
    actions: skillRun.actions,
    nextSuggestions: skillRun.nextSuggestions,
    steps: skillRun.steps
  };
}

export function mapSkillToTaskType(skillId: SkillId) {
  if (skillId === "update_learning_record") return "learning_record";
  if (skillId === "analyze_learning_evidence") return "learning_evidence_analysis";
  if (skillId === "generate_feedback" || skillId === "parent_communication") return "feedback";
  if (skillId === "next_lesson_plan" || skillId === "tiered_practice" || skillId === "lesson_prep") return "lesson_suggestion";
  if (skillId === "monthly_report" || skillId === "batch_monthly_report") return "monthly_report";
  if (skillId === "batch_feedback") return "batch_feedback";
  return "class_analysis";
}

function buildMockResult(skillId: SkillId, subjectName: string, inputSummary = "", scope?: SkillScope, runId = "mock_run", subjectId = "mock_subject", subjectArea?: string) {
  if (skillId === "generate_feedback" || skillId === "parent_communication") {
    const feedbackDraft = createLearningRecordDraft({ inputSummary, subjectArea });
    const strengths = feedbackDraft.structuredResult.strengths.slice(0, 2);
    const weaknesses = feedbackDraft.structuredResult.weaknesses.slice(0, 2);
    const nextFollowUp = feedbackDraft.structuredResult.next_follow_up.slice(0, 3);
    const parentMessage = buildParentFeedbackMessage(subjectName, strengths, weaknesses, nextFollowUp);

    return {
      displayContent: parentMessage,
      structuredResult: {
        parent_message: parentMessage,
        next_follow_up: nextFollowUp,
        missing_context: inputSummary ? [] : ["本节课具体表现"]
      }
    };
  }

  if (skillId === "update_learning_record") {
    return createLearningRecordDraft({ inputSummary, subjectArea });
  }

  if (skillId === "analyze_learning_evidence") {
    const report = createMockLearningEvidenceReport({ subjectName, inputSummary, subjectArea });
    const summary = summarizeLearningEvidenceReport(report);
    const userFacingResult = createMockStudentLearningMaterialUserFacingResult({
      analysisId: `${runId}_analysis`,
      sourceMaterialId: `${runId}_material`,
      studentId: subjectId,
      report
    });

    return {
      displayContent: `已生成学习证据分析草稿：${summary.current_performance}第一优先动作：${summary.first_priority_action}`,
      structuredResult: {
        material_type: summary.material_type,
        subject: summary.subject,
        learning_goal: "把学习材料转化为可跟进、可入档、可复用的学习证据。",
        observed_performance: summary.current_performance,
        strengths: summary.main_strengths,
        weaknesses: summary.main_issues,
        evidence_points: report.data_validation.usable_evidence,
        error_or_gap_patterns: report.problem_pattern_clusters.map((cluster) => cluster.cluster),
        next_steps: report.priority_queue.map((item) => item.action),
        teacher_review_notes: "请老师确认完整报告，并确认哪些建议可以写入学生档案。",
        parent_summary: summary.parent_summary,
        confidence_level: report.overview_judgement.confidence_level,
        subject_specific_notes: [],
        first_priority_action: summary.first_priority_action,
        teacher_report: userFacingResult.teacher_report,
        parent_feedback: userFacingResult.parent_feedback,
        monthly_result: userFacingResult.monthly_result,
        user_facing_result: userFacingResult,
        report
      }
    };
  }

  if (skillId === "next_lesson_plan") {
    return {
      displayContent: `${subjectName}下次课建议先用 8 分钟复盘本次材料中的关键条件和过程表达，再安排 2 组同类题：基础组练审题标注，提升组练完整步骤说明。课后用 1 道题检查是否能独立写清思路。`,
      structuredResult: {
        lesson_goal: "把本次材料中的问题转化为下次课可检查的训练动作。",
        warm_up: "复盘题干关键条件、单位或材料信息，要求学生先标注再动笔。",
        in_class_training: [
          {
            group: "基础巩固",
            task: "做 2 道同模型题，重点检查条件提取和列式前准备。"
          },
          {
            group: "表达提升",
            task: "做 1 道综合题，要求写出关键依据句和完整结论。"
          }
        ],
        exit_check: "课末抽查 1 道题，确认能否独立写清关键步骤。",
        teacher_note: inputSummary || "建议结合本次学习材料和最近入档记录微调。"
      }
    };
  }

  if (skillId === "monthly_report" || skillId === "batch_monthly_report") {
    const monthlyReport = createMockMonthlyReport({
      scope: scope === "class" ? "class" : "student",
      subjectName,
      subjectArea,
      inputSummary
    });
    const monthlySummary = summarizeMonthlyReport(monthlyReport);

    if (scope === "class") {
      return {
        displayContent: monthlySummary,
        structuredResult: {
          monthly_summary: monthlySummary,
          audience: "teacher",
          focus: monthlyReport.report_type === "class" ? monthlyReport.common_weaknesses.map((item) => item.topic) : [],
          source_record_ids: monthlyReport.report_type === "class" ? monthlyReport.evidence_sources.map((item) => item.id) : [],
          confidence_level: monthlyReport.readiness.confidence_level,
          report: monthlyReport
        }
      };
    }

    return {
      displayContent: monthlySummary,
      structuredResult: {
        monthly_summary: monthlySummary,
        audience: "parent",
        source_record_ids: monthlyReport.report_type === "student" ? monthlyReport.evidence_timeline.map((item) => item.id) : [],
        confidence_level: monthlyReport.readiness.confidence_level,
        report: monthlyReport
      }
    };
  }

  if (skillId === "batch_feedback") {
    const classInsight = buildClassTeachingInsight(inputSummary);

    return {
      displayContent: `已整理出两组家长反馈方向：${classInsight.stableStudent}突出课堂跟进和审题提醒，${classInsight.focusStudent}突出过程表达和稳定性。建议先逐条检查措辞，再标记已发给家长。`,
      structuredResult: {
        groups: [
          {
            name: "稳定推进",
            students: [classInsight.stableStudent],
            feedback_focus: "肯定课堂跟进，提醒继续练习审题流程。"
          },
          {
            name: "需要跟进",
            students: [classInsight.focusStudent],
            feedback_focus: "说明过程表达仍需训练，语气保持温和。"
          }
        ],
        next_actions: ["逐条检查措辞", "标记已发给家长", "必要时拆分到学生档案"]
      }
    };
  }

  if (skillId === "class_lesson_record") {
    const classInsight = buildClassTeachingInsight(inputSummary);

    return {
      displayContent: `本次班课建议拆成两条跟进线：${classInsight.stableStudent}重点补「列式前圈条件」，${classInsight.focusStudent}重点补「过程表达完整」。下次课先统一复盘审题流程，再分组练条件提取和表达。`,
      structuredResult: {
        class_topic: classInsight.topic,
        common_issue: "应用题条件提取和步骤表达不够稳定。",
        student_followups: [
          {
            student: classInsight.stableStudent,
            focus: "列式前圈出关键条件，减少漏条件。",
            next_action: "安排同类应用题 3 道，要求先标条件再列式。"
          },
          {
            student: classInsight.focusStudent,
            focus: "把解题过程写完整，尤其是物理或应用题中的因果表达。",
            next_action: "用一道例题示范完整表达，再做 2 道过程复述。"
          }
        ],
        next_class_plan: ["统一复盘审题流程", "分组训练条件提取", "检查过程表达完整性"],
        can_split_to_student_profiles: true
      }
    };
  }

  if (skillId === "common_weakness") {
    const classInsight = buildClassTeachingInsight(inputSummary);

    return {
      displayContent: `班级共性薄弱点集中在「条件提取」和「表达完整性」。${classInsight.stableStudent}优先看漏条件，${classInsight.focusStudent}优先看过程表达；下节课适合先统一示范，再分层练习。`,
      structuredResult: {
        common_weaknesses: ["条件提取不稳定", "解题或表达过程不完整"],
        affected_students: [
          { student: classInsight.stableStudent, reason: "容易漏掉题干关键条件。" },
          { student: classInsight.focusStudent, reason: "答案或过程表达不够完整。" }
        ],
        teaching_priority: "先把审题流程固定下来，再做同类迁移。"
      }
    };
  }

  if (skillId === "tiered_practice") {
    const classInsight = buildClassTeachingInsight(inputSummary);

    return {
      displayContent: `分层练习建议：基础组先做条件标注和标准列式，提升组做同类任务迁移。${classInsight.stableStudent}放在条件提取组，${classInsight.focusStudent}放在过程表达组。`,
      structuredResult: {
        groups: [
          {
            name: "条件提取组",
            students: [classInsight.stableStudent],
            practice: ["圈关键词", "列已知条件", "再列式"]
          },
          {
            name: "过程表达组",
            students: [classInsight.focusStudent],
            practice: ["补全步骤", "口头复述思路", "写完整结论"]
          }
        ],
        next_check: "下节课结束前各抽查 1 道题，确认是否能独立完成。"
      }
    };
  }

  if (skillId === "split_to_student_profiles") {
    const classInsight = buildClassTeachingInsight(inputSummary);

    return {
      displayContent: `已生成两条待确认学生记录：${classInsight.stableStudent}记录为「审题条件易遗漏」，${classInsight.focusStudent}记录为「过程表达需加强」。确认后才会写入各自学生档案。`,
      structuredResult: {
        proposed_records: [
          {
            student: classInsight.stableStudent,
            record: "课堂能跟上讲解，但独立列式前容易遗漏题干关键条件。",
            target: "学生档案 > 学习记录"
          },
          {
            student: classInsight.focusStudent,
            record: "计算推进较快，但表达过程还需要补全步骤和原因说明。",
            target: "学生档案 > 学习记录"
          }
        ],
        requires_teacher_confirmation: true
      }
    };
  }

  return {
    displayContent: "已生成一条可确认的 AI 结果卡，请老师确认是否入档或继续生成下一步。",
    structuredResult: {
      summary: "mock skill result",
      next_actions: ["确认入档", "重新生成"]
    }
  };
}

function buildParentFeedbackMessage(subjectName: string, strengths: string[], weaknesses: string[], nextFollowUp: string[]) {
  const strengthText = strengths.length ? strengths.join("，") : "能跟随课堂任务推进";
  const weaknessText = weaknesses.length ? weaknesses.join("，") : "关键信息提取还需要稳定";
  const nextText = nextFollowUp.length ? nextFollowUp.join("、") : "材料标注、步骤复盘";

  return `家长您好，${subjectName}今天${strengthText}，整体能跟着课堂任务走。这次主要需要继续关注${weaknessText}。后面我会带他练${nextText}，先把步骤做稳。`;
}

function requiresSentBeforeArchive(skillRun: SkillRunResult) {
  const skill = getSkillById(skillRun.skillId);
  return skill?.outputType === "parent_feedback";
}

function buildRunContext(skill: SkillDefinition, inputSummary: string, context?: SkillRunContext): SkillRunContext {
  return {
    inputSummary: context?.inputSummary || inputSummary,
    contextSources: context?.contextSources?.length ? context.contextSources : skill.contextSources,
    recordIds: context?.recordIds || [],
    metadata: context?.metadata || {}
  };
}

function needsInput(skill: SkillDefinition, inputSummary: string) {
  return skill.requiredInput.some((item) => item !== "无") && inputSummary.length === 0;
}

function createFailedRun(input: SkillRunInput, errorCode: string, errorMessage: string): SkillRunResult {
  return {
    runId: buildRunId(input.skillId, input.scope, input.subjectId),
    skillId: input.skillId,
    skillType: input.skillId,
    title: `${input.subjectName} · 结果生成失败`,
    scope: input.scope,
    subjectId: input.subjectId,
    subjectName: input.subjectName,
    status: "failed",
    inputSummary: input.inputSummary || "未能创建教学任务",
    context: input.context || { contextSources: [] },
    contextSources: input.context?.contextSources || [],
    confidenceLevel: "low",
    structuredResult: {},
    displayContent: "",
    archiveTarget: "",
    actions: [],
    nextSuggestions: [],
    steps: [],
    events: [],
    error: {
      error_code: errorCode,
      error_message: errorMessage,
      recoverable: false
    }
  };
}

function failSkillRun(skillRun: SkillRunResult, action: SkillActionId, errorCode: string, errorMessage: string, recoverable: boolean): SkillRunResult {
  return appendRunEvent({
    ...skillRun,
    status: "failed",
    error: {
      error_code: errorCode,
      error_message: errorMessage,
      recoverable
    }
  }, action, "invalid_action", skillRun.status, errorMessage);
}

function buildRunId(skillId: SkillId, scope: SkillScope, subjectId: string) {
  return `mock_run_${skillId}_${scope}_${subjectId}`;
}

function mapSubjectTypeToScope(subjectType: SkillSubjectType): SkillScope {
  if (subjectType === "teacher_workspace") return "teacher";
  return subjectType;
}

function appendRunEvent(skillRun: SkillRunResult, action: SkillActionId, eventType: SkillRunEventType, statusBefore: SkillRunResult["status"], message: string): SkillRunResult {
  return {
    ...skillRun,
    events: [
      ...skillRun.events,
      {
        id: `event_${skillRun.events.length + 1}`,
        skill_run_id: skillRun.runId,
        action,
        event_type: eventType,
        status_before: statusBefore,
        status_after: skillRun.status,
        message,
        created_at: new Date().toISOString()
      }
    ]
  };
}

function getNonStateEventType(action: SkillActionId): SkillRunEventType {
  if (action === "generate_feedback" || action === "generate_next_lesson" || action === "update_learning_record") return "follow_up_request";
  if (action === "generate_practice" || action === "update_weakness" || action === "add_report_material" || action === "add_monthly_material") return "material_action";
  if (action === "save_note") return "note_action";
  return "follow_up_request";
}

function getNonStateActionMessage(action: SkillActionId) {
  if (action === "generate_feedback") return "老师请求基于当前卡片生成微信反馈。";
  if (action === "generate_next_lesson") return "老师请求基于当前卡片生成下次课建议。";
  if (action === "update_learning_record") return "老师请求整理为学习记录。";
  if (action === "generate_practice") return "老师请求生成针对练习。";
  if (action === "update_weakness") return "老师请求更新薄弱点素材。";
  if (action === "add_report_material" || action === "add_monthly_material") return "老师请求加入月报素材。";
  if (action === "save_note") return "老师请求仅保存备注。";
  return "老师触发了后续教学任务。";
}

function buildClassTeachingInsight(inputSummary: string) {
  const stableStudent = inputSummary.includes("周一然") ? "周一然" : inputSummary.includes("王一路") ? "王一路" : "第一组学生";
  const focusStudent = inputSummary.includes("陈思远") ? "陈思远" : inputSummary.includes("李明轩") ? "李明轩" : "第二组学生";
  const topic = inputSummary.includes("一次函数")
    ? "一次函数应用题"
    : inputSummary.includes("几何")
      ? "几何证明"
      : inputSummary.includes("物理")
        ? "物理过程表达"
        : "本次班课内容";

  return {
    stableStudent,
    focusStudent,
    topic
  };
}
