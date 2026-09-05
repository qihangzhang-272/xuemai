import type { AgentMetadata, AgentName } from "./types";

export const AGENT_REGISTRY: Record<AgentName, AgentMetadata> = {
  "parent-feedback": {
    name: "parent-feedback",
    displayName: "家长反馈 Agent",
    description: "根据学生上下文生成微信家长反馈，并产出可确认的学习记录素材。",
    capabilities: ["generate_parent_feedback"],
    inputSchemaName: "ParentFeedbackInput",
    outputSchemaName: "ParentFeedbackOutput",
    version: "0.1.0",
    status: "experimental"
  },
  "wrong-question-analysis": {
    name: "wrong-question-analysis",
    displayName: "错题分析 Agent",
    description: "分析错题知识点、错误原因和举一反三方向。",
    capabilities: ["analyze_wrong_question"],
    inputSchemaName: "WrongQuestionAnalysisInput",
    outputSchemaName: "WrongQuestionAnalysisOutput",
    version: "0.1.0",
    status: "planned"
  },
  "student-profile": {
    name: "student-profile",
    displayName: "学生画像 Agent",
    description: "根据确认后的长期学习记录更新学生画像建议。",
    capabilities: ["update_student_profile"],
    inputSchemaName: "StudentProfileInput",
    outputSchemaName: "StudentProfileOutput",
    version: "0.1.0",
    status: "planned"
  },
  "monthly-report": {
    name: "monthly-report",
    displayName: "月报 Agent",
    description: "基于学习记录、错题和反馈历史生成月度学习报告。",
    capabilities: ["generate_monthly_report"],
    inputSchemaName: "MonthlyReportInput",
    outputSchemaName: "MonthlyReportOutput",
    version: "0.1.0",
    status: "planned"
  },
  "batch-feedback": {
    name: "batch-feedback",
    displayName: "批量反馈 Agent",
    description: "面向班级或学生组批量生成待确认反馈草稿。",
    capabilities: ["batch_generate_feedback"],
    inputSchemaName: "BatchFeedbackInput",
    outputSchemaName: "BatchFeedbackOutput",
    version: "0.1.0",
    status: "planned"
  },
  "lesson-planning": {
    name: "lesson-planning",
    displayName: "备课建议 Agent",
    description: "根据学生薄弱点和班级共性问题生成下次课建议。",
    capabilities: ["plan_lesson"],
    inputSchemaName: "LessonPlanningInput",
    outputSchemaName: "LessonPlanningOutput",
    version: "0.1.0",
    status: "planned"
  },
  "teacher-orchestrator": {
    name: "teacher-orchestrator",
    displayName: "老师工作台总控 Agent",
    description: "识别老师自然语言任务并路由到专业 Agent。",
    capabilities: ["route_teacher_task"],
    inputSchemaName: "TeacherTaskInput",
    outputSchemaName: "TeacherTaskOutput",
    version: "0.1.0",
    status: "planned"
  }
};

export function listAgents() {
  return Object.values(AGENT_REGISTRY);
}

export function getAgentMetadata(name: AgentName) {
  return AGENT_REGISTRY[name];
}

export function listAgentsByStatus(status: AgentMetadata["status"]) {
  return listAgents().filter((agent) => agent.status === status);
}

export function listAgentsByCapability(capability: AgentMetadata["capabilities"][number]) {
  return listAgents().filter((agent) => agent.capabilities.includes(capability));
}
