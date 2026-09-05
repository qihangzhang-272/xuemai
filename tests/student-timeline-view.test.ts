import { describe, expect, it } from "vitest";
import {
  buildStudentTimelineItems,
  countTimelineItemsByFilter,
  getMonthlyReportSourcesForConversation,
  getProfileUpdatesForConversation,
  getTimelineRecordsForConversation
} from "../components/xuemai-workbench/student-timeline-view";
import type { TimelineRecord } from "../components/xuemai-workbench/types";

describe("student timeline view projections", () => {
  it("filters archived records by conversation and timeline type", () => {
    const records = createTimelineRecords();
    const studentRecords = getTimelineRecordsForConversation(records, "student-wang");

    expect(studentRecords).toHaveLength(3);
    expect(buildStudentTimelineItems(studentRecords, "learning_evidence")).toEqual([
      expect.objectContaining({
        id: "timeline-report",
        title: "学情报告",
        tone: "orange"
      })
    ]);
    expect(buildStudentTimelineItems(studentRecords, "feedback")).toEqual([
      expect.objectContaining({
        id: "timeline-feedback",
        title: "微信反馈",
        meta: "学生档案 > 课后反馈"
      })
    ]);
  });

  it("projects confirmed monthly report sources from profile updates", () => {
    const records = createTimelineRecords();
    const monthlySources = getMonthlyReportSourcesForConversation(records, "student-wang");

    expect(monthlySources).toEqual([
      expect.objectContaining({
        target: "monthly_report_source",
        value: "本次材料体现出表达完整性和过程呈现需要加强。"
      })
    ]);
    expect(buildStudentTimelineItems(getTimelineRecordsForConversation(records, "student-wang"), "monthly_source")).toEqual([
      expect.objectContaining({
        title: "加入月报素材：表达规范问题",
        tone: "orange"
      })
    ]);
  });

  it("counts timeline filters for compact UI badges", () => {
    const counts = countTimelineItemsByFilter(getTimelineRecordsForConversation(createTimelineRecords(), "student-wang"));

    expect(counts).toEqual({
      all: 3,
      learning_record: 1,
      learning_evidence: 1,
      feedback: 1,
      monthly_source: 1
    });
    expect(getProfileUpdatesForConversation(createTimelineRecords(), "student-wang")).toHaveLength(2);
  });
});

function createTimelineRecords(): TimelineRecord[] {
  return [
    {
      id: "timeline-record",
      conversationId: "student-wang",
      sourceTaskId: "task-record",
      skillId: "update_learning_record",
      title: "学习记录草稿",
      summary: "课堂能跟上讲解。",
      archiveTarget: "学生档案 > 学习记录",
      createdAt: "2026-06-13T00:00:00.000Z"
    },
    {
      id: "timeline-report",
      conversationId: "student-wang",
      sourceTaskId: "task-report",
      skillId: "analyze_learning_evidence",
      title: "分析学习材料",
      summary: "已写入能力画像 1 项、月报素材 1 项。",
      archiveTarget: "学生档案 > 学习材料分析",
      profileUpdates: [
        {
          id: "profile-ability",
          target: "ability_profile",
          label: "更新能力画像：表达呈现待加强",
          value: "表达呈现维度需要继续训练依据和结论完整性。",
          evidence: "报告证据",
          sourceTaskId: "task-report",
          confirmedAt: "2026-06-13T00:00:00.000Z"
        },
        {
          id: "profile-monthly",
          target: "monthly_report_source",
          label: "加入月报素材：表达规范问题",
          value: "本次材料体现出表达完整性和过程呈现需要加强。",
          evidence: "能力画像中 expression_presentation 为 needs_attention。",
          sourceTaskId: "task-report",
          confirmedAt: "2026-06-13T00:00:00.000Z"
        }
      ],
      createdAt: "2026-06-13T00:01:00.000Z"
    },
    {
      id: "timeline-feedback",
      conversationId: "student-wang",
      sourceTaskId: "task-feedback",
      skillId: "generate_feedback",
      title: "生成微信反馈",
      summary: "反馈已发送家长。",
      archiveTarget: "学生档案 > 课后反馈",
      createdAt: "2026-06-13T00:02:00.000Z"
    },
    {
      id: "timeline-other",
      conversationId: "student-li",
      sourceTaskId: "task-other",
      skillId: "update_learning_record",
      title: "学习记录草稿",
      summary: "其他学生记录。",
      archiveTarget: "学生档案 > 学习记录",
      createdAt: "2026-06-13T00:03:00.000Z"
    }
  ];
}
