import { getStageSubjectCompatibility } from "./mainland-k12-reference";
import type {
  K12EducationStage,
  K12MaterialClassification,
  K12MaterialType,
  K12Subject,
  VisionEvidence,
  VisionEvidencePacket
} from "./types";

type TextEvidence = {
  text: string;
  evidenceRef?: string;
  confidence: number;
};

type SignalRule<T extends string> = {
  value: T;
  weight: number;
  patterns: RegExp[];
};

type ScoredSignal<T extends string> = {
  value: T;
  score: number;
  evidenceRefs: string[];
};

export type ExplicitNonK12ScopeDetection = {
  outOfScope: boolean;
  reasons: string[];
  evidenceRefs: string[];
};

export type K12MaterialClassificationResult = {
  classification: K12MaterialClassification;
  signals: {
    material_type: ScoredSignal<K12MaterialType>;
    subject: ScoredSignal<K12Subject>;
    stage: ScoredSignal<K12EducationStage>;
    grade_candidate: string;
    region_or_curriculum_candidate: string;
  };
  warnings: string[];
};

const materialTypeRules: SignalRule<K12MaterialType>[] = [
  { value: "monthly_test", weight: 1.1, patterns: [/月考/, /月测/, /月度测验/, /月度检测/, /阶段月考/] },
  { value: "weekly_test", weight: 1.05, patterns: [/周测/, /周练/, /周清/, /周末测/, /每周小测/, /周考试题/] },
  {
    value: "unit_quiz",
    weight: 1,
    patterns: [/单元测试/, /单元测验/, /单元练习/, /单元过关/, /单元达标/, /章节测验/, /章节练习/, /阶段测验/, /阶段性检测/, /随堂测验/, /课堂小测/, /当堂检测/, /晨测/, /日清/, /堂清/, /课课清/]
  },
  { value: "wrong_question_book", weight: 1, patterns: [/错题本/, /错题整理/, /错题集/, /订正本/, /改错本/, /纠错本/] },
  { value: "wrong_question", weight: 0.9, patterns: [/错题/, /错题卡/, /错题重做/, /订正题/, /订正卡/, /纠错/, /错因/] },
  { value: "student_notes", weight: 0.9, patterns: [/课堂笔记/, /听课笔记/, /学生笔记/, /笔记整理/] },
  {
    value: "homework",
    weight: 0.85,
    patterns: [/家庭作业/, /课后作业/, /课堂作业/, /课时作业/, /周末作业/, /每日作业/, /假期作业/, /寒假作业/, /暑假作业/, /校本作业/, /作业本/, /作业/, /同步练习/, /配套练习/, /随堂练习/, /课时练/, /一课一练/, /练习册/, /练习题/]
  },
  { value: "practice_record", weight: 0.8, patterns: [/练习记录/, /训练记录/, /限时训练/, /每日一练/, /专项训练/, /专题训练/, /巩固训练/, /过关训练/, /达标训练/, /综合练习/, /口算/, /默写/, /听写/, /打卡/] },
  {
    value: "exam",
    weight: 0.8,
    patterns: [/试卷/, /试题卷/, /答题卡/, /诊断卷/, /学情诊断/, /考试/, /测试/, /质量检测/, /质量调研/, /素养测评/, /调研测试/, /调研考试/, /摸底考试/, /综合测试/, /期中/, /期末/, /期中检测/, /期末检测/, /期中复习卷/, /期末复习卷/, /复习卷/, /专题卷/, /训练卷/, /测评卷/, /过关卷/, /一模/, /二模/, /三模/, /模拟考/, /联考/, /中考/, /高考/, /学业水平/, /合格考/, /等级考/, /学考/, /适应性考试/]
  }
];

