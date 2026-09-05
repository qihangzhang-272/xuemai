import type { ChatIntent, Conversation, TaskCard, TaskStep, TaskType } from "./types";
import { createLearningRecordDraft } from "../../src/skills/learning-record-summary";

const taskStepLabels: Record<TaskType, string[]> = {
  learning_record: ["识别课堂记录", "提取表现证据", "整理学习记录", "待入档处理"],
  learning_evidence_analysis: ["识别材料类型", "提取表现证据", "归纳优势与薄弱点", "生成分析卡片"],
  feedback: ["读取学生最近记录", "整理学习表现", "生成家长反馈", "优化微信表达"],
  lesson_suggestion: ["读取薄弱点", "整理错题类型", "生成训练重点", "生成下次课建议"],
  class_analysis: ["读取班级成员记录", "统计共性问题", "筛选重点关注学生", "生成班级建议"],
  monthly_report: ["读取本月记录", "筛选关键证据", "整理进步与问题", "生成月报摘要"],
  batch_feedback: ["读取待反馈学生", "整理共性表现", "生成分组反馈", "待反馈处理"]
};

export function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function detectIntent(text: string): ChatIntent {
  if (text.includes("反馈") || text.includes("微信") || text.includes("家长")) return "feedback";
  if (text.includes("月报") || text.includes("月度")) return "monthly_report";
  if (text.includes("批量")) return "batch_feedback";
  if (text.includes("下次课") || text.includes("建议") || text.includes("训练")) return "lesson_suggestion";
  if (text.includes("班级") || text.includes("全班") || text.includes("共性问题")) return "class_analysis";
  if (text.includes("今天") || text.includes("课堂") || text.includes("上课") || text.includes("课后")) return "learning_record";
  if (text.includes("分析") || text.includes("卷子") || text.includes("试卷") || text.includes("作业") || text.includes("错题") || text.includes("作文") || text.includes("阅读") || text.includes("材料题") || text.includes("口语") || text.includes("实验") || text.includes("美术") || text.includes("音乐") || text.includes("项目") || text.includes("作品")) return "learning_evidence_analysis";
  return "normal_chat";
}

export function getTaskTitle(taskType: TaskType, conversation: Conversation) {
  const scope = conversation.name;
  if (taskType === "learning_record") return `${scope} · 学习记录整理`;
  if (taskType === "learning_evidence_analysis") return `${scope} · 学习材料分析`;
  if (taskType === "feedback") return `${scope} · 微信反馈生成`;
  if (taskType === "lesson_suggestion") return `${scope} · 下次课建议`;
  if (taskType === "monthly_report") return conversation.kind === "class" ? `${scope} · 班级月报` : `${scope} · 月报素材整理`;
  if (taskType === "batch_feedback") return `${scope} · 批量反馈草稿`;
  return `${scope} · 班级学习分析`;
}

export function createSteps(taskType: TaskType): TaskStep[] {
  return taskStepLabels[taskType].map((label, index) => ({
    label,
    status: index === 0 ? "running" : "waiting"
  }));
}

export function createTaskResult(task: TaskCard, conversation: Conversation): Pick<TaskCard, "summary" | "feedbackText" | "detail"> {
  if (task.taskType === "monthly_report") {
    if (conversation.kind === "class") {
      return {
        summary: "已整理班级月报草稿：面向老师复盘本月班课节奏、共性薄弱点、重点学生和下月分层安排。",
        feedbackText: "班级月报草稿：本月班课推进稳定，函数应用题和证明步骤是共性薄弱点。下月建议按学生掌握情况做分层练习，并优先跟进需要关注的学生。",
        detail: "班级月报用于老师复盘和服务监控，不作为家长群发内容。建议结构：班课节奏、共性薄弱点、重点学生、下月分层安排。"
      };
    }

    return {
      summary: "已整理本月学习记录、错题证据和反馈记录，建议月底生成一版面向家长的月度总结。",
      feedbackText: "本月整体学习节奏稳定，建议月报重点呈现课堂投入、典型薄弱点、已完成训练和下月跟进计划。",
      detail: "月报素材：近期课堂记录 3 条，错题归因 2 类，家长反馈 2 次。建议结构：本月表现、核心进步、仍需巩固、下月安排。"
    };
  }

  if (task.taskType === "class_analysis" || conversation.kind === "class") {
    return {
      summary: "本班近期共性问题集中在一次函数图像理解、几何证明步骤完整性和应用题建模。王一路、李明轩、张子涵需要重点关注。",
      feedbackText: "本周班级整体学习状态稳定，但部分同学在函数图像和应用题建模方面仍需加强。下节课建议先统一讲解共性问题，再进行分层练习。",
      detail: "班级共性问题：1. 函数图像理解不够稳定；2. 几何证明步骤完整性不足；3. 应用题建模表达偏弱。建议下节课统一讲解共性问题，再按学生状态分层训练。"
    };
  }

  if (task.taskType === "learning_record") {
    const draft = createLearningRecordDraft({
      inputSummary: task.inputSummary,
      subjectArea: task.subject ?? conversation.subject
    });

    return {
      summary: draft.displayContent,
      feedbackText: draft.displayContent.replace(/^已整理为学习记录草稿：/u, "学习记录草稿："),
      detail: "记录依据：老师课堂输入。后续动作：确认入档、生成微信反馈、生成下次课建议。"
    };
  }

  if (task.taskType === "feedback") {
    return {
      summary: "已根据近期学习记录生成一版适合微信发送的家长反馈，语气温和、重点清晰。",
      feedbackText: "家长您好，孩子最近课堂状态整体稳定，基础题完成度不错，但在应用题条件提取和表达规范上还需要继续练习。我会在后续课程里重点带他做读题标注和分步表达训练。",
      detail: "反馈依据：近期课堂表现、作业完成情况和错题类型。表达策略：先肯定状态，再说明可训练问题，最后给出下次课安排。"
    };
  }

  if (task.taskType === "lesson_suggestion") {
    return {
      summary: "下次课建议围绕薄弱点复盘、同类题变式训练和反馈闭环展开。",
      feedbackText: "下次课建议先复盘本次错题，再进行同类题变式训练，最后用 2-3 道综合题检查掌握情况。",
      detail: "下次课安排：1. 复盘典型错题；2. 拆解条件提取方法；3. 进行同类题变式训练；4. 课后生成家长反馈。"
    };
  }

  if (task.taskType === "batch_feedback") {
    return {
      summary: "已按学生状态拆出三组反馈方向：稳定保持、需要跟进、重点提醒。",
      feedbackText: "本周班级整体学习状态稳定，我会按学生情况分别补充个性化反馈，避免一刀切。",
      detail: "批量反馈分组：1. 稳定保持：张子涵；2. 需要跟进：李明轩；3. 重点提醒：王一路。后续应逐条确认后再发送。"
    };
  }

  return {
    summary: "本次学习材料显示学生能理解主要任务，但在关键信息提取、过程表达和独立迁移上还需要巩固。",
    feedbackText: `家长您好，${conversation.name}这次学习材料整体完成度不错，但在关键信息提取和过程表达上还需要加强。后续我会安排同类材料复盘和表达完整性训练。`,
    detail: "通用分析：1. 关键信息提取不稳定；2. 过程表达不够完整；3. 迁移到新任务时稳定性不足。"
  };
}
