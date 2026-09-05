import type { K12EducationStage, K12Subject } from "./types";

export type MainlandK12ReferenceSource = {
  title: string;
  source_type: "official_policy" | "official_curriculum" | "public_secondary_reference" | "research_reference";
  url: string;
  notes: string;
};

export type MainlandK12StageReference = {
  stage: Exclude<K12EducationStage, "unknown">;
  curriculum_basis: string;
  common_subjects: K12Subject[];
  notes: string[];
};

export type MainlandK12SubjectReference = {
  subject: K12Subject;
  stages: K12EducationStage[];
  ability_dimensions: string[];
  common_material_signals: string[];
  report_focus: string[];
};

export type MainlandK12RegionCoverageGroup = "华北" | "东北" | "华东" | "华中" | "华南" | "西南" | "西北";

export type MainlandK12CurriculumVersionFamily =
  | "国家统编/部编"
  | "人教系"
  | "师大系"
  | "地方教材系"
  | "外语教材系"
  | "教科/综合系";

export type MainlandK12RegionCurriculumCoverage = {
  region_groups: MainlandK12RegionCoverageGroup[];
  curriculum_version_families: MainlandK12CurriculumVersionFamily[];
  exam_scope_signals: string[];
};

const regionCoverageGroupByLabel: Record<string, MainlandK12RegionCoverageGroup> = {
  北京: "华北",
  天津: "华北",
  河北: "华北",
  山西: "华北",
  内蒙古: "华北",
  辽宁: "东北",
  吉林: "东北",
  黑龙江: "东北",
  上海: "华东",
  江苏: "华东",
  浙江: "华东",
  安徽: "华东",
  福建: "华东",
  江西: "华东",
  山东: "华东",
  河南: "华中",
  湖北: "华中",
  湖南: "华中",
  广东: "华南",
  广西: "华南",
  海南: "华南",
  重庆: "西南",
  四川: "西南",
  贵州: "西南",
  云南: "西南",
  西藏: "西南",
  陕西: "西北",
  甘肃: "西北",
  青海: "西北",
  宁夏: "西北",
  新疆: "西北"
};

const curriculumVersionFamilyByLabel: Record<string, MainlandK12CurriculumVersionFamily> = {
  统编版: "国家统编/部编",
  部编版: "国家统编/部编",
  人教版: "人教系",
  北师大版: "师大系",
  华师大版: "师大系",
  华东师大版: "师大系",
  西师版: "师大系",
  西南师大版: "师大系",
  苏教版: "地方教材系",
  苏科版: "地方教材系",
  沪教版: "地方教材系",
  沪科版: "地方教材系",
  沪粤版: "地方教材系",
  鲁教版: "地方教材系",
  鲁科版: "地方教材系",
  粤教版: "地方教材系",
  冀教版: "地方教材系",
  冀少版: "地方教材系",
  浙教版: "地方教材系",
  湘教版: "地方教材系",
  湘少版: "地方教材系",
  鄂教版: "地方教材系",
  青岛版: "地方教材系",
  北京版: "地方教材系",
  京改版: "地方教材系",
  外研版: "外语教材系",
  译林版: "外语教材系",
  仁爱版: "外语教材系",
  牛津上海版: "外语教材系",
  教科版: "教科/综合系"
};

const examScopeSignalByLabel: Record<string, string> = {
  全国: "全国/新课标",
  全国卷: "全国/新课标",
  全国甲卷: "全国/新课标",
  全国乙卷: "全国/新课标",
  新课标: "全国/新课标",
  新课标卷: "全国/新课标",
  新高考: "新高考",
  新高考卷: "新高考"
};

