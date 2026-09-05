import type { EvaluationResult } from "../shared/evaluation/evaluator";
import type { EvaluationDimensionScore } from "../shared/evaluation/scoring";
import type { QualityRubric } from "../shared/evaluation/quality-rubrics";
import { calculateOverallScore, findFailedDimensions } from "../shared/evaluation/scoring";
import { PARENT_FEEDBACK_BANNED_PHRASES } from "./constants";
import type { ParentFeedbackModelOutput } from "./types";

export const PARENT_FEEDBACK_RUBRIC: QualityRubric = {
  id: "parent-feedback-quality",
  label: "Parent Feedback Quality",
  dimensions: [
    {
      id: "specificity",
      label: "具体性",
      description: "是否结合课堂表现、错题或知识点给出具体反馈。",
      weight: 20,
      minimumPassingScore: 0.7
    },
    {
      id: "wechat_naturalness",
      label: "微信自然度",
      description: "是否像老师发给家长的一段自然微信消息。",
      weight: 15,
      minimumPassingScore: 0.7
    },
    {
      id: "warmth",
      label: "温和程度",
      description: "是否温和克制，不制造焦虑或贴标签。",
      weight: 15,
      minimumPassingScore: 0.75
    },
    {
      id: "core_issue_clarity",
      label: "核心问题明确",
      description: "是否明确指出核心问题。",
      weight: 20,
      minimumPassingScore: 0.75
    },
    {
      id: "next_action_clarity",
      label: "下一步动作明确",
      description: "是否给出可执行的下一步训练方向。",
      weight: 20,
      minimumPassingScore: 0.75
    },
    {
      id: "length_fit",
      label: "长度合适",
      description: "是否适合微信发送，不太短也不冗长。",
      weight: 10,
      minimumPassingScore: 0.7
    }
  ]
};

export function evaluateParentFeedbackOutput(output: ParentFeedbackModelOutput): EvaluationResult {
  const dimensionScores: EvaluationDimensionScore[] = [
    scoreSpecificity(output),
    scoreWechatNaturalness(output),
    scoreWarmth(output),
    scoreCoreIssue(output),
    scoreNextAction(output),
    scoreLength(output)
  ];
  const overallScore = Math.round(calculateOverallScore(dimensionScores, PARENT_FEEDBACK_RUBRIC) * 100);
  const failedDimensions = findFailedDimensions(dimensionScores, PARENT_FEEDBACK_RUBRIC);
  const warnings = failedDimensions.map((dimension) => `${dimension.label}未达到最低要求`);

  return {
    rubricId: PARENT_FEEDBACK_RUBRIC.id,
    overallScore,
    dimensionScores,
    passed: overallScore >= 80 && failedDimensions.length === 0,
    requiresRevision: overallScore < 80 || failedDimensions.length > 0,
    warnings
  };
}

function scoreSpecificity(output: ParentFeedbackModelOutput): EvaluationDimensionScore {
  const hasKnowledge = output.relatedKnowledgePoints.length > 0;
  const mentionsCore = output.feedbackText.includes(output.coreIssue.slice(0, 6));
  const score = hasKnowledge && mentionsCore ? 1 : hasKnowledge || mentionsCore ? 0.75 : 0.45;

  return {
    dimension: "specificity",
    score,
    reasons: ["检查是否结合知识点和核心问题。"]
  };
}

function scoreWechatNaturalness(output: ParentFeedbackModelOutput): EvaluationDimensionScore {
  const hasMarkdown = /[#*>\-`]/.test(output.feedbackText);
  const hasTitleLikePrefix = /^.{0,12}[：:]\s*/.test(output.feedbackText);
  const score = hasMarkdown || hasTitleLikePrefix ? 0.55 : 0.9;

  return {
    dimension: "wechat_naturalness",
    score,
    reasons: ["检查是否避免标题、Markdown 或报告腔。"]
  };
}

function scoreWarmth(output: ParentFeedbackModelOutput): EvaluationDimensionScore {
  const hitBannedPhrase = PARENT_FEEDBACK_BANNED_PHRASES.some((phrase) => output.feedbackText.includes(phrase));
  const score = hitBannedPhrase ? 0.3 : 0.9;

  return {
    dimension: "warmth",
    score,
    reasons: ["检查是否包含焦虑、标签化或保证式表达。"]
  };
}

function scoreCoreIssue(output: ParentFeedbackModelOutput): EvaluationDimensionScore {
  const score = output.coreIssue.trim().length >= 4 && output.feedbackText.includes(output.coreIssue.slice(0, 4)) ? 1 : 0.65;

  return {
    dimension: "core_issue_clarity",
    score,
    reasons: ["检查是否明确表达核心问题。"]
  };
}

function scoreNextAction(output: ParentFeedbackModelOutput): EvaluationDimensionScore {
  const actionWords = ["练", "训练", "复盘", "巩固", "订正", "审题", "跟进"];
  const hasActionWord = actionWords.some((word) => output.nextAction.includes(word) || output.feedbackText.includes(word));
  const score = output.nextAction.trim().length >= 4 && hasActionWord ? 1 : 0.65;

  return {
    dimension: "next_action_clarity",
    score,
    reasons: ["检查是否给出下一步动作。"]
  };
}

function scoreLength(output: ParentFeedbackModelOutput): EvaluationDimensionScore {
  const length = output.feedbackText.trim().length;
  const score = length >= 80 && length <= 260 ? 1 : length >= 60 && length <= 320 ? 0.75 : 0.45;

  return {
    dimension: "length_fit",
    score,
    reasons: [`当前反馈长度为 ${length} 字。`]
  };
}