const subjectRules: SignalRule<K12Subject>[] = [
  { value: "语文", weight: 1, patterns: [/语文/, /作文/, /文言文/, /古诗文?/, /现代文/, /名著/, /语言运用/, /默写/] },
  { value: "数学", weight: 1, patterns: [/数学/, /几何/, /代数/, /函数/, /方程/, /不等式/, /应用题/, /统计/, /概率/, /导数/, /数列/, /向量/, /圆/, /三角形/] },
  { value: "英语", weight: 1, patterns: [/英语/, /\bEnglish\b/i, /完形填空/, /语法填空/, /七选五/, /读后续写/, /单词/, /听力/, /改错/, /翻译/, /词汇/] },
  { value: "日语", weight: 1, patterns: [/日语/, /日本语/] },
  { value: "俄语", weight: 1, patterns: [/俄语/] },
  { value: "德语", weight: 1, patterns: [/德语/] },
  { value: "法语", weight: 1, patterns: [/法语/] },
  { value: "西班牙语", weight: 1, patterns: [/西班牙语/] },
  { value: "物理", weight: 1, patterns: [/物理/, /力学/, /电路/, /电学/, /欧姆/, /浮力/, /光学/, /加速度/, /牛顿/, /机械能/] },
  { value: "化学", weight: 1, patterns: [/化学/, /化学方程式/, /溶液/, /酸碱/, /离子/, /化合价/, /元素/, /物质转化/] },
  { value: "生物学", weight: 1, patterns: [/生物学/, /生物/, /细胞/, /遗传/, /生态/, /光合作用/, /生命活动/] },
  { value: "历史", weight: 0.95, patterns: [/历史/, /史料/, /朝代/, /近代史/, /世界史/, /中国史/, /历史事件/] },
  { value: "地理", weight: 0.95, patterns: [/地理/, /地图/, /气候/, /经纬度/, /等值线/, /区域地理/, /人地关系/] },
  { value: "道德与法治", weight: 1, patterns: [/道德与法治/, /道法/, /品德与社会/, /品德与生活/, /公民道德/, /法治观念/, /宪法/] },
  { value: "思想政治", weight: 1, patterns: [/思想政治/, /政治/, /哲学/, /经济生活/, /政治生活/, /文化生活/, /生活与哲学/, /经济与社会/, /中国特色社会主义/, /政治与法治/] },
  { value: "科学", weight: 0.8, patterns: [/科学/, /科学探究/, /物质科学/, /生命科学/, /地球与宇宙/, /实验探究/, /观察记录/] },
  { value: "信息科技", weight: 0.9, patterns: [/信息科技/, /计算思维/, /数字化学习/] },
  { value: "信息技术", weight: 0.9, patterns: [/信息技术/, /算法/, /程序/, /数据结构/, /网络基础/] },
  { value: "通用技术", weight: 0.9, patterns: [/通用技术/, /技术设计/, /图样/, /结构设计/, /流程设计/] }
];

const stageRules: SignalRule<K12EducationStage>[] = [
  { value: "primary", weight: 0.9, patterns: [/小学/, /小一/, /小二/, /小三/, /小四/, /小五/, /小六/] },
  { value: "middle", weight: 0.95, patterns: [/初中/, /初一/, /初二/, /初三/, /七年级/, /八年级/, /九年级/, /小升初/, /中考/] },
  { value: "high", weight: 1, patterns: [/高中/, /高一/, /高二/, /高三/, /十年级/, /十一年级/, /十二年级/, /高考/, /新高考/, /必修/, /选择性必修/] }
];

const gradeRules: Array<{ value: string; stage: K12EducationStage; patterns: RegExp[] }> = [
  { value: "高一", stage: "high", patterns: [/高一/, /高中一年级/, /十年级/, /必修一/, /必修[1ⅠI一]/, /必修第一册/] },
  { value: "高二", stage: "high", patterns: [/高二/, /高中二年级/, /十一年级/, /选择性必修一/, /选择性必修[1ⅠI一]/] },
  { value: "高三", stage: "high", patterns: [/高三/, /高中三年级/, /十二年级/, /高考/] },
  { value: "小升初", stage: "middle", patterns: [/小升初/] },
  { value: "初一", stage: "middle", patterns: [/初一/, /初中一年级/, /七年级/, /七年级[上下]/, /七[上下]/, /7年级/] },
  { value: "初二", stage: "middle", patterns: [/初二/, /初中二年级/, /八年级/, /八年级[上下]/, /八[上下]/, /8年级/] },
  { value: "初三", stage: "middle", patterns: [/初三/, /初中三年级/, /九年级/, /九年级[上下]/, /九[上下]/, /9年级/] },
  { value: "小学一年级", stage: "primary", patterns: [/小学?一年级/, /一年级/, /小一/] },
  { value: "小学二年级", stage: "primary", patterns: [/小学?二年级/, /二年级/, /小二/] },
  { value: "小学三年级", stage: "primary", patterns: [/小学?三年级/, /三年级/, /小三/] },
  { value: "小学四年级", stage: "primary", patterns: [/小学?四年级/, /四年级/, /小四/] },
  { value: "小学五年级", stage: "primary", patterns: [/小学?五年级/, /五年级/, /小五/] },
  { value: "小学六年级", stage: "primary", patterns: [/小学?六年级/, /六年级/, /小六/] }
];