export const mainlandK12ReferenceSources: MainlandK12ReferenceSource[] = [
  {
    title: "义务教育课程方案和课程标准（2022年版）",
    source_type: "official_curriculum",
    url: "https://www.moe.gov.cn/srcsite/A26/s8001/202204/t20220420_619921.html",
    notes: "用于小学、初中学科与核心素养口径；生产验收前应以官方 PDF 或正式出版物复核。"
  },
  {
    title: "普通高中课程方案和语文等学科课程标准（2017年版2020年修订）",
    source_type: "official_curriculum",
    url: "https://www.moe.gov.cn/srcsite/A26/s8001/202005/t20200513_454346.html",
    notes: "用于高中学科、必修/选择性必修和核心素养口径；生产验收前应以官方 PDF 或正式出版物复核。"
  },
  {
    title: "教育部关于加强初中学业水平考试命题工作的意见（教基〔2019〕15号）",
    source_type: "official_policy",
    url: "https://www.moe.gov.cn/srcsite/A06/s3321/201911/t20191128_410798.html",
    notes: "用于初中考试材料分析边界：依据课程标准、关注核心素养，不把超标竞赛内容当常规掌握要求。"
  },
  {
    title: "深化新时代教育评价改革总体方案",
    source_type: "official_policy",
    url: "https://www.gov.cn/zhengce/2020-10/13/content_5551032.htm",
    notes: "用于报告表达边界：关注过程、证据和发展，不做唯分数或绝对化判断。"
  }
];

export const mainlandK12StageReferences: MainlandK12StageReference[] = [
  {
    stage: "primary",
    curriculum_basis: "义务教育课程方案和课程标准（2022年版）",
    common_subjects: ["语文", "数学", "英语", "科学", "道德与法治", "信息科技", "其他"],
    notes: ["小学材料以基础概念、表达习惯、阅读理解、运算与应用、科学探究等可见学习证据为主。"]
  },
  {
    stage: "middle",
    curriculum_basis: "义务教育课程方案和课程标准（2022年版）",
    common_subjects: ["语文", "数学", "英语", "物理", "化学", "生物学", "生物", "历史", "地理", "道德与法治", "科学", "信息科技", "其他"],
    notes: ["初中考试和练习分析应以课程标准为边界；校外竞赛题、高中内容和明显超纲内容应标注风险。"]
  },
  {
    stage: "high",
    curriculum_basis: "普通高中课程方案和语文等学科课程标准（2017年版2020年修订）",
    common_subjects: [
      "语文",
      "数学",
      "英语",
      "日语",
      "俄语",
      "德语",
      "法语",
      "西班牙语",
      "思想政治",
      "历史",
      "地理",
      "物理",
      "化学",
      "生物学",
      "生物",
      "信息技术",
      "通用技术",
      "其他"
    ],
    notes: ["高中材料应区分必修、选择性必修、选修或地方考试口径；没有证据时不要假设具体教材版本。"]
  }
];

