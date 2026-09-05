import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createStudentLearningMaterialDeliveryBundle } from "../src/skills/student-learning-material-analyzer/delivery-bundle";
import {
  createStudentLearningMaterialTeacherReviewPacket,
  validateStudentLearningMaterialTeacherReviewPacket
} from "../src/skills/student-learning-material-analyzer/teacher-review-packet";
import {
  generateStudentLearningMaterialTeacherReviewPacketFile,
  readStudentLearningMaterialTeacherReviewPacketFile
} from "../src/skills/student-learning-material-analyzer/teacher-review-packet-files";
import { createStudentLearningMaterialUserFacingResult } from "../src/skills/student-learning-material-analyzer/user-facing-result";
import type { StudentLearningMaterialAnalysis } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material teacher review packet", () => {
  it("wraps the delivery bundle as a teacher-reviewable SkillCard packet", () => {
    const result = createStudentLearningMaterialUserFacingResult(readSyntheticAnalysis());
    const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-20T20:00:00.000Z"
    });

    const packet = createStudentLearningMaterialTeacherReviewPacket({
      deliveryBundle,
      skillRunId: "skill-run-review-001",
      generatedAt: "2026-06-20T20:05:00.000Z"
    });

    expect(packet.schema_version).toBe("student_learning_material_teacher_review_packet.v0.1");
    expect(packet.skill_card).toEqual(
      expect.objectContaining({
        skill_name: "学生学习材料分析",
        skill_run_id: "skill-run-review-001",
        detail_page: "分析详情页"
      })
    );
    expect(packet.review_policy).toEqual(
      expect.objectContaining({
        ai_outputs_are_draft: true,
        auto_send_wechat: false,
        auto_archive: false,
        requires_teacher_confirmation_before_archive: true
      })
    );
    expect(packet.teacher_review_summary.material_classification).toEqual(deliveryBundle.teacher_delivery.material_classification);
    expect(JSON.stringify(packet.teacher_review_summary.material_classification)).not.toContain("evidenceRefs");
    expect(packet.teacher_review_summary.review_required_question_count).toBeGreaterThan(0);
    expect(packet.teacher_review_summary.monthly_comparison_status).toBe("has_previous_month_comparison");
    expect(packet.teacher_review_summary.monthly_comparison_previous_month_source_count).toBeGreaterThan(0);
    expect(packet.review_actions.find((action) => action.action_id === "confirm_archive")).toEqual(
      expect.objectContaining({
        enabled: false,
        requires_teacher_confirmation: true,
        writes_long_term_profile: true
      })
    );
    expect(packet.review_actions.find((action) => action.action_id === "request_more_evidence")?.enabled).toBe(true);
    expect(packet.teacher_visible_payload.teacher_report_markdown).toContain("## 证据充分性判定");
    expect(packet.teacher_visible_payload.teacher_report_markdown).not.toContain("evidenceRefs");
    expect(packet.teacher_visible_payload.teacher_report_markdown).not.toContain("VisionEvidencePacket");
    expect(JSON.stringify(packet.teacher_visible_payload)).not.toContain("internal_evidence_ref");
    expect(packet.internal_audit.source_map_expose_to_user).toBe(false);

    const validation = validateStudentLearningMaterialTeacherReviewPacket(packet, deliveryBundle);
    expect(validation.ok, validation.errors.join("；")).toBe(true);
  });

  it("enables copy, feedback sent, and archive actions only after review blockers are cleared", () => {
    const analysis = readSyntheticAnalysis();
    analysis.question_analyses[1].correctnessJudgement.status = "correct";
    analysis.teacher_review_required = false;
    analysis.risk_flags = [];
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-20T20:10:00.000Z"
    });

    const packet = createStudentLearningMaterialTeacherReviewPacket({
      deliveryBundle,
      skillRunId: "skill-run-review-002"
    });

    expect(packet.teacher_review_summary.review_required_question_count).toBe(0);
    expect(packet.review_actions.find((action) => action.action_id === "copy_parent_feedback")).toEqual(
      expect.objectContaining({ enabled: true, requires_teacher_confirmation: true, writes_long_term_profile: false })
    );
    expect(packet.review_actions.find((action) => action.action_id === "mark_feedback_sent")).toEqual(
      expect.objectContaining({ enabled: true, changes_feedback_status: "feedback_sent" })
    );
    expect(packet.review_actions.find((action) => action.action_id === "confirm_archive")).toEqual(
      expect.objectContaining({ enabled: true, changes_archive_status: "archived", writes_long_term_profile: true })
    );
    expect(packet.review_actions.find((action) => action.action_id === "request_more_evidence")?.enabled).toBe(false);
  });

  it("rejects packets that drop the evidence sufficiency section from the visible teacher report", () => {
    const result = createStudentLearningMaterialUserFacingResult(readSyntheticAnalysis());
    const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-20T20:12:00.000Z"
    });
    const packet = createStudentLearningMaterialTeacherReviewPacket({ deliveryBundle });
    packet.teacher_visible_payload.teacher_report_markdown = packet.teacher_visible_payload.teacher_report_markdown.replace(
      "## 证据充分性判定",
      "## 证据说明"
    );

    const validation = validateStudentLearningMaterialTeacherReviewPacket(packet);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_visible_payload.teacher_report_markdown missing ## 证据充分性判定");
  });

  it("rejects packets that expose internal evidence refs or weaken teacher confirmation boundaries", () => {
    const result = createStudentLearningMaterialUserFacingResult(readSyntheticAnalysis());
    const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-20T20:15:00.000Z"
    });
    const packet = createStudentLearningMaterialTeacherReviewPacket({ deliveryBundle });
    packet.review_policy.auto_archive = true as false;
    packet.review_policy.auto_send_wechat = true as false;
    packet.teacher_visible_payload.teacher_report_markdown += "\nVisionEvidencePacket evidenceRefs internal_evidence_ref";
    packet.review_actions.find((action) => action.action_id === "confirm_archive")!.requires_teacher_confirmation = false;

    const validation = validateStudentLearningMaterialTeacherReviewPacket(packet, deliveryBundle);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("review_policy.auto_archive must be false");
    expect(validation.errors.join(" ")).toContain("review_policy.auto_send_wechat must be false");
    expect(validation.errors.join(" ")).toContain("teacher_visible_payload must not expose evidenceRefs");
    expect(validation.errors.join(" ")).toContain("teacher_visible_payload must not expose VisionEvidencePacket");
    expect(validation.errors.join(" ")).toContain("teacher_visible_payload must not expose internal_evidence_ref");
    expect(validation.errors.join(" ")).toContain("confirm_archive must require teacher confirmation");
  });

  it("rejects packets that tamper with delivery-derived review summary, actions, or audit source map", () => {
    const result = createStudentLearningMaterialUserFacingResult(readSyntheticAnalysis());
    const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-20T20:16:00.000Z"
    });
    const packet = createStudentLearningMaterialTeacherReviewPacket({ deliveryBundle });
    packet.teacher_review_summary.review_required_question_count = 0;
    packet.teacher_review_summary.source_label_count = 1;
    packet.teacher_review_summary.monthly_comparison_status = "missing_previous_month_evidence";
    packet.teacher_review_summary.monthly_comparison_previous_month_source_count = 0;
    packet.review_actions.find((action) => action.action_id === "copy_parent_feedback")!.enabled = true;
    packet.review_actions.find((action) => action.action_id === "mark_feedback_sent")!.enabled = true;
    packet.review_actions.find((action) => action.action_id === "confirm_archive")!.enabled = true;
    packet.review_actions.find((action) => action.action_id === "request_more_evidence")!.enabled = false;
    packet.internal_audit.source_map[0].source_id = "S999";

    const validation = validateStudentLearningMaterialTeacherReviewPacket(packet, deliveryBundle);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_review_summary.review_required_question_count must match delivery bundle review blockers");
    expect(validation.errors.join(" ")).toContain("teacher_review_summary.source_label_count must match delivery bundle source labels");
    expect(validation.errors.join(" ")).toContain("teacher_review_summary.monthly_comparison_status must match delivery bundle");
    expect(validation.errors.join(" ")).toContain(
      "teacher_review_summary.monthly_comparison_previous_month_source_count must match delivery bundle monthly comparison evidence"
    );
    expect(validation.errors.join(" ")).toContain("review_actions.copy_parent_feedback.enabled must match delivery bundle review blockers");
    expect(validation.errors.join(" ")).toContain("review_actions.mark_feedback_sent.enabled must match delivery bundle review blockers");
    expect(validation.errors.join(" ")).toContain("review_actions.confirm_archive.enabled must match delivery bundle review blockers");
    expect(validation.errors.join(" ")).toContain("review_actions.request_more_evidence.enabled must match delivery bundle review blockers");
    expect(validation.errors.join(" ")).toContain("internal_audit.source_map[0].source_id must match delivery bundle");
  });

  it("writes a teacher review packet file from a delivery bundle artifact", async () => {
    const envDeliveryInputPath = process.env.XUEMAI_DELIVERY_BUNDLE_INPUT;
    const envResultInputPath = process.env.XUEMAI_RESULT_INPUT;
    const envAnalysisInputPath = process.env.XUEMAI_ANALYSIS_INPUT;
    const envVisionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const envDeliveryOutputPath = process.env.XUEMAI_DELIVERY_BUNDLE_OUTPUT;
    const envOutputPath = process.env.XUEMAI_TEACHER_REVIEW_PACKET_OUTPUT;
    const hasGeneratedBundleSource = Boolean(envResultInputPath || envAnalysisInputPath || envVisionPacketPath);

    if (envDeliveryInputPath || hasGeneratedBundleSource || envDeliveryOutputPath || envOutputPath) {
      if (!envOutputPath || (!envDeliveryInputPath && (!envDeliveryOutputPath || !hasGeneratedBundleSource))) {
        throw new Error(
          "Set XUEMAI_TEACHER_REVIEW_PACKET_OUTPUT=/absolute/path/to/teacher-review-packet.json with either XUEMAI_DELIVERY_BUNDLE_INPUT, or XUEMAI_DELIVERY_BUNDLE_OUTPUT plus one of XUEMAI_RESULT_INPUT, XUEMAI_ANALYSIS_INPUT, or XUEMAI_VISION_PACKET"
        );
      }
      const result = await generateStudentLearningMaterialTeacherReviewPacketFile({
        deliveryBundleInputPath: envDeliveryInputPath,
        deliveryBundleOutputPath: envDeliveryOutputPath,
        resultInputPath: envResultInputPath,
        analysisInputPath: envAnalysisInputPath,
        visionPacketPath: envVisionPacketPath,
        resultOutputPath: process.env.XUEMAI_RESULT_OUTPUT,
        analysisOutputPath: process.env.XUEMAI_ANALYSIS_OUTPUT,
        monthlyReportInputPath: process.env.XUEMAI_MONTHLY_REPORT_INPUT,
        answerKeysPath: process.env.XUEMAI_ANSWER_KEYS,
        rubricsPath: process.env.XUEMAI_RUBRICS,
        knowledgePointsPath: process.env.XUEMAI_KNOWLEDGE_POINTS,
        studentProfileHistoryPath: process.env.XUEMAI_STUDENT_PROFILE_HISTORY,
        teacherReviewPacketOutputPath: envOutputPath,
        skillRunId: process.env.XUEMAI_TEACHER_REVIEW_SKILL_RUN_ID,
        generatedAt: process.env.XUEMAI_TEACHER_REVIEW_GENERATED_AT,
        allowDegraded: process.env.XUEMAI_RESULT_ALLOW_DEGRADED === "1",
        allowInvalidAnalysis: process.env.XUEMAI_RESULT_ALLOW_INVALID === "1",
        feedbackSent: process.env.XUEMAI_DELIVERY_FEEDBACK_SENT === "1",
        archived: process.env.XUEMAI_DELIVERY_ARCHIVED === "1"
      });
      console.log(formatFileResult(result));
      expect(result.teacherReviewPacketOutputPath).toBe(envOutputPath);
      return;
    }

    if (process.env.XUEMAI_TEACHER_REVIEW_PACKET_REQUIRED === "1") {
      throw new Error(
        "Set XUEMAI_TEACHER_REVIEW_PACKET_OUTPUT=/absolute/path/to/teacher-review-packet.json with either XUEMAI_DELIVERY_BUNDLE_INPUT, or XUEMAI_DELIVERY_BUNDLE_OUTPUT plus one of XUEMAI_RESULT_INPUT, XUEMAI_ANALYSIS_INPUT, or XUEMAI_VISION_PACKET"
      );
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-teacher-review-packet-"));
    const deliveryBundlePath = path.join(tempDir, "delivery-bundle.json");
    const outputPath = path.join(tempDir, "teacher-review-packet.json");
    const result = createStudentLearningMaterialUserFacingResult(readSyntheticAnalysis());
    const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-20T20:20:00.000Z"
    });

    try {
      await writeFile(deliveryBundlePath, `${JSON.stringify(deliveryBundle, null, 2)}\n`, "utf8");
      const writeResult = await generateStudentLearningMaterialTeacherReviewPacketFile({
        deliveryBundleInputPath: deliveryBundlePath,
        teacherReviewPacketOutputPath: outputPath,
        skillRunId: "skill-run-file-001",
        generatedAt: "2026-06-20T20:25:00.000Z"
      });
      const packet = await readStudentLearningMaterialTeacherReviewPacketFile(outputPath);

      expect(writeResult.skillRunId).toBe("skill-run-file-001");
      expect(writeResult.sourceKind).toBe("delivery_bundle");
      expect(writeResult.deliveryBundleInputPath).toBe(deliveryBundlePath);
      expect(writeResult.displayStatus).toBe(deliveryBundle.status.display_status);
      expect(writeResult.actionCount).toBeGreaterThanOrEqual(5);
      expect(packet.skill_card.input_source.analysis_id).toBe(deliveryBundle.analysis_id);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("writes a teacher review packet directly from an analysis artifact and keeps intermediate artifacts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-teacher-review-from-analysis-"));
    const analysisPath = path.join(tempDir, "analysis.json");
    const resultOutputPath = path.join(tempDir, "result.json");
    const deliveryBundleOutputPath = path.join(tempDir, "delivery-bundle.json");
    const packetOutputPath = path.join(tempDir, "teacher-review-packet.json");

    try {
      await writeFile(analysisPath, `${JSON.stringify(readSyntheticAnalysis(), null, 2)}\n`, "utf8");
      const writeResult = await generateStudentLearningMaterialTeacherReviewPacketFile({
        analysisInputPath: analysisPath,
        resultOutputPath,
        deliveryBundleOutputPath,
        teacherReviewPacketOutputPath: packetOutputPath,
        skillRunId: "skill-run-review-from-analysis-001",
        generatedAt: "2026-06-20T20:35:00.000Z"
      });
      const packet = await readStudentLearningMaterialTeacherReviewPacketFile(packetOutputPath);

      expect(writeResult.sourceKind).toBe("analysis");
      expect(writeResult.resultOutputPath).toBe(resultOutputPath);
      expect(writeResult.deliveryBundleOutputPath).toBe(deliveryBundleOutputPath);
      expect(packet.skill_card.input_source.analysis_id).toBe("analysis_synthetic_math_exam_001");
      expect(packet.teacher_visible_payload.teacher_report_markdown).toContain("## 逐题分析");
      expect(JSON.stringify(packet.teacher_visible_payload)).not.toContain("evidenceRefs");
      expect(JSON.stringify(packet.teacher_visible_payload)).not.toContain("VisionEvidencePacket");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

function readSyntheticAnalysis(): StudentLearningMaterialAnalysis {
  const dataset = JSON.parse(readFileSync("tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json", "utf8"));
  return JSON.parse(JSON.stringify(dataset.cases[0].analysis)) as StudentLearningMaterialAnalysis;
}

function formatFileResult(result: Awaited<ReturnType<typeof generateStudentLearningMaterialTeacherReviewPacketFile>>) {
  return [
    "StudentLearningMaterial teacher review packet generated",
    `teacherReviewPacketOutputPath=${result.teacherReviewPacketOutputPath}`,
    `skillRunId=${result.skillRunId}`,
    `displayStatus=${result.displayStatus}`,
    `feedbackStatus=${result.feedbackStatus}`,
    `archiveStatus=${result.archiveStatus}`,
    `questionCount=${result.questionCount}`,
    `reviewRequiredQuestionCount=${result.reviewRequiredQuestionCount}`,
    `parentFeedbackCopyable=${result.parentFeedbackCopyable}`,
    `sourceKind=${result.sourceKind}`,
    `deliveryBundleInputPath=${result.deliveryBundleInputPath || "none"}`,
    `deliveryBundleOutputPath=${result.deliveryBundleOutputPath || "none"}`,
    `resultOutputPath=${result.resultOutputPath || "none"}`,
    `analysisOutputPath=${result.analysisOutputPath || "none"}`
  ].join("\n");
}