const regionOrCurriculumRules = [
  { label: "北京", patterns: [/北京卷/, /北京市?/, /海淀区/, /西城区/, /朝阳区/, /东城区/, /丰台区/] },
  { label: "天津", patterns: [/天津卷/, /天津市?/] },
  { label: "河北", patterns: [/河北卷/, /河北省?/, /石家庄市?/, /唐山市?/, /保定市?/, /衡水市?/, /邯郸市?/] },
  { label: "山西", patterns: [/山西卷/, /山西省?/, /太原市?/, /大同市?/, /运城市?/] },
  { label: "内蒙古", patterns: [/内蒙古卷/, /内蒙古自治区?/, /呼和浩特市?/, /包头市?/, /赤峰市?/] },
  { label: "辽宁", patterns: [/辽宁卷/, /辽宁省?/, /沈阳市?/, /大连市?/, /鞍山市?/] },
  { label: "吉林", patterns: [/吉林卷/, /吉林省?/, /长春市?/, /吉林市?/] },
  { label: "黑龙江", patterns: [/黑龙江卷/, /黑龙江省?/, /哈尔滨市?/, /齐齐哈尔市?/, /大庆市?/] },
  { label: "上海", patterns: [/上海卷/, /上海市?/, /浦东新区/] },
  { label: "江苏", patterns: [/江苏卷/, /苏州市?/, /南京市?/, /江苏省?/, /无锡市?/, /常州市?/, /南通市?/, /徐州市?/] },
  { label: "浙江", patterns: [/浙江卷/, /杭州市?/, /浙江省?/, /宁波市?/, /温州市?/, /绍兴市?/] },
  { label: "安徽", patterns: [/安徽卷/, /安徽省?/, /合肥市?/, /芜湖市?/] },
  { label: "福建", patterns: [/福建卷/, /福建省?/, /福州市?/, /厦门市?/, /泉州市?/, /漳州市?/] },
  { label: "江西", patterns: [/江西卷/, /江西省?/, /南昌市?/, /赣州市?/] },
  { label: "山东", patterns: [/山东卷/, /山东省?/, /济南市?/, /青岛市?/, /烟台市?/, /潍坊市?/] },
  { label: "河南", patterns: [/河南卷/, /河南省?/, /郑州市?/, /洛阳市?/] },
  { label: "湖北", patterns: [/湖北卷/, /湖北省?/, /武汉市?/, /襄阳市?/, /宜昌市?/] },
  { label: "湖南", patterns: [/湖南卷/, /湖南省?/, /长沙市?/, /株洲市?/, /岳阳市?/] },
  { label: "广东", patterns: [/广东卷/, /广州市?/, /深圳市?/, /广东省?/, /佛山市?/, /东莞市?/] },
  { label: "广西", patterns: [/广西卷/, /广西壮族自治区?/, /南宁市?/, /桂林市?/, /柳州市?/] },
  { label: "海南", patterns: [/海南卷/, /海南省?/, /海口市?/, /三亚市?/] },
  { label: "重庆", patterns: [/重庆卷/, /重庆市?/] },
  { label: "四川", patterns: [/四川卷/, /四川省?/, /成都市?/, /绵阳市?/, /南充市?/] },
  { label: "贵州", patterns: [/贵州卷/, /贵州省?/, /贵阳市?/, /遵义市?/] },
  { label: "云南", patterns: [/云南卷/, /云南省?/, /昆明市?/, /曲靖市?/] },
  { label: "西藏", patterns: [/西藏卷/, /西藏自治区?/, /拉萨市?/, /日喀则市?/] },
  { label: "陕西", patterns: [/陕西卷/, /陕西省?/, /西安市?/, /咸阳市?/] },
  { label: "甘肃", patterns: [/甘肃卷/, /甘肃省?/, /兰州市?/, /天水市?/] },
  { label: "青海", patterns: [/青海卷/, /青海省?/, /西宁市?/] },
  { label: "宁夏", patterns: [/宁夏卷/, /宁夏回族自治区?/, /银川市?/] },
  { label: "新疆", patterns: [/新疆卷/, /新疆维吾尔自治区?/, /乌鲁木齐市?/, /兵团/] },
  { label: "全国卷", patterns: [/全国卷/, /全国甲卷/, /全国乙卷/, /新课标卷/, /新课标[ⅠI一]卷/, /新课标[ⅡII二]卷/] },
  { label: "新高考", patterns: [/新高考/, /新高考[ⅠI一]卷/, /新高考[ⅡII二]卷/] },
  { label: "统编版", patterns: [/统编版/, /部编版/] },
  { label: "人教版", patterns: [/人教版/, /人民教育出版社/] },
  { label: "北师大版", patterns: [/北师大版/, /北京师范大学出版社/] },
  { label: "外研版", patterns: [/外研版/, /外语教学与研究出版社/] },
  { label: "译林版", patterns: [/译林版/, /牛津译林/] },
  { label: "仁爱版", patterns: [/仁爱版/, /仁爱英语/] },
  { label: "湘教版", patterns: [/湘教版/] },
  { label: "湘少版", patterns: [/湘少版/] },
  { label: "鄂教版", patterns: [/鄂教版/] },
  { label: "苏教版", patterns: [/苏教版/] },
  { label: "苏科版", patterns: [/苏科版/] },
  { label: "沪教版", patterns: [/沪教版/] },
  { label: "沪科版", patterns: [/沪科版/] },
  { label: "沪粤版", patterns: [/沪粤版/] },
  { label: "鲁教版", patterns: [/鲁教版/] },
  { label: "鲁科版", patterns: [/鲁科版/] },
  { label: "粤教版", patterns: [/粤教版/] },
  { label: "冀教版", patterns: [/冀教版/] },
  { label: "冀少版", patterns: [/冀少版/] },
  { label: "浙教版", patterns: [/浙教版/] },
  { label: "青岛版", patterns: [/青岛版/] },
  { label: "北京版", patterns: [/北京版/] },
  { label: "西师版", patterns: [/西师版/, /西南师大版/, /西南师范大学出版社/] },
  { label: "华师大版", patterns: [/华师大版/, /华东师大版/] },
  { label: "教科版", patterns: [/教科版/] },
  { label: "京改版", patterns: [/京改版/] },
  { label: "牛津上海版", patterns: [/牛津上海版/] }
];

