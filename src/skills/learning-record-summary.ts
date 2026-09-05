export type LearningRecordDraft = {
  displayContent: string;
  structuredResult: {
    performance: string;
    strengths: string[];
    weaknesses: string[];
    next_follow_up: string[];
  };
};

type LearningRecordDraftInput = {
  inputSummary?: string;
  subjectArea?: string;
};

export function createLearningRecordDraft({ inputSummary = "", subjectArea = "" }: LearningRecordDraftInput): LearningRecordDraft {
  const source = normalizeInput(inputSummary);
  const strengths = uniqueNonEmpty(extractStrengths(source, subjectArea));
  const weaknesses = uniqueNonEmpty(extractWeaknesses(source, subjectArea));
  const nextFollowUp = uniqueNonEmpty(extractNextFollowUp(source, subjectArea, weaknesses));
  const performance = buildPerformance(strengths, weaknesses, source);

  return {
    displayContent: `已整理为学习记录草稿：${performance}；下次课重点训练${nextFollowUp.join("、")}。`,
    structuredResult: {
      performance,
      strengths,
      weaknesses,
      next_follow_up: nextFollowUp
    }
  };
}

function normalizeInput(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractStrengths(source: string, subjectArea: string) {
  const strengths: string[] = [];

  if (source.includes("等量关系") && (source.includes("能列") || source.includes("列出"))) strengths.push("能列出等量关系");
  if (source.includes("受力") && (source.includes("大方向") || source.includes("能画"))) strengths.push("能判断受力分析大方向");
  if (source.includes("单位换算") && source.includes("稳定")) strengths.push("单位换算比之前更稳定");
  if ((source.includes("能跟上") || source.includes("跟得上")) && (source.includes("课堂") || source.includes("讲解"))) strengths.push("课堂讲解能跟上");
  if (source.includes("列式") && (source.includes("好") || source.includes("进步") || source.includes("稳定"))) strengths.push("列式过程有进步");
  if (source.includes("审题") && (source.includes("稳定") || source.includes("提升"))) strengths.push("审题稳定性有提升");
  if (source.includes("表达") && (source.includes("完整") || source.includes("清楚"))) strengths.push("表达完整性有改善");
  if ((source.includes("几何") || source.includes("证明")) && (source.includes("思路") || source.includes("大致"))) strengths.push("能说出几何证明大致思路");

  if (!strengths.length) {
    if (subjectArea.includes("物理")) strengths.push("能跟随本节物理任务推进");
    else strengths.push("能跟随课堂任务推进");
  }

  return strengths;
}

function extractWeaknesses(source: string, subjectArea: string) {
  const hasFriction = source.includes("摩擦力");
  const hasRestrictionCondition = source.includes("限制条件");
  const hasGeometryProof = source.includes("几何") || source.includes("证明");
  const weaknesses = sortByInputOrder([
    createEvidenceCandidate(source, "摩擦力", "受力分析画图时容易漏掉摩擦力"),
    hasFriction ? null : createEvidenceCandidate(source, "受力", "受力分析过程需要继续稳定"),
    createConditionalEvidenceCandidate(source, "单位换算", source.includes("错") || source.includes("跳步") || source.includes("不稳"), "单位换算步骤需要继续检查"),
    createEvidenceCandidate(source, "跳过理由", "证明书写容易跳过理由"),
    createEvidenceCandidate(source, "依据", "每一步证明依据需要写完整"),
    source.includes("平行线") || source.includes("全等") ? createEvidenceCandidate(source, source.includes("平行线") ? "平行线" : "全等", "平行线性质和全等条件衔接需要更完整") : null,
    hasRestrictionCondition ? createEvidenceCandidate(source, "限制条件", "题干限制条件需要二次核对") : hasGeometryProof ? null : createEvidenceCandidate(source, "条件", "综合题题目条件需要二次核对"),
    hasRestrictionCondition ? null : createEvidenceCandidate(source, "漏", subjectArea.includes("物理") ? "关键信息和物理条件容易遗漏" : "题干关键信息容易遗漏"),
    createEvidenceCandidate(source, "表达", "过程表达完整性需要加强"),
    createEvidenceCandidate(source, "迁移", "同类任务迁移稳定性需要加强")
  ]);

  if (!weaknesses.length) {
    weaknesses.push(subjectArea.includes("物理") ? "物理过程分析还需要更完整" : "独立完成时关键信息提取还需稳定");
  }

  return weaknesses;
}

function extractNextFollowUp(source: string, subjectArea: string, weaknesses: string[]) {
  const nextFollowUp: string[] = [];
  const weaknessText = weaknesses.join(" ");

  if (source.includes("摩擦力") || weaknessText.includes("受力")) nextFollowUp.push("受力图逐项标注");
  if (source.includes("单位换算") || weaknessText.includes("单位换算")) nextFollowUp.push("单位换算检查");
  if (source.includes("几何") || source.includes("证明") || weaknessText.includes("证明")) nextFollowUp.push("几何证明步骤复盘");
  if (source.includes("依据") || source.includes("理由") || weaknessText.includes("依据") || weaknessText.includes("理由")) nextFollowUp.push("每一步写出依据");
  if (source.includes("平行线") || source.includes("全等") || weaknessText.includes("平行线") || weaknessText.includes("全等")) nextFollowUp.push("平行线性质与全等条件衔接");
  if (source.includes("条件") || weaknessText.includes("条件")) nextFollowUp.push("题目条件二次核对");
  if (source.includes("表达") || weaknessText.includes("表达")) nextFollowUp.push("步骤表达完整性");
  if (source.includes("迁移") || source.includes("综合题")) nextFollowUp.push("同类综合题迁移");

  if (!nextFollowUp.length) {
    nextFollowUp.push(subjectArea.includes("物理") ? "过程标注" : "材料标注", "步骤复盘");
  }

  return nextFollowUp.slice(0, 4);
}

function buildPerformance(strengths: string[], weaknesses: string[], source: string) {
  if (source) {
    return `${joinLearningEvidence(strengths.slice(0, 2))}，但${joinLearningEvidence(weaknesses.slice(0, 2))}`;
  }

  return "课堂能跟上讲解，但独立完成时关键信息提取还需稳定";
}

function createEvidenceCandidate(source: string, trigger: string, label: string) {
  const index = source.indexOf(trigger);
  return index >= 0 ? { index, label } : null;
}

function createConditionalEvidenceCandidate(source: string, trigger: string, enabled: boolean, label: string) {
  return enabled ? createEvidenceCandidate(source, trigger, label) : null;
}

function sortByInputOrder(candidates: Array<{ index: number; label: string } | null>) {
  return candidates
    .filter((candidate): candidate is { index: number; label: string } => Boolean(candidate))
    .sort((left, right) => left.index - right.index)
    .map((candidate) => candidate.label);
}

function joinLearningEvidence(values: string[]) {
  return values.filter(Boolean).join("，");
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