export const mainlandK12SubjectReferences: MainlandK12SubjectReference[] = [
  {
    subject: "语文",
    stages: ["primary", "middle", "high"],
    ability_dimensions: ["语言积累与运用", "阅读理解", "文本分析", "写作表达", "审美与文化理解"],
    common_material_signals: ["现代文阅读", "文言文", "作文", "基础知识", "古诗文", "语言运用"],
    report_focus: ["概括和理解证据", "表达完整性", "审题与立意", "文本依据引用"]
  },
  {
    subject: "数学",
    stages: ["primary", "middle", "high"],
    ability_dimensions: ["概念理解", "运算能力", "逻辑推理", "模型建构", "图形与空间观念", "数据分析"],
    common_material_signals: ["选择题", "填空题", "计算题", "应用题", "证明题", "函数", "几何", "统计"],
    report_focus: ["审题条件提取", "过程完整性", "运算与符号规范", "模型迁移", "检查习惯"]
  },
  {
    subject: "英语",
    stages: ["primary", "middle", "high"],
    ability_dimensions: ["词汇语法", "阅读理解", "听说表达", "写作组织", "语篇意识", "文化理解"],
    common_material_signals: ["完形填空", "阅读理解", "语法填空", "作文", "听力", "翻译"],
    report_focus: ["语篇线索定位", "语法准确性", "表达连贯性", "词汇使用", "答题策略"]
  },
  {
    subject: "物理",
    stages: ["middle", "high"],
    ability_dimensions: ["概念规律", "模型建构", "受力或过程分析", "实验探究", "数据处理", "规范表达"],
    common_material_signals: ["力学", "电学", "实验题", "计算题", "图像题", "综合应用"],
    report_focus: ["物理情境建模", "公式适用条件", "图像和单位", "实验变量控制"]
  },
  {
    subject: "化学",
    stages: ["middle", "high"],
    ability_dimensions: ["概念辨析", "符号与方程式", "实验探究", "物质转化", "定量计算", "证据推理"],
    common_material_signals: ["化学方程式", "实验题", "推断题", "计算题", "物质性质", "离子反应"],
    report_focus: ["反应条件与守恒", "实验现象和结论对应", "符号书写", "推断链条"]
  },
  {
    subject: "生物",
    stages: ["middle", "high"],
    ability_dimensions: ["生命观念", "结构与功能", "科学探究", "遗传与进化", "生态理解", "资料分析"],
    common_material_signals: ["选择题", "实验探究", "遗传题", "图表题", "生态题"],
    report_focus: ["概念关系", "图表信息读取", "变量控制", "实验结论表达"]
  },
  {
    subject: "生物学",
    stages: ["middle", "high"],
    ability_dimensions: ["生命观念", "结构与功能", "科学探究", "遗传与进化", "生态理解", "资料分析"],
    common_material_signals: ["选择题", "实验探究", "遗传题", "图表题", "生态题"],
    report_focus: ["概念关系", "图表信息读取", "变量控制", "实验结论表达"]
  },
  {
    subject: "历史",
    stages: ["middle", "high"],
    ability_dimensions: ["时空观念", "史料实证", "历史解释", "因果分析", "观点表达"],
    common_material_signals: ["材料题", "选择题", "年代线索", "史料分析", "论述题"],
    report_focus: ["材料依据定位", "时空线索", "因果链条", "观点和证据匹配"]
  },
  {
    subject: "地理",
    stages: ["middle", "high"],
    ability_dimensions: ["区域认知", "综合思维", "地理实践力", "图表判读", "人地协调观"],
    common_material_signals: ["地图", "等值线", "气候图", "区域材料", "综合题"],
    report_focus: ["图表信息读取", "区域要素关联", "因地制宜分析", "术语规范"]
  },
  {
    subject: "道德与法治",
    stages: ["primary", "middle"],
    ability_dimensions: ["价值判断", "规则意识", "法治观念", "材料分析", "观点表达"],
    common_material_signals: ["情境材料", "选择题", "简答题", "辨析题", "时政材料"],
    report_focus: ["观点是否有材料依据", "概念和情境匹配", "表达完整性"]
  },
  {
    subject: "思想政治",
    stages: ["high"],
    ability_dimensions: ["政治认同", "科学精神", "法治意识", "公共参与", "材料论证"],
    common_material_signals: ["选择题", "材料分析", "辨析题", "经济生活", "哲学", "政治与法治"],
    report_focus: ["原理匹配", "材料提取", "论证链条", "术语规范"]
  },
  {
    subject: "科学",
    stages: ["primary", "middle"],
    ability_dimensions: ["科学概念", "观察记录", "实验探究", "证据推理", "表达交流"],
    common_material_signals: ["实验记录", "观察题", "探究题", "科学阅读", "图表"],
    report_focus: ["现象与结论对应", "变量控制", "证据意识", "记录完整性"]
  },
  {
    subject: "信息科技",
    stages: ["primary", "middle"],
    ability_dimensions: ["信息意识", "计算思维", "数字化学习", "信息社会责任"],
    common_material_signals: ["算法", "程序", "数据处理", "信息安全", "项目作业"],
    report_focus: ["问题分解", "步骤逻辑", "数据处理", "安全与规范"]
  },
  {
    subject: "信息技术",
    stages: ["high"],
    ability_dimensions: ["信息意识", "计算思维", "数字化学习与创新", "信息社会责任"],
    common_material_signals: ["算法", "程序", "数据结构", "网络", "数据管理", "项目作业"],
    report_focus: ["算法逻辑", "数据建模", "调试习惯", "信息责任"]
  },
  {
    subject: "通用技术",
    stages: ["high"],
    ability_dimensions: ["技术意识", "工程思维", "图样表达", "设计实践", "评价改进"],
    common_material_signals: ["设计题", "图样", "结构", "流程", "控制", "项目作品"],
    report_focus: ["需求分析", "方案论证", "图样和流程表达", "测试改进"]
  }
];