const mainlandRegionLabels = new Set([
  "北京",
  "天津",
  "河北",
  "山西",
  "内蒙古",
  "辽宁",
  "吉林",
  "黑龙江",
  "上海",
  "江苏",
  "浙江",
  "安徽",
  "福建",
  "江西",
  "山东",
  "河南",
  "湖北",
  "湖南",
  "广东",
  "广西",
  "海南",
  "重庆",
  "四川",
  "贵州",
  "云南",
  "西藏",
  "陕西",
  "甘肃",
  "青海",
  "宁夏",
  "新疆"
]);

const curriculumVersionLabels = new Set([
  "统编版",
  "人教版",
  "北师大版",
  "外研版",
  "译林版",
  "仁爱版",
  "湘教版",
  "湘少版",
  "鄂教版",
  "苏教版",
  "苏科版",
  "沪教版",
  "沪科版",
  "沪粤版",
  "鲁教版",
  "鲁科版",
  "粤教版",
  "冀教版",
  "冀少版",
  "浙教版",
  "青岛版",
  "北京版",
  "西师版",
  "华师大版",
  "教科版",
  "京改版",
  "牛津上海版"
]);

const curriculumPublisherContextPatterns = [
  /北京师范大学出版社/g,
  /北师大版/g,
  /北京版/g,
  /青岛版/g,
  /牛津上海版/g,
  /牛津译林/g,
  /上海教育出版社/g,
  /上海科学技术出版社/g,
  /上海科技出版社/g,
  /江苏凤凰教育出版社/g,
  /江苏教育出版社/g,
  /浙江教育出版社/g,
  /山东教育出版社/g,
  /广东教育出版社/g,
  /河北教育出版社/g,
  /湖南教育出版社/g,
  /湖北教育出版社/g,
  /安徽教育出版社/g,
  /福建教育出版社/g,
  /四川教育出版社/g,
  /重庆出版社/g
];

