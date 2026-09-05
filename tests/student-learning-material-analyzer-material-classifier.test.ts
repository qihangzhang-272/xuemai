import { describe, expect, it } from "vitest";
import { classifyK12LearningMaterial } from "../src/skills/student-learning-material-analyzer/material-classifier";
import { buildLearningMaterialAnalysisPrompt } from "../src/skills/student-learning-material-analyzer/prompt";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import type { VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

const studentId = "00000000-0000-0000-0000-000000000301";

describe("K12 learning material classifier", () => {
  it("classifies mainland K12 material type, subject, stage, grade, and curriculum signals from evidence", () => {
    const packet = packetWithEvidenceText("广东省深圳市初二数学月考 试卷 人教版 一次函数应用题，学生作答后老师批改。");

    const result = classifyK12LearningMaterial({ packet });

    expect(result.classification).toEqual(
      expect.objectContaining({
        material_type: "monthly_test",
        subject: "数学",
        education_stage: "middle",
        grade_candidate: "初二"
      })
    );
    expect(result.classification.region_or_curriculum_candidate).toContain("广东");
    expect(result.classification.region_or_curriculum_candidate).toContain("人教版");
    expect(result.classification.classification_confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.classification.evidenceRefs.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
  });

  it("does not misread 十二年级 as 小学二年级", () => {
    const packet = packetWithEvidenceText("高中十二年级英语高考模拟试卷 新高考 完形填空与阅读理解。");

    const result = classifyK12LearningMaterial({ packet });

    expect(result.classification).toEqual(
      expect.objectContaining({
        material_type: "exam",
        subject: "英语",
        education_stage: "high",
        grade_candidate: "高三"
      })
    );
  });

  it("does not misread formal middle-school grade wording as primary school", () => {
    const packet = packetWithEvidenceText("初中一年级数学期中试卷 人教版 有理数与整式，学生作答后老师批改。");

    const result = classifyK12LearningMaterial({ packet });

    expect(result.classification).toEqual(
      expect.objectContaining({
        material_type: "exam",
        subject: "数学",
        education_stage: "middle",
        grade_candidate: "初一"
      })
    );
    expect(result.classification.grade_candidate).not.toBe("小学一年级");
  });

  it("recognizes broader mainland region, exam-volume, and curriculum signals without guessing", () => {
    const cases = [
      {
        text: "北京市海淀区小学五年级英语单元练习 北师大版 学生完成后老师批改。",
        expected: ["北京", "北师大版"]
      },
      {
        text: "上海市浦东新区高一物理等级考练习 沪科版 电路题，学生作答有批注。",
        expected: ["上海", "沪科版"]
      },
      {
        text: "成都市高三化学新课标Ⅱ卷适应性考试 人教版 化学方程式与实验探究。",
        expected: ["四川", "全国卷", "人教版"]
      },
      {
        text: "武汉市初三道德与法治中考模拟 统编版 情境材料分析题，学生已订正。",
        expected: ["湖北", "统编版"]
      },
      {
        text: "乌鲁木齐市初二数学周测 北师大版 一次函数错题订正。",
        expected: ["新疆", "北师大版"]
      },
      {
        text: "宁波市高二数学选考模拟 浙教版 函数与导数专题，学生作答后老师批注。",
        expected: ["浙江", "浙教版"]
      },
      {
        text: "衡水市初三物理一模 冀教版 电学实验题，学生答案旁有批改痕迹。",
        expected: ["河北", "冀教版"]
      },
      {
        text: "佛山市小学六年级语文期末练习 统编版 阅读理解，学生已订正。",
        expected: ["广东", "统编版"]
      }
    ];

    for (const item of cases) {
      const result = classifyK12LearningMaterial({ packet: packetWithEvidenceText(item.text) });
      for (const expected of item.expected) {
        expect(result.classification.region_or_curriculum_candidate, item.text).toContain(expected);
      }
      expect(result.classification.region_or_curriculum_candidate, item.text).not.toBe("未识别");
      expect(result.classification.evidenceRefs.length).toBeGreaterThan(0);
    }
  });

  it("routes conflicting region or curriculum signals to teacher review instead of pretending one source is certain", () => {
    const packet = packetWithEvidenceText("北京市海淀区与江苏省南京市联合初二数学试卷 人教版 北师大版，学生作答后老师批改。");

    const result = classifyK12LearningMaterial({ packet });

    expect(result.classification.region_or_curriculum_candidate).toContain("北京");
    expect(result.classification.region_or_curriculum_candidate).toContain("江苏");
    expect(result.classification.region_or_curriculum_candidate).toContain("人教版");
    expect(result.classification.region_or_curriculum_candidate).toContain("北师大版");
    expect(result.warnings.join(" ")).toContain("地区线索命中多个地区");
    expect(result.warnings.join(" ")).toContain("教材版本线索命中多个版本");
    expect(result.classification.classification_confidence).toBeLessThan(0.9);
  });

  it("does not treat textbook publisher names as regional exam evidence", () => {
    const cases = [
      {
        text: "初二数学同步练习 北京师范大学出版社 函数专题，学生作答后老师批改。",
        expectedCurriculum: "北师大版",
        forbiddenRegion: "北京"
      },
      {
        text: "高一英语阅读理解 牛津上海版 课后作业，学生已完成并订正。",
        expectedCurriculum: "牛津上海版",
        forbiddenRegion: "上海"
      },
      {
        text: "小学五年级语文练习 江苏凤凰教育出版社 单元作业，学生作答后老师批注。",
        expectedCurriculum: "未识别",
        forbiddenRegion: "江苏"
      }
    ];

    for (const item of cases) {
      const result = classifyK12LearningMaterial({ packet: packetWithEvidenceText(item.text) });
      const labels = result.classification.region_or_curriculum_candidate.split("/");
      if (item.expectedCurriculum === "未识别") {
        expect(result.classification.region_or_curriculum_candidate, item.text).toBe("未识别");
      } else {
        expect(result.classification.region_or_curriculum_candidate, item.text).toContain(item.expectedCurriculum);
      }
      expect(labels, item.text).not.toContain(item.forbiddenRegion);
      expect(result.warnings.join(" "), item.text).not.toContain("地区线索命中多个地区");
    }
  });

  it("keeps explicit regional evidence when it appears outside textbook publisher context", () => {
    const packet = packetWithEvidenceText("北京市海淀区初二数学同步练习 北京师范大学出版社 函数专题，学生作答后老师批改。");

    const result = classifyK12LearningMaterial({ packet });

    expect(result.classification.region_or_curriculum_candidate).toContain("北京");
    expect(result.classification.region_or_curriculum_candidate).toContain("北师大版");
  });

  it("recognizes common mainland homework, practice, diagnostic paper, and local textbook wording", () => {
    const cases = [
      {
        text: "初二数学课时作业本 一课一练 北师大版 一次函数，学生作答后老师批改。",
        expected: {
          material_type: "homework",
          subject: "数学",
          education_stage: "middle",
          grade_candidate: "初二",
          curriculum: "北师大版"
        }
      },
      {
        text: "高三英语限时训练 七选五与读后续写 新高考Ⅰ卷，学生答案旁有老师批注。",
        expected: {
          material_type: "exam",
          subject: "英语",
          education_stage: "high",
          grade_candidate: "高三",
          curriculum: "新高考"
        }
      },
      {
        text: "高二英语限时训练 七选五与读后续写 外研版，学生答案旁有老师批注。",
        expected: {
          material_type: "practice_record",
          subject: "英语",
          education_stage: "high",
          grade_candidate: "高二",
          curriculum: "外研版"
        }
      },
      {
        text: "小升初语文诊断卷 统编版 阅读与作文，学生已完成并有订正痕迹。",
        expected: {
          material_type: "exam",
          subject: "语文",
          education_stage: "middle",
          grade_candidate: "小升初",
          curriculum: "统编版"
        }
      },
      {
        text: "初三物理质量检测 鲁科版 电路实验题，学生答案旁有批改痕迹。",
        expected: {
          material_type: "exam",
          subject: "物理",
          education_stage: "middle",
          grade_candidate: "初三",
          curriculum: "鲁科版"
        }
      }
    ] as const;

    for (const item of cases) {
      const result = classifyK12LearningMaterial({ packet: packetWithEvidenceText(item.text) });
      expect(result.classification, item.text).toEqual(
        expect.objectContaining({
          material_type: item.expected.material_type,
          subject: item.expected.subject,
          education_stage: item.expected.education_stage,
          grade_candidate: item.expected.grade_candidate
        })
      );
      expect(result.classification.region_or_curriculum_candidate, item.text).toContain(item.expected.curriculum);
      expect(result.classification.classification_confidence, item.text).toBeGreaterThanOrEqual(0.78);
    }
  });

  it("recognizes common tutoring material aliases used in real homework and short-cycle quizzes", () => {
    const cases = [
      {
        text: "小学三年级数学寒假作业 人教版 口算与应用题，学生完成后老师批改。",
        expected: {
          material_type: "homework",
          subject: "数学",
          education_stage: "primary",
          grade_candidate: "小学三年级",
          curriculum: "人教版"
        }
      },
      {
        text: "初一英语周末作业 外研版 完形填空，学生订正后老师批注。",
        expected: {
          material_type: "homework",
          subject: "英语",
          education_stage: "middle",
          grade_candidate: "初一",
          curriculum: "外研版"
        }
      },
      {
        text: "初二数学校本作业 北师大版 一次函数，学生作答后老师批改。",
        expected: {
          material_type: "homework",
          subject: "数学",
          education_stage: "middle",
          grade_candidate: "初二",
          curriculum: "北师大版"
        }
      },
      {
        text: "初三物理晨测 沪科版 电路实验，学生答案旁有老师批改。",
        expected: {
          material_type: "unit_quiz",
          subject: "物理",
          education_stage: "middle",
          grade_candidate: "初三",
          curriculum: "沪科版"
        }
      },
      {
        text: "小学六年级语文堂清练习 统编版 阅读理解，学生已订正。",
        expected: {
          material_type: "unit_quiz",
          subject: "语文",
          education_stage: "primary",
          grade_candidate: "小学六年级",
          curriculum: "统编版"
        }
      },
      {
        text: "高二化学期中复习卷 鲁科版 化学反应原理，学生作答后老师批改。",
        expected: {
          material_type: "exam",
          subject: "化学",
          education_stage: "high",
          grade_candidate: "高二",
          curriculum: "鲁科版"
        }
      }
    ] as const;

    for (const item of cases) {
      const result = classifyK12LearningMaterial({ packet: packetWithEvidenceText(item.text) });
      expect(result.classification, item.text).toEqual(
        expect.objectContaining({
          material_type: item.expected.material_type,
          subject: item.expected.subject,
          education_stage: item.expected.education_stage,
          grade_candidate: item.expected.grade_candidate
        })
      );
      expect(result.classification.region_or_curriculum_candidate, item.text).toContain(item.expected.curriculum);
      expect(result.classification.classification_confidence, item.text).toBeGreaterThanOrEqual(0.78);
    }
  });

  it("keeps local textbook version names from becoming false regional evidence", () => {
    const cases = [
      {
        text: "小学四年级科学随堂练习 青岛版 物质科学观察记录，学生作答后老师批改。",
        expectedCurriculum: "青岛版",
        forbiddenRegion: "山东"
      },
      {
        text: "小学三年级品德与社会课堂作业 北京版 公民道德情境题，学生已完成。",
        expectedCurriculum: "北京版",
        forbiddenRegion: "北京"
      }
    ];

    for (const item of cases) {
      const result = classifyK12LearningMaterial({ packet: packetWithEvidenceText(item.text) });
      const labels = result.classification.region_or_curriculum_candidate.split("/");
      expect(result.classification.region_or_curriculum_candidate, item.text).toContain(item.expectedCurriculum);
      expect(labels, item.text).not.toContain(item.forbiddenRegion);
      expect(result.warnings.join(" "), item.text).not.toContain("地区线索命中多个地区");
    }
  });

  it("keeps unsupported blank templates as classification-only material without pretending analysis is safe", () => {
    const packet = packetWithEvidenceText("七年级语文阅读理解空白试卷模板。", "blank_question_template");

    const result = classifyK12LearningMaterial({ packet });

    expect(result.classification).toEqual(
      expect.objectContaining({
        material_type: "exam",
        subject: "语文",
        education_stage: "middle"
      })
    );
    expect(result.classification.classification_confidence).toBeLessThanOrEqual(0.82);
    expect(result.warnings.join(" ")).toContain("材料状态不是可直接完整分析的学生材料");
  });

  it("flags stage-subject mismatch for teacher review", () => {
    const packet = packetWithEvidenceText("小学五年级物理作业：浮力与受力分析。");

    const result = classifyK12LearningMaterial({ packet });

    expect(result.classification).toEqual(
      expect.objectContaining({
        material_type: "homework",
        subject: "物理",
        education_stage: "primary",
        grade_candidate: "小学五年级"
      })
    );
    expect(result.warnings.join(" ")).toContain("需核对材料学段");
  });

  it("flags explicit non-K12 education materials before they can be treated as student learning evidence", () => {
    const packet = packetWithEvidenceText("大学高等数学期末试卷 学生作答后老师批改，内容为线性代数与极限计算。");

    const result = classifyK12LearningMaterial({ packet });

    expect(result.classification.material_type).toBe("exam");
    expect(result.classification.subject).toBe("数学");
    expect(result.warnings.join(" ")).toContain("非 K12 范围线索");
    expect(result.warnings.join(" ")).toContain("大学/高等教育材料");
    expect(result.classification.classification_confidence).toBeLessThanOrEqual(0.62);
  });

  it("flags adult, vocational, and non-K12 external exam materials as out of scope", () => {
    const cases = [
      "专升本英语模拟试卷 完形填空和翻译题。",
      "中职机械制图期末考试 职业教育课程材料。",
      "大学英语四级 CET-4 阅读理解练习。"
    ];

    for (const text of cases) {
      const result = classifyK12LearningMaterial({ packet: packetWithEvidenceText(text) });
      expect(result.warnings.join(" "), text).toContain("非 K12 范围线索");
      expect(result.classification.classification_confidence, text).toBeLessThanOrEqual(0.62);
    }
  });

  it("flags non-mainland K12 and international curriculum materials as outside mainland K12 scope", () => {
    const cases = [
      "香港中学文凭 DSE 数学试卷 学生作答后老师批改。",
      "臺灣高中學測英文閱讀測驗 學生作答後訂正。",
      "IB课程 数学 AA HL 章节测验，学生作答后老师批注。",
      "AP课程 物理力学单元测试，学生答案旁有批改痕迹。"
    ];

    for (const text of cases) {
      const result = classifyK12LearningMaterial({ packet: packetWithEvidenceText(text) });
      expect(result.warnings.join(" "), text).toContain("非中国大陆 K12");
      expect(result.warnings.join(" "), text).toContain("非中国大陆 K12 地区或国际课程材料");
      expect(result.classification.classification_confidence, text).toBeLessThanOrEqual(0.62);
    }
  });

  it("passes deterministic classification into the model prompt as a contract hint", () => {
    const packet = packetWithEvidenceText("江苏初二数学周测 试卷 一次函数。");

    const prompt = buildLearningMaterialAnalysisPrompt({ packet });

    expect(prompt).toContain("deterministicMaterialClassification");
    expect(prompt).toContain("\"material_type\":\"weekly_test\"");
    expect(prompt).toContain("\"subject\":\"数学\"");
    expect(prompt).toContain("\"education_stage\":\"middle\"");
  });
});

function packetWithEvidenceText(text: string, fixtureId: Parameters<typeof getMockVisionEvidencePacket>[0] = "clear_exam_with_teacher_correction"): VisionEvidencePacket {
  const packet = JSON.parse(
    JSON.stringify(
      getMockVisionEvidencePacket(fixtureId, {
        materialId: `mat_classifier_${fixtureId}`,
        studentId
      })
    )
  ) as VisionEvidencePacket;

  packet.evidences[0] = {
    ...packet.evidences[0],
    evidence_id: "ev_classifier_meta_001",
    evidence_ref: `material.${packet.material_id}.page_p01.question_q001.ev_classifier_meta_001`,
    evidence_type: "material_metadata",
    text,
    raw_ocr_text: text,
    normalized_text: text
  };

  return packet;
}