const foreignLanguageReference: MainlandK12SubjectReference = {
  subject: "英语",
  stages: ["high"],
  ability_dimensions: ["词汇语法", "阅读理解", "听说表达", "写作组织", "语篇意识", "文化理解"],
  common_material_signals: ["阅读理解", "语法", "翻译", "写作", "听力"],
  report_focus: ["语篇线索定位", "语法准确性", "表达连贯性", "词汇使用", "答题策略"]
};

export function getMainlandK12StageReference(stage: K12EducationStage) {
  return mainlandK12StageReferences.find((reference) => reference.stage === stage);
}

export function getMainlandK12SubjectReference(subject: K12Subject): MainlandK12SubjectReference {
  if (subject === "日语" || subject === "俄语" || subject === "德语" || subject === "法语" || subject === "西班牙语") {
    return { ...foreignLanguageReference, subject };
  }
  return mainlandK12SubjectReferences.find((reference) => reference.subject === subject) || {
    subject,
    stages: ["primary", "middle", "high", "unknown"],
    ability_dimensions: ["材料理解", "知识调用", "过程表达", "证据使用", "迁移应用"],
    common_material_signals: ["题干", "学生作答", "批改痕迹", "评分点"],
    report_focus: ["依据现有证据分析，不推断未出现的长期能力。"]
  };
}

export function buildMainlandK12PromptReference() {
  return {
    source_titles: mainlandK12ReferenceSources.map((source) => source.title),
    stage_subjects: mainlandK12StageReferences.map((stage) => ({
      stage: stage.stage,
      curriculum_basis: stage.curriculum_basis,
      common_subjects: stage.common_subjects
    })),
    subject_dimensions: mainlandK12SubjectReferences.map((subject) => ({
      subject: subject.subject,
      stages: subject.stages,
      ability_dimensions: subject.ability_dimensions,
      report_focus: subject.report_focus
    })),
    policy_boundaries: [
      "材料分析必须依据学生作答、批改、订正或笔记证据。",
      "初中考试材料分析以课程标准为边界；疑似超纲、竞赛或高中内容必须标注风险或进入老师确认。",
      "报告表达关注证据、过程和发展，不做唯分数判断，不承诺提分。"
    ]
  };
}

export function buildMainlandK12RegionCurriculumCoverage(candidates: string[]): MainlandK12RegionCurriculumCoverage {
  const labels = splitRegionOrCurriculumCandidates(candidates);
  return {
    region_groups: uniqueSorted(labels.map((label) => regionCoverageGroupByLabel[label]).filter((item): item is MainlandK12RegionCoverageGroup => Boolean(item))),
    curriculum_version_families: uniqueSorted(
      labels.map((label) => curriculumVersionFamilyByLabel[label]).filter((item): item is MainlandK12CurriculumVersionFamily => Boolean(item))
    ),
    exam_scope_signals: uniqueSorted(labels.map((label) => examScopeSignalByLabel[label]).filter((item): item is string => Boolean(item)))
  };
}

export function getStageSubjectCompatibility(input: { stage: K12EducationStage; subject: K12Subject }) {
  if (input.stage === "unknown" || input.subject === "其他") {
    return { compatible: true, warning: "学段或科目未识别，需结合材料来源和老师确认。" };
  }
  const stageReference = getMainlandK12StageReference(input.stage);
  if (!stageReference) return { compatible: true, warning: "学段未识别，需老师确认。" };
  if (stageReference.common_subjects.includes(input.subject)) {
    return { compatible: true, warning: "" };
  }
  return {
    compatible: false,
    warning: `${formatStage(input.stage)}通常不以“${input.subject}”作为常规学科名呈现，需核对材料学段、教材版本或地区考试口径。`
  };
}

function splitRegionOrCurriculumCandidates(candidates: string[]) {
  return uniqueSorted(
    candidates
      .flatMap((candidate) => candidate.split("/"))
      .map((item) => item.trim())
      .filter((item) => item && item !== "未识别")
  );
}

function uniqueSorted<T extends string>(items: T[]) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function formatStage(stage: K12EducationStage) {
  if (stage === "primary") return "小学";
  if (stage === "middle") return "初中";
  if (stage === "high") return "高中";
  return "未知学段";
}