const explicitNonK12ScopeRules = [
  { reason: "大学/高等教育材料", patterns: [/大学/, /高校/, /本科/, /专科/, /高等数学/, /线性代数/, /概率论与数理统计/] },
  { reason: "研究生或升学考试材料", patterns: [/研究生/, /硕士/, /博士/, /考研/, /考博/] },
  { reason: "成人教育或继续教育材料", patterns: [/成人高考/, /成考/, /自考/, /专升本/, /继续教育/] },
  { reason: "职业教育或职业资格材料", patterns: [/职业高中/, /中职/, /职高/, /技校/, /职业资格/, /执业资格/, /教师资格证/, /会计从业/, /CPA/] },
  { reason: "非 K12 外语考试材料", patterns: [/大学英语四级/, /大学英语六级/, /英语四级/, /英语六级/, /\bCET[- ]?[46]\b/i, /雅思/, /托福/, /\bIELTS\b/i, /\bTOEFL\b/i] },
  {
    reason: "非中国大陆 K12 地区或国际课程材料",
    patterns: [
      /香港中学文凭/,
      /香港中學文憑/,
      /\bHKDSE\b/i,
      /\bDSE\b/,
      /香港(小学|小學|中学|中學|高中|课程|課程|教材|试卷|試卷|考试|考試)/,
      /澳门(小学|小學|中学|中學|高中|课程|課程|教材|试卷|試卷|考试|考試)/,
      /澳門(小学|小學|中学|中學|高中|课程|課程|教材|试卷|試卷|考试|考試)/,
      /台湾(国小|國小|国中|國中|高中|学测|學測|会考|會考|指考|课程|課程|教材|试卷|試卷|考试|考試)/,
      /臺灣(国小|國小|国中|國中|高中|学测|學測|会考|會考|指考|课程|課程|教材|试卷|試卷|考试|考試)/,
      /IB课程/,
      /国际文凭/,
      /\bA[- ]?Level\b/i,
      /\bIGCSE\b/i,
      /\bAP\s*课程/i,
      /\bSAT\b/i
    ]
  }
];

export function classifyK12LearningMaterial(input: {
  packet: VisionEvidencePacket;
  fallbackEvidenceRefs?: string[];
}): K12MaterialClassificationResult {
  const texts = collectTextEvidence(input.packet);
  const fallbackEvidenceRefs = uniqueRefs([
    ...(input.fallbackEvidenceRefs ?? []),
    ...input.packet.evidences.map((evidence) => evidence.evidence_ref),
    ...input.packet.gates.flatMap((gate) => gate.evidenceRefs)
  ]);

  const materialType = scoreRules(materialTypeRules, texts, "other_student_material");
  const subject = scoreRules(subjectRules, texts, "其他");
  const grade = inferGradeCandidate(texts);
  const stageFromText = scoreRules(stageRules, texts, "unknown");
  const stage = grade.stage !== "unknown" ? { value: grade.stage, score: stageFromText.score + 1, evidenceRefs: uniqueRefs([...stageFromText.evidenceRefs, ...grade.evidenceRefs]) } : stageFromText;
  const regionOrCurriculum = inferRegionOrCurriculum(texts);
  const evidenceRefs = uniqueRefs([
    ...materialType.evidenceRefs,
    ...subject.evidenceRefs,
    ...stage.evidenceRefs,
    ...regionOrCurriculum.evidenceRefs,
    ...fallbackEvidenceRefs
  ]);
  const warnings = buildClassificationWarnings({
    packet: input.packet,
    materialType,
    subject,
    stage,
    gradeCandidate: grade.value,
    regionOrCurriculumCandidate: regionOrCurriculum.value,
    evidenceRefs
  });
  const confidence = computeClassificationConfidence({
    packet: input.packet,
    texts,
    materialType,
    subject,
    stage,
    gradeCandidate: grade.value,
    regionOrCurriculumCandidate: regionOrCurriculum.value,
    warningCount: warnings.length,
    evidenceRefs
  });

  return {
    classification: {
      material_type: materialType.value,
      subject: subject.value,
      education_stage: stage.value,
      grade_candidate: grade.value,
      region_or_curriculum_candidate: regionOrCurriculum.value,
      classification_confidence: confidence,
      evidenceRefs
    },
    signals: {
      material_type: materialType,
      subject,
      stage,
      grade_candidate: grade.value,
      region_or_curriculum_candidate: regionOrCurriculum.value
    },
    warnings
  };
}

