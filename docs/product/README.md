# Product Architecture

学脉 is a Teaching Agent Operating System for tutoring teachers.

Teaching Agent Operating System is the internal product architecture name of this project. It is not a real operating system or low-level platform. It means a teacher-facing Agent Harness system for post-class teaching workflows.

It helps teachers complete post-class teaching workflows through structured Agents, not through a loose collection of AI tools.

## Long-Term Loop

```txt
学生档案
  ↓
课堂记录
  ↓
错题分析
  ↓
家长反馈
  ↓
学生画像更新
  ↓
月度报告
  ↓
教学建议
  ↓
批量跟进
  ↓
老师工作台总控
```

## First Delivery Chain

Parent Feedback Agent is the first delivery chain because it has clear inputs, clear teacher value, and a safe human-confirmed output.

It must remain part of a larger Teaching Agent OS architecture. It should not become a one-off feedback generator.

## UI Architecture Notes

- [学脉借壳路线评估与执行计划](./xuemai-borrowed-shell-strategy.md)
- [Chat-first Skill Workflow UI 平移稿](./chat-first-skill-workflow-ui-transfer.md)
- [K12 试卷作业分析 Skill 设计稿](./k12-paper-analysis-skill-design.md)
- 新版完整 PRD：[`docs/PRD.md`](../PRD.md)
- 理想终局 Vision PRD：[`docs/PRD_理想版.md`](../PRD_理想版.md)
- 工程执行摘要：[`docs/ENGINEERING_GUIDE.md`](../ENGINEERING_GUIDE.md)
- AI Skill 规范：[`docs/AI_SKILL_SPEC.md`](../AI_SKILL_SPEC.md)

## Non-Goals For Phase 1

- no automatic WeChat sending
- no full autonomous Agent
- no MCP integration
- no payment or unrelated marketing features
- no unrelated UI rewrite