function collectTextEvidence(packet: VisionEvidencePacket): TextEvidence[] {
  const evidenceTexts = packet.evidences.map((evidence) => ({
    text: normalizeText(evidence),
    evidenceRef: evidence.evidence_ref,
    confidence: evidence.confidence
  }));
  const metadataText = packet.metadata ? JSON.stringify(packet.metadata) : "";
  return [
    ...evidenceTexts,
    {
      text: metadataText,
      confidence: 0.7
    }
  ].filter((item) => item.text.trim());
}

function normalizeText(evidence: VisionEvidence) {
  return [evidence.normalized_text, evidence.text, evidence.raw_ocr_text].filter(Boolean).join(" ");
}

function scoreRules<T extends string>(rules: SignalRule<T>[], texts: TextEvidence[], fallbackValue: T): ScoredSignal<T> {
  const scores = new Map<T, { score: number; evidenceRefs: Set<string> }>();
  for (const rule of rules) {
    for (const text of texts) {
      if (rule.patterns.some((pattern) => pattern.test(text.text))) {
        const current = scores.get(rule.value) ?? { score: 0, evidenceRefs: new Set<string>() };
        current.score += rule.weight * Math.max(0.2, text.confidence);
        if (text.evidenceRef) current.evidenceRefs.add(text.evidenceRef);
        scores.set(rule.value, current);
      }
    }
  }

  let best: ScoredSignal<T> = { value: fallbackValue, score: 0, evidenceRefs: [] };
  for (const [value, signal] of scores) {
    if (signal.score > best.score) {
      best = { value, score: round(signal.score), evidenceRefs: [...signal.evidenceRefs] };
    }
  }
  return best;
}

function inferGradeCandidate(texts: TextEvidence[]) {
  for (const rule of gradeRules) {
    const evidenceRefs = new Set<string>();
    for (const text of texts) {
      if (rule.patterns.some((pattern) => pattern.test(text.text))) {
        if (text.evidenceRef) evidenceRefs.add(text.evidenceRef);
      }
    }
    if (evidenceRefs.size) {
      return { value: rule.value, stage: rule.stage, evidenceRefs: [...evidenceRefs] };
    }
  }
  return { value: "未识别", stage: "unknown" as K12EducationStage, evidenceRefs: [] };
}

function inferRegionOrCurriculum(texts: TextEvidence[]) {
  const labels: string[] = [];
  const evidenceRefs = new Set<string>();
  for (const rule of regionOrCurriculumRules) {
    for (const text of texts) {
      const textForRule = mainlandRegionLabels.has(rule.label) ? stripCurriculumPublisherContext(text.text) : text.text;
      if (rule.patterns.some((pattern) => pattern.test(textForRule))) {
        labels.push(rule.label);
        if (text.evidenceRef) evidenceRefs.add(text.evidenceRef);
      }
    }
  }
  return {
    value: labels.length ? [...new Set(labels)].join("/") : "未识别",
    evidenceRefs: [...evidenceRefs]
  };
}

function stripCurriculumPublisherContext(text: string) {
  return curriculumPublisherContextPatterns.reduce((current, pattern) => current.replace(pattern, ""), text);
}

function buildClassificationWarnings(input: {
  packet: VisionEvidencePacket;
  materialType: ScoredSignal<K12MaterialType>;
  subject: ScoredSignal<K12Subject>;
  stage: ScoredSignal<K12EducationStage>;
  gradeCandidate: string;
  regionOrCurriculumCandidate: string;
  evidenceRefs: string[];
}) {
  const warnings: string[] = [];
  const nonK12Scope = detectExplicitNonK12Scope(input.packet);
  if (nonK12Scope.outOfScope) warnings.push(`材料出现非 K12 范围线索或非中国大陆 K12 范围线索：${nonK12Scope.reasons.join("、")}，不能直接生成学生学情分析。`);
  if (!input.evidenceRefs.length) warnings.push("未找到可追溯的分类证据。");
  if (input.materialType.value === "other_student_material") warnings.push("材料类型未能从题面或元数据中稳定识别。");
  if (input.subject.value === "其他") warnings.push("科目未能从题面或元数据中稳定识别。");
  if (input.stage.value === "unknown" && input.gradeCandidate === "未识别") warnings.push("学段和年级未能稳定识别，需老师确认。");
  if (input.packet.material_state !== "valid_student_material") warnings.push("材料状态不是可直接完整分析的学生材料，分类结果只能用于复核和路由。");
  const compatibility = getStageSubjectCompatibility({ stage: input.stage.value, subject: input.subject.value });
  if (!compatibility.compatible && compatibility.warning) warnings.push(compatibility.warning);
  warnings.push(...buildRegionOrCurriculumWarnings(input.regionOrCurriculumCandidate));
  return warnings;
}

function buildRegionOrCurriculumWarnings(candidate: string) {
  if (candidate === "未识别") return [];
  const labels = candidate.split("/").filter(Boolean);
  const regions = labels.filter((label) => mainlandRegionLabels.has(label));
  const curriculumVersions = labels.filter((label) => curriculumVersionLabels.has(label));
  const warnings: string[] = [];
  if (regions.length > 1) {
    warnings.push(`地区线索命中多个地区：${regions.join("/")}，需老师复核材料来源或试卷归属。`);
  }
  if (curriculumVersions.length > 1) {
    warnings.push(`教材版本线索命中多个版本：${curriculumVersions.join("/")}，需老师确认实际使用教材。`);
  }
  return warnings;
}

function computeClassificationConfidence(input: {
  packet: VisionEvidencePacket;
  texts: TextEvidence[];
  materialType: ScoredSignal<K12MaterialType>;
  subject: ScoredSignal<K12Subject>;
  stage: ScoredSignal<K12EducationStage>;
  gradeCandidate: string;
  regionOrCurriculumCandidate: string;
  warningCount: number;
  evidenceRefs: string[];
}) {
  if (!input.evidenceRefs.length) return 0.2;

  const evidenceQuality = input.texts.length ? input.texts.reduce((sum, item) => sum + item.confidence, 0) / input.texts.length : 0.4;
  let confidence = 0.24;
  if (input.materialType.score > 0) confidence += 0.2;
  if (input.subject.score > 0) confidence += 0.25;
  if (input.stage.value !== "unknown") confidence += 0.14;
  if (input.gradeCandidate !== "未识别") confidence += 0.08;
  if (input.regionOrCurriculumCandidate !== "未识别") confidence += 0.04;
  confidence += Math.min(0.1, evidenceQuality * 0.1);
  confidence -= Math.min(0.16, input.warningCount * 0.04);
  if (hasRegionOrCurriculumConflict(input.regionOrCurriculumCandidate)) confidence -= 0.12;

  const scopeCap = detectExplicitNonK12Scope(input.packet).outOfScope ? 0.62 : 0.95;
  const stateCap = input.packet.material_state === "valid_student_material" ? scopeCap : Math.min(0.82, scopeCap);
  return round(Math.max(0.2, Math.min(stateCap, confidence)));
}

export function detectExplicitNonK12Scope(packet: VisionEvidencePacket): ExplicitNonK12ScopeDetection {
  const texts = collectTextEvidence(packet);
  const reasons = new Set<string>();
  const evidenceRefs = new Set<string>();

  for (const rule of explicitNonK12ScopeRules) {
    for (const text of texts) {
      if (rule.patterns.some((pattern) => pattern.test(text.text))) {
        reasons.add(rule.reason);
        if (text.evidenceRef) evidenceRefs.add(text.evidenceRef);
      }
    }
  }

  return {
    outOfScope: reasons.size > 0,
    reasons: [...reasons],
    evidenceRefs: [...evidenceRefs]
  };
}

function hasRegionOrCurriculumConflict(candidate: string) {
  if (candidate === "未识别") return false;
  const labels = candidate.split("/").filter(Boolean);
  const regionCount = labels.filter((label) => mainlandRegionLabels.has(label)).length;
  const curriculumCount = labels.filter((label) => curriculumVersionLabels.has(label)).length;
  return regionCount > 1 || curriculumCount > 1;
}

function uniqueRefs(refs: string[]) {
  return [...new Set(refs.filter(Boolean))];
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
